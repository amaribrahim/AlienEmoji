import {mediaURL, enforcePlayback} from './portfolio-core.mjs';
// Native playback + precomputed PCM peaks. No audio downloads until interaction.
const container = document.querySelector('#portfolio-projects');
const players = new Set();
let activePanel = null;
let playbackIntent = 0;
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const time = seconds => `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, '0')}`;
function asset(project, path) {
  return mediaURL(path, new URL(project.basePath, location.href));
}
function pauseAll(except = null) {
  playbackIntent++;
  players.forEach(player => { if (player !== except) player.pause(); });
  return playbackIntent;
}
function register(media, panel) {
  media.preload = 'none';
  players.add(media);
  media.addEventListener('play', () => {
    enforcePlayback(media, players, panel.hidden);
  });
}
function note(parent, text) { if (text) parent.append(el('p', 'media-note', text)); }

async function audioPlayer(project, item, panel, parent, index) {
  const audio = el('audio');
  register(audio, panel);
  const src = asset(project, item.src);
  const ensureSource = () => { if (!audio.hasAttribute('src')) audio.src = src; };
  const error = el('p', 'media-error'); error.setAttribute('role', 'status');
  audio.addEventListener('error', () => { error.textContent = 'This audio could not be loaded. Please try again later.'; });
  parent.append(audio, error);
  // External tracks without prepared peaks remain playable, never show invented waves.
  function nativeFallback() {
    audio.controls = true;
    ensureSource(); // preload=none: controls can initiate playback without eager download.
    note(parent, 'Waveform unavailable for this track.');
  }
  if (!item.waveform) { nativeFallback(); return; }
  let data;
  try {
    const response = await fetch(asset(project, item.waveform));
    if (!response.ok) throw new Error('Waveform unavailable');
    data = await response.json();
    if (!data.peaks?.length || !data.peaks.every(n => Number.isFinite(n) && n >= 0 && n <= 1) || !(data.duration > 0)) throw new Error('Invalid waveform');
  } catch { nativeFallback(); return; }
  const controls = el('div', 'audio-player');
  const play = el('button', 'audio-toggle', '▶'); play.type = 'button'; play.setAttribute('aria-label', `Play ${item.title}`);
  const wave = el('div', 'waveform');
  const seek = el('input'); seek.type = 'range'; seek.min = '0'; seek.max = '1000'; seek.step = '1'; seek.value = '0'; seek.setAttribute('aria-label', `Seek ${item.title}`);
  const clock = el('span', 'audio-time');
  const clipID = `played-${project.id}-${index}`;
  // All SVG values are generated numbers; authored strings only enter textContent.
  const path = data.peaks.map((peak, i) => { const x = ((i + .5) / data.peaks.length * 800).toFixed(2); const height = Math.max(.6, peak * 29); return `M${x} ${(32-height).toFixed(2)}V${(32+height).toFixed(2)}`; }).join('');
  wave.innerHTML = `<svg viewBox="0 0 800 64" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="${clipID}"><rect width="0" height="64"/></clipPath></defs><path class="wave-unplayed" d="${path}" stroke-width=".65"/><path class="wave-played" d="${path}" stroke-width=".65" clip-path="url(#${clipID})"/><path class="wavehead" d="M0 0V64"/></svg>`;
  const clip = wave.querySelector('rect'), head = wave.querySelector('.wavehead');
  wave.append(seek); controls.append(play, wave, clock); parent.insertBefore(controls, audio);
  let frame = 0, pendingSeek = null;
  const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : data.duration;
  function update() {
    const current = pendingSeek ?? audio.currentTime;
    const ratio = Math.max(0, Math.min(1, current / duration()));
    seek.value = String(Math.round(ratio * 1000));
    seek.setAttribute('aria-valuetext', `${time(current)} of ${time(duration())}`);
    clip.setAttribute('width', String(ratio * 800));
    head.setAttribute('d', `M${Math.min(799, ratio*800)} 0V64`);
    clock.textContent = `${time(current)} / ${time(duration())}`;
  }
  function tick() { update(); if (!audio.paused) frame = requestAnimationFrame(tick); }
  play.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); return; }
    const intent = pauseAll(audio);
    ensureSource(); error.textContent = '';
    try {
      // Source assignment/play remain inside the user gesture on mobile.
      if (panel.hidden || intent !== playbackIntent) return;
      await audio.play();
      if (panel.hidden) audio.pause();
    } catch (err) { if (err.name !== 'AbortError') error.textContent = 'Unable to play this track. Try again or check your connection.'; }
  });
  seek.addEventListener('input', () => {
    pendingSeek = Number(seek.value) / 1000 * duration();
    ensureSource();
    if (audio.readyState >= 1) { audio.currentTime = pendingSeek; pendingSeek = null; }
    else audio.load();
    update();
  });
  audio.addEventListener('loadedmetadata', () => { if (pendingSeek !== null) { audio.currentTime = Math.min(pendingSeek, audio.duration); pendingSeek = null; } update(); });
  audio.addEventListener('play', () => { if (audio.paused || panel.hidden) return; play.textContent = 'Ⅱ'; play.setAttribute('aria-label', `Pause ${item.title}`); cancelAnimationFrame(frame); tick(); });
  const paused = () => { play.textContent = '▶'; play.setAttribute('aria-label', `Play ${item.title}`); cancelAnimationFrame(frame); update(); };
  audio.addEventListener('pause', paused); audio.addEventListener('ended', paused);
  audio.addEventListener('timeupdate', update); audio.addEventListener('seeked', update);
  update();
}

