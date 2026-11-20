// Vice Cover Studio — the cover renderer.
// Draws a multi-panel GTA-style poster from the editor state onto any canvas:
// panel photos with per-panel crop/zoom, a Vice City sunset or neon colour grade,
// a sun-and-skyline band, and bold poster lettering for the title and tagline.
// Everything is drawn with the Canvas 2D API; no network, no fonts to load.

export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = ['quad', 'hero', 'split', 'solo'];
export const GRADES = ['sunset', 'neon', 'gold', 'midnight', 'noir'];
export const TITLE_STYLES = ['gradient', 'block', 'outline', 'neon'];

/** How many photo panels a layout has. */
export function panelCount(layout) {
  return { quad: 4, hero: 3, split: 2, solo: 1 }[layout] ?? 4;
}

/** Panel rectangles for a layout, in canvas pixels. `gap` is the gutter width. */
export function layoutRects(layout, w, h, gap) {
  const g = gap;
  if (layout === 'hero') {
    const left = Math.round(w * 0.6);
    const topH = Math.round(h / 2);
    return [
      { x: g, y: g, w: left - g * 2, h: h - g * 2 },
      { x: left + g, y: g, w: w - left - g * 2, h: topH - g * 1.5 },
      { x: left + g, y: topH + g * 0.5, w: w - left - g * 2, h: h - topH - g * 1.5 },
    ];
  }
  if (layout === 'split') {
    const half = Math.round(w / 2);
    return [
      { x: g, y: g, w: half - g * 1.5, h: h - g * 2 },
      { x: half + g * 0.5, y: g, w: w - half - g * 1.5, h: h - g * 2 },
    ];
  }
  if (layout === 'solo') {
    return [{ x: g, y: g, w: w - g * 2, h: h - g * 2 }];
  }
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);
  return [
    { x: g, y: g, w: halfW - g * 1.5, h: halfH - g * 1.5 },
    { x: halfW + g * 0.5, y: g, w: w - halfW - g * 1.5, h: halfH - g * 1.5 },
    { x: g, y: halfH + g * 0.5, w: halfW - g * 1.5, h: h - halfH - g * 1.5 },
    { x: halfW + g * 0.5, y: halfH + g * 0.5, w: w - halfW - g * 1.5, h: h - halfH - g * 1.5 },
  ];
}

/** Colour grades: a canvas filter for the photo plus a tint painted over it. */
export const GRADE_DEFS = {
  sunset: {
    filter: 'saturate(1.4) contrast(1.08) sepia(0.18)',
    tint: (ctx, r) => paintTint(ctx, r, ['rgba(255,170,60,0.10)', 'rgba(255,90,40,0.10)', 'rgba(214,38,120,0.30)']),
  },
  neon: {
    filter: 'saturate(1.7) contrast(1.16) hue-rotate(-12deg)',
    tint: (ctx, r) => paintTint(ctx, r, ['rgba(255,43,214,0.22)', 'rgba(0,0,0,0)', 'rgba(0,229,255,0.26)']),
  },
  gold: {
    filter: 'saturate(1.25) sepia(0.38) contrast(1.06)',
    tint: (ctx, r) => paintTint(ctx, r, ['rgba(255,205,110,0.20)', 'rgba(255,170,60,0.06)', 'rgba(120,60,0,0.16)']),
  },
  midnight: {
    filter: 'saturate(1.15) contrast(1.14) brightness(0.92) hue-rotate(18deg)',
    tint: (ctx, r) => paintTint(ctx, r, ['rgba(30,10,70,0.28)', 'rgba(0,0,0,0)', 'rgba(10,10,40,0.34)']),
  },
  noir: {
    filter: 'grayscale(0.92) contrast(1.28) brightness(0.96)',
    tint: (ctx, r) => paintTint(ctx, r, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']),
  },
};

function paintTint(ctx, r, stops) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.55, stops[1]);
  g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

/** A fresh default editor state. `panels` entries point at photo slots (0-3) or null. */
export function defaultState() {
  return {
    layout: 'quad',
    size: '1920x1080',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    tagline: 'A VICE CITY STORY',
    titleStyle: 'gradient',
    titlePos: 'bottom',
    gapColor: '#f7f3ea',
    vignette: true,
    grain: true,
    sun: true,
    fillAll: true,
    photos: [null, null, null, null],
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1.15, ox: 0, oy: 0.06 },
      { photo: 0, zoom: 1.3, ox: -0.08, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: -0.05 },
    ],
    selected: 0,
  };
}

