// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the exported cover alone, full-bleed.
// Query: photo / photo2 (sample names), caption, tagline, layout, grade, size, style, pos.
// window.__shotReady is set once the scene has painted.
import { panelsForLayout } from './cover.js';

const SAMPLES = ['pier', 'boulevard', 'palms', 'neon'];

export async function runShot(shot, query, api) {
  const { state, loadImage, redraw, renderSlots, applyLayout, applyGrade } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const photo = query.get('photo') ?? 'pier';
  const photo2 = query.get('photo2');
  const caption = query.get('caption') ?? 'Sunset Heist';
  const tagline = query.get('tagline');
  const layout = query.get('layout') ?? (shot === 'cover' ? 'quad' : 'hero');
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? (shot === 'cover' ? '1920x1080' : '1920x1080');
  const style = query.get('style') ?? 'gradient';
  const pos = query.get('pos') ?? 'bottom';

  const first = await loadImage(`samples/${SAMPLES.includes(photo) ? photo : 'pier'}.jpg`);
  state.photos[0] = first;
  if (photo2) {
    try { state.photos[1] = await loadImage(`samples/${SAMPLES.includes(photo2) ? photo2 : 'boulevard'}.jpg`); } catch { /* keep slot 1 */ }
  } else if (shot === 'editor') {
    try { state.photos[1] = await loadImage('samples/boulevard.jpg'); } catch { /* keep slot 1 */ }
    try { state.photos[2] = await loadImage('samples/palms.jpg'); } catch { /* keep slot 2 */ }
    try { state.photos[3] = await loadImage('samples/neon.jpg'); } catch { /* keep slot 3 */ }
  }
  state.fillAll = !photo2 && shot === 'cover';
  state.title = caption;
  if (tagline !== null) state.tagline = tagline;
  state.titleStyle = style;
  state.titlePos = pos;
  state.size = size;
  applyLayout(layout);
  applyGrade(grade);
  state.panels = panelsForLayout(state).map((p, i) => ({
    ...p,
    photo: state.fillAll ? 0 : (state.photos[i] ? i : 0),
    zoom: 1 + (i % 3) * 0.12,
    ox: i % 2 ? -0.04 : 0.04,
    oy: 0.08,
  }));
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = caption;
  const tagInput = document.getElementById('tagline');
  if (tagInput && tagline !== null) tagInput.value = tagline;
  if (renderSlots) renderSlots();
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
