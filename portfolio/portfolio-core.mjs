// Local metadata uses literal filesystem paths; remote metadata uses full URLs.
export function mediaURL(path, base) {
  if (/^https?:\/\//i.test(path)) return new URL(path).href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) throw new Error('Unsupported asset URL');
  return new URL(path.split('/').map(encodeURIComponent).join('/'), base).href;
}

export function enforcePlayback(media, players, hidden) {
  if (hidden) { media.pause(); return; }
  // A play event can still be queued after a later interaction paused its media.
  if (media.paused) return;
  players.forEach(other => { if (other !== media) other.pause(); });
}