/** Resize the panel list when the layout changes, keeping each panel's settings. */
export function panelsForLayout(state) {
  const n = panelCount(state.layout);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(state.panels[i] ?? { photo: state.fillAll ? 0 : null, zoom: 1, ox: 0, oy: 0 });
  }
  return out;
}

/** Draws the whole cover from `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const grade = GRADE_DEFS[state.grade] ?? GRADE_DEFS.sunset;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = state.gapColor;
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h, gap);
  const panels = panelsForLayout(state);
  rects.forEach((r, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    const panel = panels[i];
    const img = panel && panel.photo != null ? state.photos[panel.photo] : null;
    if (img) {
      ctx.filter = grade.filter;
      drawPhotoInto(ctx, img, r, panel);
      ctx.filter = 'none';
      grade.tint(ctx, r);
    } else {
      paintEmptyPanel(ctx, r, grade);
    }
    ctx.restore();
  });

  if (state.sun) drawSunAndSkyline(ctx, w, h, state);
  drawTitleBlock(ctx, w, h, state);
  if (state.vignette) drawVignette(ctx, w, h);
  if (state.grain) drawGrain(ctx, w, h);
  ctx.restore();
}

/** Cover-fits `img` into `rect`, honouring the panel's zoom and pan offsets. */
export function drawPhotoInto(ctx, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - rect.w) / 2);
  const maxOy = Math.max(0, (dh - rect.h) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, (panel.ox || 0) * rect.w));
  const oy = Math.max(-maxOy, Math.min(maxOy, (panel.oy || 0) * rect.h));
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + ox, rect.y + (rect.h - dh) / 2 + oy, dw, dh);
}

function paintEmptyPanel(ctx, r, grade) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, '#3b2144');
  g.addColorStop(1, '#160f1e');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  grade.tint(ctx, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 ${Math.max(14, r.w * 0.045)}px "Arial Black", "Noto Sans Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOUR PHOTO HERE', r.x + r.w / 2, r.y + r.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** A rooftop skyline along the title edge (the sun disc was cut: over a dark
 *  subject it read as a smudge, and the grade plus lettering carry the look). */
export function drawSunAndSkyline(ctx, w, h, state) {
  const bottom = state.titlePos === 'bottom';
  // Rooftop skyline: a seeded row of low buildings with lit windows, kept
  // in the bottom (or top) strip so it never crosses the tagline.
  const baseY = bottom ? h : 0;
  const skyH = h * 0.06;
  const rnd = mulberry32(20261121);
  ctx.fillStyle = 'rgba(12,6,18,0.92)';
  ctx.beginPath();
  let x = -10;
  while (x < w + 10) {
    const bw = w * (0.05 + rnd() * 0.07);
    const bh = skyH * (0.4 + rnd() * 0.5);
    const top = bottom ? baseY - bh : baseY;
    ctx.rect(x, top, bw, bh);
    x += bw + w * 0.008;
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,214,110,0.85)';
  for (let i = 0; i < 40; i++) {
    const wx = rnd() * w;
    const wy = bottom ? h - rnd() * skyH * 0.7 : rnd() * skyH * 0.7;
    ctx.fillRect(wx, wy, Math.max(2, w * 0.003), Math.max(2, h * 0.004));
  }
}