function populate(project, panel) {
  if (project.cover) {
    const image = el('img', 'portfolio-cover'); image.src = asset(project, project.cover); image.alt = project.coverAlt || `${project.title} project image`; image.loading = 'lazy';
    image.addEventListener('error', () => image.remove()); panel.append(image);
  }
  const overview = el('div', 'portfolio-overview');
  for (const [label, text] of [['Project', project.description], ['Contribution', project.contribution]]) {
    if (!text) continue;
    const block = el('div', 'portfolio-detail');
    block.append(el('h3', 'detail-label', label), el('p', 'portfolio-description', text));
    overview.append(block);
  }
  if (overview.children.length) panel.append(overview);
  const meta = el('div', 'portfolio-links');
  (project.links || []).forEach(link => {
    try {
      const url = new URL(link.url); if (!['https:', 'http:'].includes(url.protocol)) return;
      const a = el('a', '', link.label || url.hostname); const mark = el('span', 'external-mark', '↗'); mark.setAttribute('aria-hidden', 'true'); a.append(mark); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; meta.append(a);
    } catch { /* Omit invalid optional links. */ }
  });
  if (meta.children.length) {
    const links = el('div', 'portfolio-link-area');
    links.append(el('h3', 'detail-label', 'Links'), meta); panel.append(links);
  }
  if (project.uncertain) note(panel, `To confirm: ${project.uncertain}`);
  if (!project.media?.length) return;
  const list = el('ol', 'portfolio-media'); panel.append(list);
  project.media.forEach((item, index) => {
    const row = el('li', 'media-item');
    const heading = el('div', 'media-title-row');
    const number = el('span', 'media-number', String(index + 1).padStart(2, '0')); number.setAttribute('aria-hidden', 'true');
    heading.append(number, el('h3', 'media-heading', item.title), el('span', 'media-type', ({'sound-design':'Sound design',music:'Music',audio:'Audio',video:'Video',image:'Image'})[item.type] || item.type));
    row.append(heading); list.append(row);
    note(row, item.text || item.description);
    if (item.uncertain) note(row, `To confirm: ${item.uncertain}`);
    if (item.type === 'video') {
      const video = el('video'); video.controls = true; video.playsInline = true; video.setAttribute('aria-label', item.title); register(video, panel); video.src = asset(project, item.src);
      if (item.poster) video.poster = asset(project, item.poster);
      const error = el('p', 'media-error'); error.setAttribute('role', 'status'); video.addEventListener('error', () => { error.textContent = 'This video could not be loaded. Please try again later.'; }); row.append(video, error);
    } else if (item.type === 'image') {
      const image = el('img'); image.src = asset(project, item.src); image.alt = item.alt || item.title; image.loading = 'lazy'; row.append(image);
    } else { audioPlayer(project, item, panel, row, index); }
  });
}
function render(project) {
  const article = el('article', 'portfolio-project'); article.dataset.project = project.id;
  const h2 = el('h2'); const button = el('button', 'project-toggle'); button.type = 'button';
  button.id = `heading-${project.id}`; button.setAttribute('aria-expanded','false'); button.setAttribute('aria-controls',`panel-${project.id}`);
  const arrow = el('span', 'project-chevron', '›'); arrow.setAttribute('aria-hidden','true'); button.append(el('span','project-name',project.title), el('span','project-company',project.company || ''), el('span','project-year',project.date || project.year || ''), arrow); h2.append(button);
  const panel = el('div','project-panel'); panel.id = `panel-${project.id}`; panel.hidden = true; panel.setAttribute('role','region'); panel.setAttribute('aria-labelledby',button.id);
  let populated = false;
  function close() { panel.hidden = true; button.setAttribute('aria-expanded','false'); arrow.textContent = '›'; }
  button.addEventListener('click', () => {
    const wasOpen = !panel.hidden;
    pauseAll();
    if (activePanel) activePanel.close();
    activePanel = null;
    if (wasOpen) return;
    panel.hidden = false; button.setAttribute('aria-expanded','true'); arrow.textContent = '⌄'; activePanel = {close};
    if (!populated) { populated = true; populate(project, panel); }
    // Closing a taller panel above this row can move the new heading offscreen.
    const bounds = button.getBoundingClientRect();
    if (bounds.top < 110 || bounds.bottom > innerHeight) button.scrollIntoView({block:'nearest', behavior:'instant'});
  });
  article.append(h2,panel); container.append(article);
}
// Shared navigation was authored for root-level pages; keep its source untouched.
for (const anchor of document.querySelectorAll('#site-nav a, #site-footer a')) {
  const href = anchor.getAttribute('href');
  if (href === '#main') anchor.href = `${location.pathname}#main`;
  else if (href && !/^(?:[a-z]+:|\/|#)/i.test(href)) anchor.href = new URL(`../${href}`,location.href).href;
}
for (const image of document.querySelectorAll('#site-footer img')) image.src = new URL(`../${image.getAttribute('src')}`,location.href).href;
window.addEventListener('pagehide', () => pauseAll());
try {
  const response = await fetch('projects.json');
  if (!response.ok) throw new Error('Index unavailable');
  const data = await response.json();
  container.replaceChildren(); data.projects.forEach(render);
  if (!data.projects.length) container.append(el('p','','Portfolio projects are coming soon.'));
} catch { container.replaceChildren(el('p','','The portfolio could not be loaded. Please refresh to try again.')); }
