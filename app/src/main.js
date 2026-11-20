// Vice Cover Studio — wires the editor: photo slots, panel picking and dragging,
// layout / grade / lettering controls, live preview, and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, panelsForLayout, panelCount, layoutRects, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let selectedSlot = 0;

const $ = (id) => document.getElementById(id);

function redraw() {
  const [w, h] = EXPORT_SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
  syncControls();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderSlots() {
  const box = $('slots');
  box.innerHTML = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot' + (img ? ' filled' : '') + (i === selectedSlot ? ' sel' : '');
    b.title = img ? `Photo ${i + 1} — click to use in the selected panel` : `Photo slot ${i + 1} — empty`;
    if (img) b.style.backgroundImage = `url(${img.src})`;
    const label = document.createElement('span');
    label.textContent = img ? `Photo ${i + 1}` : `Empty ${i + 1}`;
    b.appendChild(label);
    if (img) {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'x';
      x.textContent = '×';
      x.title = `Remove photo ${i + 1}`;
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        state.photos[i] = null;
        state.panels.forEach((p) => { if (p.photo === i) p.photo = null; });
        renderSlots();
        redraw();
      });
      b.appendChild(x);
    }
    b.addEventListener('click', () => {
      selectedSlot = i;
      const panel = state.panels[state.selected];
      if (panel && state.photos[i]) {
        panel.photo = i;
        if (state.fillAll) state.panels.forEach((p) => { p.photo = i; });
      }
      renderSlots();
      redraw();
    });
    box.appendChild(b);
  });
}

async function addPhotoFiles(files) {
  let placed = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const slot = state.photos.findIndex((p) => !p);
    if (slot === -1) { status.textContent = 'All 4 photo slots are full — remove one first.'; break; }
    const img = await loadImage(URL.createObjectURL(file));
    state.photos[slot] = img;
    if (state.fillAll) state.panels.forEach((p) => { p.photo = slot; });
    else if (state.panels[state.selected] && state.panels[state.selected].photo == null) {
      state.panels[state.selected].photo = slot;
    }
    selectedSlot = slot;
    placed++;
  }
  if (placed) {
    status.textContent = `Added ${placed} photo${placed > 1 ? 's' : ''}.`;
    renderSlots();
    redraw();
  }
}

async function loadSamples() {
  const names = ['pier', 'boulevard', 'palms', 'neon'];
  for (let i = 0; i < names.length; i++) {
    try {
      state.photos[i] = await loadImage(`samples/${names[i]}.jpg`);
    } catch { /* a missing sample just leaves the slot empty */ }
  }
  state.panels = panelsForLayout(state).map((p, i) => ({ ...p, photo: state.fillAll ? 0 : i % 4 }));
  selectedSlot = 0;
  status.textContent = 'Samples loaded — pick a layout and export.';
  renderSlots();
  redraw();
}

function applyLayout(layout) {
  state.layout = layout;
  state.panels = panelsForLayout(state);
  if (state.selected >= panelCount(layout)) state.selected = 0;
  redraw();
}

function applyGrade(grade) {
  state.grade = grade;
  redraw();
}

function syncControls() {
  document.querySelectorAll('#layoutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  const panel = state.panels[state.selected];
  if (panel) {
    $('zoom').value = String(panel.zoom);
    $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  }
}

function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  const gap = Math.max(4, Math.round(Math.min(canvas.width, canvas.height) * 0.008));
  const rects = layoutRects(state.layout, canvas.width, canvas.height, gap);
  const i = rects.findIndex((rc) => x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h);
  return { index: i, x, y };
}

// --- events ---------------------------------------------------------------
$('addPhotos').addEventListener('change', (e) => { addPhotoFiles([...e.target.files]); e.target.value = ''; });
$('loadSamples').addEventListener('click', loadSamples);
$('fillAll').addEventListener('change', (e) => {
  state.fillAll = e.target.checked;
  if (state.fillAll) {
    const first = state.photos.findIndex((p) => p);
    if (first !== -1) state.panels.forEach((p) => { p.photo = first; });
  }
  redraw();
});
document.querySelectorAll('#layoutSeg button').forEach((b) => b.addEventListener('click', () => applyLayout(b.dataset.layout)));
document.querySelectorAll('#gradeSeg button').forEach((b) => b.addEventListener('click', () => applyGrade(b.dataset.grade)));
$('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (panel) { panel.zoom = Number(e.target.value); redraw(); }
});
$('sun').addEventListener('change', (e) => { state.sun = e.target.checked; redraw(); });
$('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('titleStyle').addEventListener('change', (e) => { state.titleStyle = e.target.value; redraw(); });
$('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
$('exportSize').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
$('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${state.size}.png`;
  }, 'image/png');
});

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit.index === -1) return;
  state.selected = hit.index;
  const panel = state.panels[hit.index];
  const r = canvas.getBoundingClientRect();
  const gap = Math.max(4, Math.round(Math.min(canvas.width, canvas.height) * 0.008));
  const rect = layoutRects(state.layout, canvas.width, canvas.height, gap)[hit.index];
  drag = { cx: e.clientX, cy: e.clientY, ox: panel.ox, oy: panel.oy, rw: rect.w, rh: rect.h, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  const panel = state.panels[state.selected];
  if (!panel) return;
  const r = canvas.getBoundingClientRect();
  panel.ox = drag.ox + ((e.clientX - drag.cx) / r.width) * (canvas.width / drag.rw);
  panel.oy = drag.oy + ((e.clientY - drag.cy) / r.height) * (canvas.height / drag.rh);
  if (Math.abs(panel.ox - drag.ox) + Math.abs(panel.oy - drag.oy) > 0.002) drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const hit = panelAt(e.clientX, e.clientY);
  const panel = state.panels[hit.index === -1 ? state.selected : hit.index];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(2.5, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  redraw();
}, { passive: false });

// --- boot -----------------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
renderSlots();
if (shot) {
  runShot(shot, query, { state, loadImage, loadSamples, redraw, renderSlots, applyLayout, applyGrade });
} else {
  redraw();
}
