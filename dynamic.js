/* Alien Emoji: navigation, product carousel, reactive sky and theme workbench. */
(() => {
  'use strict';
  const root = document.documentElement;
  const home = document.body.dataset.page === 'home';
  const prefix = home ? '' : 'index.html';
  const logo = '<img class="ae-logo" src="assets/alienemoji-logo.jpg" width="34" height="34" alt="">';
  document.getElementById('site-nav').innerHTML = `<a class="skip-link" href="#main">Skip to content</a><header class="ae-header"><nav class="ae-nav shell" aria-label="Main navigation"><a class="ae-brand" href="index.html" aria-label="Alien Emoji home"><span>alien emoji</span></a><button class="menu-button" aria-expanded="false" aria-controls="primary-menu"><span>Menu</span><span class="menu-symbol" aria-hidden="true">☰</span></button><div class="ae-links" id="primary-menu"><a href="${prefix}#products">Projects</a><a href="${prefix}#services">Services</a><a href="${prefix}#about">About</a><a class="nav-contact" href="${prefix}#contact">Let’s talk <span aria-hidden="true">↗</span></a></div></nav></header>`;
  document.getElementById('site-footer').innerHTML = `<footer class="ae-footer"><div class="shell"><div class="footer-top-new"><a class="ae-brand" href="index.html">${logo}<span>alien emoji</span></a><p>Audio, tools, and interactive experiences.<br>Made with curiosity.</p><div class="footer-links-new"><a href="birdsong.html">Birdsong Forest</a><a href="sleepy-aliens.html">Sleepy Aliens</a><a href="https://github.com/amaribrahim/unity-adm-recorder" target="_blank" rel="noopener">GitHub ↗</a><a href="https://www.linkedin.com/in/amaribrahim" target="_blank" rel="noopener">LinkedIn ↗</a></div></div><div class="footer-bottom-new"><span>© ${new Date().getFullYear()} Alien Emoji</span><span>Los Angeles / Remote</span><span><a href="privacy.html">Privacy</a></span></div></div></footer>`;
  const main = document.querySelector('main');
  if (main) main.id = 'main';
  const header = document.querySelector('.ae-header');
  const menu = document.querySelector('.ae-links');
  const menuButton = document.querySelector('.menu-button');
  function closeMenu() { menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); }
  menuButton.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuButton.focus(); }
  });
  window.matchMedia('(min-width:701px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // One project at a time, with manual controls, arrow keys and horizontal swipes.
  const carousel = document.querySelector('.product-carousel');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('.product-slide')];
    const dots = [...carousel.querySelectorAll('[data-slide]')];
    const status = carousel.querySelector('.carousel-status');
    const projectHeading = document.querySelector('#products-title');
    let index = 0, touch = null, suppressClickUntil = 0;
    let elapsed = 0, lastFrame = null, focused = false;
    let onscreen = !('IntersectionObserver' in window);
    const duration = 6000;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    status.removeAttribute('aria-live');
    const announcement = document.createElement('span');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';
    carousel.append(announcement);
    function showSlide(next, byUser = false) {
      index = (next + slides.length) % slides.length;
      elapsed = 0;
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      dots.forEach((dot, i) => { if (i === index) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
      status.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      projectHeading.textContent = slides[index].dataset.title;
      if (byUser) announcement.textContent = `${slides[index].dataset.title}, ${status.textContent}`;
      carousel.style.setProperty('--carousel-progress', '0');
    }
    carousel.classList.add('carousel-ready');
    carousel.querySelector('.carousel-controls').hidden = false;
    dots.forEach(dot => dot.addEventListener('click', () => showSlide(Number(dot.dataset.slide), true)));
    carousel.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      e.preventDefault();
      if (e.target.closest('.product-slide')) carousel.focus({preventScroll:true});
      showSlide(e.key === 'Home' ? 0 : e.key === 'End' ? slides.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1), true);
    });
    const covers = carousel.querySelector('.product-slides');
    covers.addEventListener('touchstart', e => {
      touch = e.touches.length === 1 ? {x:e.touches[0].clientX, y:e.touches[0].clientY} : null;
    }, {passive:true});
    covers.addEventListener('touchend', e => {
      if (!touch || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) { suppressClickUntil = Date.now() + 500; showSlide(index + (dx < 0 ? 1 : -1), true); }
    }, {passive:true});
    covers.addEventListener('touchcancel', () => { touch = null; }, {passive:true});
    covers.addEventListener('click', e => { if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
    carousel.addEventListener('focusin', () => { focused = true; lastFrame = null; });
    carousel.addEventListener('focusout', e => { if (!carousel.contains(e.relatedTarget)) { focused = false; lastFrame = null; } });
    document.addEventListener('visibilitychange', () => { lastFrame = null; });
    document.addEventListener('motionchange', () => { lastFrame = null; });
    reduced.addEventListener('change', () => { lastFrame = null; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { onscreen = entries[0]?.isIntersecting ?? false; lastFrame = null; }, {threshold:.05}).observe(carousel);
    }
    function tick(now) {
      const active = onscreen && !focused && !document.hidden && !document.body.classList.contains('motion-paused') && !reduced.matches;
      if (active && slides.length > 1) {
        if (lastFrame !== null) elapsed += Math.min(1000, Math.max(0, now - lastFrame));
        if (elapsed >= duration) showSlide(index + 1);
        carousel.style.setProperty('--carousel-progress', String(Math.min(1, elapsed / duration)));
        lastFrame = now;
      } else lastFrame = null;
      requestAnimationFrame(tick);
    }
    showSlide(0);
    requestAnimationFrame(tick);
  }

  // Preferences affect this browser only; generated CSS can be stored and reapplied later.
  const tokens = [
    ['accent', 'Accent', '#cfee61', 'accent'], ['night', 'Background', '#101611', 'night'],
    ['paper', 'Text / light surface', '#f2f3e8', 'paper'], ['surface', 'Dark surface', '#1c2921', 'surface'],
    ['secondary', 'Cool glow', '#8aafa5', 'secondary'], ['warm', 'Warm glow', '#d2ba83', 'warm'],
    ['guitarStars', 'Guitar stars', '#f2f3e8', 'guitar-stars'],
    ['guitarStrings', 'Guitar strings', '#cfee61', 'guitar-strings'],
    ['guitarGlow', 'Guitar glow', '#8aafa5', 'guitar-glow'],
    ['skyGlow', 'Sky glow', '#8aafa5', 'sky-glow'],
    ['skyWarm', 'Sky warmth', '#d2ba83', 'sky-warm']
  ];
  const sansStacks = {
    'Inter Tight': "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'Helvetica Neue': "'Helvetica Neue', Helvetica, Arial, sans-serif",
    Arial: 'Arial, sans-serif'
  };
  const monoStacks = {
    'JetBrains Mono': "'JetBrains Mono', monospace",
    'IBM Plex Mono': "'IBM Plex Mono', monospace",
    'Space Mono': "'Space Mono', monospace"
  };
  // Saved looks; colors follow the token order above.
  const presets = [
    ['Red Dwarf Static', '#e0e0e0 #000214 #f2f3e8 #1e1f1e #d60000 #d2ba83 #fbffc2 #fafafa #ffffff #ebce14 #24ffe5', 'Inter Tight', 'Space Mono'],
    ['Cobalt Hum', '#f0f0f0 #101611 #f2f3e8 #000000 #8aafa5 #d2ba83 #ffffff #ec5b5b #1100ff #93c8ba #d2ba83', 'Inter Tight', 'IBM Plex Mono'],
    ['Moss Signal', '#2ebb11 #000214 #808080 #1e1f1e #bd0000 #d2ba83 #fbffc2 #fafafa #ffffff #ebce14 #24ffe5', 'Helvetica Neue', 'Space Mono'],
    ['Lime Beacon', '#2ebb11 #000214 #ffffff #41af41 #bd0000 #d2ba83 #fbffc2 #fafafa #ffffff #ebce14 #24ffe5', 'Helvetica Neue', 'Space Mono'],
    ['Fern Static', '#2ebb11 #000214 #c4c4c4 #41af41 #bd0000 #d2ba83 #fbffc2 #fafafa #ffffff #ebce14 #24ffe5', 'Helvetica Neue', 'Space Mono'],
    ['Orchid Nebula', '#403dff #000214 #eea3ff #1e1f1e #ee00ff #c68e0c #e5fffb #e93f3f #40f284 #ebce14 #24ffe5', 'Inter Tight', 'Space Mono'],
    ['Tidal Moth', '#cfee61 #101611 #f2f3e8 #1c2921 #8aafa5 #d2ba83 #f2f3e8 #cfee61 #8aafa5 #8aafa5 #d2ba83', 'Inter Tight', 'JetBrains Mono']
  ].map(([name, colors, font, highlightFont]) => ({name, theme: {...Object.fromEntries(colors.split(' ').map((hex, i) => [tokens[i][0], hex])), font, highlightFont}}));
  const defaults = {...presets.find(preset => preset.name === 'Red Dwarf Static').theme};
  const theme = {...defaults};
  const storageKey = 'alien-emoji-theme-v4';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const [key] of tokens) if (typeof saved?.[key] === 'string' && /^#[0-9a-f]{6}$/i.test(saved[key])) theme[key] = saved[key].toLowerCase();
    if (Object.hasOwn(sansStacks, saved?.font)) theme.font = saved.font;
    if (Object.hasOwn(monoStacks, saved?.highlightFont)) theme.highlightFont = saved.highlightFont;
  } catch { /* The workbench remains usable without browser storage. */ }
  const rgb = hex => `rgb(${[1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(' ')})`;
  const workbench = document.createElement('div');
  workbench.innerHTML = `<button class="theme-launch" aria-expanded="false" aria-controls="theme-panel"><span aria-hidden="true">◒</span>Theme</button><aside class="theme-panel" id="theme-panel" aria-labelledby="theme-title" hidden><header><h2 id="theme-title">Theme workbench</h2><button class="theme-close" aria-label="Close theme panel">×</button></header><p class="theme-help">Preview colors live. Copy the CSS to save a theme; paste it here and choose Apply theme to restore it.</p><div class="theme-font theme-preset"><label for="theme-preset">Preset</label><select id="theme-preset"><option value="" disabled>Custom</option>${presets.map(({name}) => `<option>${name}</option>`).join('')}</select></div>${tokens.map(([key,label]) => `<div class="theme-row"><label for="theme-${key}">${label}<output class="theme-rgb" data-rgb="${key}"></output></label><input type="color" id="theme-${key}" data-color="${key}" aria-label="${label} color"><input type="text" class="theme-hex" data-hex="${key}" aria-label="${label} HEX" maxlength="7" spellcheck="false"></div>`).join('')}<div class="theme-font"><label for="theme-font">Main typeface</label><select id="theme-font">${Object.keys(sansStacks).map(font => `<option>${font}</option>`).join('')}</select><label for="theme-highlight-font">Highlight typeface</label><select id="theme-highlight-font">${Object.keys(monoStacks).map(font => `<option>${font}</option>`).join('')}</select></div><label class="theme-css-label" for="theme-css">Theme CSS — paste a saved theme here</label><textarea id="theme-css" class="theme-output" aria-label="Theme CSS" spellcheck="false"></textarea><div class="theme-actions"><button type="button" class="theme-apply">Apply theme</button><button type="button" class="theme-copy">Copy CSS</button><button type="button" class="theme-reset">Reset</button></div><p class="theme-message" role="status" aria-live="polite"></p></aside>`;
  document.body.append(workbench);
  const panel = workbench.querySelector('.theme-panel');
  const launch = workbench.querySelector('.theme-launch');
  launch.remove(); // Keep the chosen theme; the public page no longer exposes the workbench.
  const message = workbench.querySelector('.theme-message');
  const cssOutput = workbench.querySelector('.theme-output');
  let generatedCss = '', draftDirty = false;
  function applyTheme(persist = true) {
    for (const [key,, , cssName] of tokens) {
      root.style.setProperty(`--${cssName}`, theme[key]);
      workbench.querySelector(`[data-color="${key}"]`).value = theme[key];
      workbench.querySelector(`[data-hex="${key}"]`).value = theme[key];
      workbench.querySelector(`[data-rgb="${key}"]`).textContent = rgb(theme[key]);
    }
    root.style.setProperty('--f-sans', sansStacks[theme.font]);
    root.style.setProperty('--f-display', sansStacks[theme.font]);
    root.style.setProperty('--f-mono', monoStacks[theme.highlightFont]);
    workbench.querySelector('#theme-font').value = theme.font;
    workbench.querySelector('#theme-highlight-font').value = theme.highlightFont;
    workbench.querySelector('#theme-preset').value = presets.find(preset => Object.keys(defaults).every(key => preset.theme[key] === theme[key]))?.name ?? '';
    generatedCss = `:root {\n${tokens.map(([key,,,cssName]) => `  --${cssName}: ${theme[key]}; /* ${rgb(theme[key])} */`).join('\n')}\n  --f-sans: ${sansStacks[theme.font]};\n  --f-display: ${sansStacks[theme.font]};\n  --f-mono: ${monoStacks[theme.highlightFont]};\n}`;
    if (!draftDirty) cssOutput.value = generatedCss;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.night);
    if (persist) { try { localStorage.setItem(storageKey, JSON.stringify(theme)); } catch { message.textContent = 'Preview active. Browser storage is unavailable.'; } }
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  function closePanel() { panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); launch.focus({preventScroll:true}); }
  launch.addEventListener('click', () => {
    panel.hidden = !panel.hidden; launch.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('.theme-close').focus({preventScroll:true});
  });
  workbench.querySelector('.theme-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); closePanel(); } });
  cssOutput.addEventListener('input', () => { draftDirty = cssOutput.value !== generatedCss; });
  workbench.querySelectorAll('[data-color]').forEach(input => input.addEventListener('input', () => {
    theme[input.dataset.color] = input.value; message.textContent = ''; applyTheme();
  }));
  workbench.querySelectorAll('[data-hex]').forEach(input => {
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(raw)) { input.removeAttribute('aria-invalid'); theme[input.dataset.hex] = raw.toLowerCase(); message.textContent = ''; applyTheme(); }
    });
    input.addEventListener('change', () => {
      if (!/^#[0-9a-f]{6}$/i.test(input.value.trim())) { input.setAttribute('aria-invalid', 'true'); message.textContent = 'Use a six-digit HEX color, like #cfee61.'; }
    });
  });
  workbench.querySelector('#theme-font').addEventListener('change', e => { theme.font = e.target.value; applyTheme(); });
  workbench.querySelector('#theme-highlight-font').addEventListener('change', e => { theme.highlightFont = e.target.value; applyTheme(); });
  workbench.querySelector('#theme-preset').addEventListener('change', e => {
    const preset = presets.find(({name}) => name === e.target.value);
    if (!preset) return;
    Object.assign(theme, preset.theme);
    draftDirty = false;
    workbench.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    applyTheme(); message.textContent = `${preset.name} applied and saved in this browser.`;
  });
  workbench.querySelector('.theme-apply').addEventListener('click', async () => {
    try {
      const {parseThemeCss} = await import('./theme-core.mjs');
      const imported = parseThemeCss(cssOutput.value);
      Object.assign(theme, imported);
      draftDirty = false;
      applyTheme();
      message.textContent = 'Theme applied and saved in this browser.';
    } catch (error) { message.textContent = error.message || 'Could not apply this theme.'; }
  });
  workbench.querySelector('.theme-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(generatedCss); message.textContent = 'Applied theme CSS copied.'; }
    catch {
      if (draftDirty) message.textContent = 'Clipboard unavailable. Your pasted draft is kept; Apply or Reset it before copying.';
      else { cssOutput.focus(); cssOutput.select(); message.textContent = 'Applied theme CSS selected — copy with your keyboard.'; }
    }
  });
  workbench.querySelector('.theme-reset').addEventListener('click', () => {
    Object.assign(theme, defaults);
    draftDirty = false;
    workbench.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    applyTheme(); message.textContent = 'Default theme restored.';
  });
  applyTheme(false);

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches;
  document.addEventListener("requestmotionchange", e => setMotion(e.detail.paused));
  const motionButton = document.querySelector('.motion-toggle');
  function setMotion(value) {
    paused = value; document.body.classList.toggle('motion-paused', paused);
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
      motionButton.innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span><span>${paused ? 'Motion paused' : 'Pause motion'}</span>`;
    }
    document.dispatchEvent(new CustomEvent("motionchange", {detail:{paused}}));
  }
  motionButton?.addEventListener('click', () => setMotion(!paused));
  preference.addEventListener('change', e => setMotion(e.matches));
  if ('IntersectionObserver' in window) {
    document.body.classList.add('motion-ready');
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); reveals.unobserve(entry.target); }
    }), {threshold:.08});
    document.querySelectorAll('.reveal').forEach(el => reveals.observe(el));
  }

  setMotion(paused);
})();