/** Bold poster lettering: the title (up to two lines) with the tagline beside rules. */
export function drawTitleBlock(ctx, w, h, state) {
  const bottom = state.titlePos === 'bottom';
  const bandH = h * 0.3;
  const bandY = bottom ? h - bandH : 0;
  const leg = ctx.createLinearGradient(0, bandY, 0, bottom ? h : bandY + bandH);
  if (bottom) {
    leg.addColorStop(0, 'rgba(10,4,16,0)');
    leg.addColorStop(0.55, 'rgba(10,4,16,0.55)');
    leg.addColorStop(1, 'rgba(10,4,16,0.82)');
  } else {
    leg.addColorStop(0, 'rgba(10,4,16,0.82)');
    leg.addColorStop(0.45, 'rgba(10,4,16,0.55)');
    leg.addColorStop(1, 'rgba(10,4,16,0)');
  }
  ctx.fillStyle = leg;
  ctx.fillRect(0, bandY, w, bandH);

  const title = (state.title || '').trim().toUpperCase() || 'UNTITLED';
  const maxW = w * 0.92;
  let size = h * 0.11;
  let lines = wrapTitle(ctx, title, size, maxW);
  while (lines.join(' ').length && (lines.some((l) => ctx.measureText(l).width > maxW) || lines.length > 2) && size > h * 0.03) {
    size *= 0.94;
    lines = wrapTitle(ctx, title, size, maxW);
  }
  const lineH = size * 1.02;
  const tagSize = Math.max(13, h * 0.021);
  // Stack from the title edge: skyline strip, tagline, then the title lines.
  const skyH = h * 0.06;
  const tagline = (state.tagline || '').trim().toUpperCase();
  const tagY = bottom ? h - skyH - tagSize : skyH + tagSize;
  const titleBottom = bottom ? tagY - tagSize * 1.15 : tagY + tagSize * 1.15;
  let y = bottom
    ? titleBottom - (lines.length - 1) * lineH - lineH / 2
    : titleBottom + (lines.length - 1) * lineH + lineH / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas: no letter-spacing */ }

  const grad = ctx.createLinearGradient(0, y - size, 0, y + size * (lines.length - 0.4));
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.5, '#ff7e5f');
  grad.addColorStop(1, '#ff2e88');
  lines.forEach((line, i) => {
    const ly = y + i * lineH;
    ctx.save();
    ctx.font = `900 ${size}px "Arial Black", "Noto Sans Black", "Liberation Sans", Arial, sans-serif`;
    ctx.lineJoin = 'round';
    if (state.titleStyle === 'outline') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.strokeText(line, w / 2, ly);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillText(line, w / 2, ly);
    } else if (state.titleStyle === 'neon') {
      ctx.shadowColor = '#ff2bd6';
      ctx.shadowBlur = size * 0.35;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = Math.max(2, size * 0.03);
      ctx.strokeText(line, w / 2, ly);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = size * 0.18;
      ctx.fillStyle = '#f2feff';
      ctx.fillText(line, w / 2, ly);
    } else if (state.titleStyle === 'block') {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.16;
      ctx.shadowOffsetY = size * 0.05;
      ctx.strokeStyle = '#160a1c';
      ctx.lineWidth = size * 0.16;
      ctx.strokeText(line, w / 2, ly);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, w / 2, ly);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.14;
      ctx.shadowOffsetY = size * 0.04;
      ctx.strokeStyle = '#160a1c';
      ctx.lineWidth = size * 0.15;
      ctx.strokeText(line, w / 2, ly);
      ctx.fillStyle = grad;
      ctx.fillText(line, w / 2, ly);
    }
    ctx.restore();
  });

  const ty = tagY;
  if (tagline) {
    ctx.save();
    ctx.font = `700 ${tagSize}px "Arial Black", "Noto Sans Black", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(tagSize * 0.42)}px`; } catch { /* no letter-spacing */ }
    ctx.fillStyle = '#ffd166';
    ctx.fillText(tagline, w / 2, ty);
    const tw = ctx.measureText(tagline).width;
    ctx.strokeStyle = 'rgba(255,209,102,0.9)';
    ctx.lineWidth = Math.max(1.5, h * 0.0016);
    const rule = Math.min(w * 0.14, (w - tw) / 2 - w * 0.02);
    if (rule > 10) {
      ctx.beginPath();
      ctx.moveTo(w / 2 - tw / 2 - w * 0.02 - rule, ty);
      ctx.lineTo(w / 2 - tw / 2 - w * 0.02, ty);
      ctx.moveTo(w / 2 + tw / 2 + w * 0.02, ty);
      ctx.lineTo(w / 2 + tw / 2 + w * 0.02 + rule, ty);
      ctx.stroke();
    }
    ctx.restore();
  }
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  ctx.textBaseline = 'alphabetic';
}

function wrapTitle(ctx, title, size, maxW) {
  ctx.font = `900 ${size}px "Arial Black", "Noto Sans Black", "Liberation Sans", Arial, sans-serif`;
  const words = title.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxW || !cur) cur = next;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

let grainTile = null;
function drawGrain(ctx, w, h) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 128;
    grainTile.height = 128;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(128, 128);
    const rnd = mulberry32(77);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Deterministic pseudo-random numbers, so the skyline and grain never shift. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
