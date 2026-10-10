// Dessin des compagnons en SVG local. Chaque animal partage le même « squelette » (épaules, taille,
// hanches, bras, jambes, tête) avec ses propres proportions. Les vêtements sont découpés sur la
// silhouette de l'animal (clipPath) : ils épousent ainsi chaque morphologie sans flotter.
import { s } from '../util.js';
import { ITEMS_BY_ID } from './wardrobe.js';

export const ANIMALS = {
  gorille: {
    label: 'Gorille', fur: '#3B3A3C', secondary: '#8A7A6E',
    rig: { sy: 106, wy: 148, hy: 170, sw: 46, ww: 37, hw: 38, lx: 20, lw: 23, aw: 19, ay: 194, hcy: 78, hrx: 33, hry: 31, eyeDX: 11, eyeY: -4, eyeR: 3.6, mouthY: 15, top: -31 },
  },
  ours: {
    label: 'Ours', fur: '#8B5A3C', secondary: '#D9B48F',
    rig: { sy: 110, wy: 152, hy: 176, sw: 39, ww: 43, hw: 41, lx: 19, lw: 24, aw: 18, ay: 178, hcy: 78, hrx: 35, hry: 32, eyeDX: 13, eyeY: -5, eyeR: 3.4, mouthY: 16, top: -32 },
  },
  chat: {
    label: 'Chat', fur: '#D98E4A', secondary: '#F6E3C8',
    rig: { sy: 116, wy: 152, hy: 174, sw: 31, ww: 27, hw: 32, lx: 14, lw: 17, aw: 13, ay: 172, hcy: 84, hrx: 33, hry: 28, eyeDX: 13, eyeY: -2, eyeR: 4, mouthY: 12, top: -28 },
  },
  chien: {
    label: 'Chien', fur: '#C9A27A', secondary: '#F3E6D3',
    rig: { sy: 114, wy: 152, hy: 174, sw: 35, ww: 31, hw: 34, lx: 16, lw: 19, aw: 15, ay: 175, hcy: 80, hrx: 31, hry: 30, eyeDX: 12, eyeY: -5, eyeR: 3.6, mouthY: 19, top: -30 },
  },
  loutre: {
    label: 'Loutre', fur: '#6B4A35', secondary: '#E8D2B5',
    rig: { sy: 110, wy: 156, hy: 184, sw: 28, ww: 32, hw: 33, lx: 15, lw: 17, aw: 12, ay: 166, hcy: 84, hrx: 28, hry: 25, eyeDX: 10, eyeY: -4, eyeR: 3.2, mouthY: 12, top: -25 },
  },
};

export const FUR_COLORS = ['#3B3A3C', '#5A4636', '#6B4A35', '#8B5A3C', '#B07A4B', '#D98E4A', '#C9A27A', '#E5D6BF', '#7A7F86', '#4E5D63'];
export const SECONDARY_COLORS = ['#F6E3C8', '#F3E6D3', '#E8D2B5', '#D9B48F', '#8A7A6E', '#FFFDF8', '#C9C2B8', '#B9A58C'];

export const EXPRESSIONS = { calme: 'Calme', sourire: 'Souriant', joie: 'Joyeux', clin: 'Complice', fier: 'Fier' };
export const POSES = { repos: 'Repos', salut: 'Salut', pouce: 'Bravo', victoire: 'Victoire' };

const G = 222; // ligne du sol
let uidc = 0;

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return '#' + [f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function torsoPath(r) {
  const c = 100, { sy, wy, hy, sw, ww, hw } = r;
  return `M ${c} ${sy - 3} C ${c - sw * 0.6} ${sy - 4}, ${c - sw} ${sy - 1}, ${c - sw} ${sy + 10} C ${c - sw} ${(sy + wy) / 2}, ${c - ww} ${wy - 8}, ${c - ww} ${wy} C ${c - ww} ${wy + 8}, ${c - hw} ${hy - 10}, ${c - hw} ${hy} C ${c - hw} ${hy + 10}, ${c - hw * 0.5} ${hy + 14}, ${c} ${hy + 14} C ${c + hw * 0.5} ${hy + 14}, ${c + hw} ${hy + 10}, ${c + hw} ${hy} C ${c + hw} ${hy - 10}, ${c + ww} ${wy + 8}, ${c + ww} ${wy} C ${c + ww} ${wy - 8}, ${c + sw} ${(sy + wy) / 2}, ${c + sw} ${sy + 10} C ${c + sw} ${sy - 1}, ${c + sw * 0.6} ${sy - 4}, ${c} ${sy - 3} Z`;
}

export function armLength(r) { return r.ay - r.sy; }

// ---------- Têtes ----------
function head(animal, r, fur, sec, ctx) {
  const dark = shade(fur, -0.35), ink = '#2B2A28';
  const back = [], front = [], top = [];
  const H = s('g', { class: 'c-head-shape' });
  if (animal === 'gorille') {
    back.push(s('circle', { cx: -r.hrx + 1, cy: 2, r: 8, fill: fur }), s('circle', { cx: r.hrx - 1, cy: 2, r: 8, fill: fur }),
      s('circle', { cx: -r.hrx + 1, cy: 2, r: 4, fill: sec }), s('circle', { cx: r.hrx - 1, cy: 2, r: 4, fill: sec }));
    H.append(s('ellipse', { cx: 0, cy: -4, rx: r.hrx - 4, ry: r.hry + 3, fill: fur }), s('ellipse', { cx: 0, cy: 2, rx: r.hrx, ry: r.hry - 3, fill: fur }),
      s('path', { d: `M -24 -8 C -24 -20, 24 -20, 24 -8 C 26 4, 22 26, 0 27 C -22 26, -26 4, -24 -8 Z`, fill: sec }),
      s('path', { d: 'M -24 -9 C -14 -16, 14 -16, 24 -9', stroke: dark, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }),
      s('ellipse', { cx: -4, cy: 9, rx: 2.4, ry: 1.8, fill: ink }), s('ellipse', { cx: 4, cy: 9, rx: 2.4, ry: 1.8, fill: ink }));
  } else if (animal === 'ours') {
    back.push(s('circle', { cx: -24, cy: -24, r: 12, fill: fur }), s('circle', { cx: 24, cy: -24, r: 12, fill: fur }),
      s('circle', { cx: -24, cy: -24, r: 6, fill: sec }), s('circle', { cx: 24, cy: -24, r: 6, fill: sec }));
    H.append(s('ellipse', { cx: 0, cy: 0, rx: r.hrx, ry: r.hry, fill: fur }),
      s('ellipse', { cx: 0, cy: 11, rx: 16, ry: 12, fill: sec }), s('ellipse', { cx: 0, cy: 5, rx: 6, ry: 4.4, fill: ink }));
  } else if (animal === 'chat') {
    const ear = (sgn) => s('path', { d: `M ${sgn * 10} ${-22} L ${sgn * 27} ${-45} L ${sgn * 32} ${-12} Z`, fill: fur, 'stroke-linejoin': 'round', stroke: fur, 'stroke-width': 4 });
    const inner = (sgn) => s('path', { d: `M ${sgn * 15} ${-22} L ${sgn * 26} ${-38} L ${sgn * 28} ${-17} Z`, fill: sec });
    ctx.earsFront = [ear(-1), ear(1), inner(-1), inner(1)];
    H.append(s('ellipse', { cx: 0, cy: 0, rx: r.hrx, ry: r.hry, fill: fur }),
      s('path', { d: 'M -6 -26 l 2 9 M 0 -28 l 0 10 M 6 -26 l -2 9', stroke: dark, 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
      s('ellipse', { cx: -9, cy: 10, rx: 10, ry: 7.5, fill: sec }), s('ellipse', { cx: 9, cy: 10, rx: 10, ry: 7.5, fill: sec }),
      s('path', { d: 'M -3.5 5 L 3.5 5 L 0 9 Z', fill: '#B5675C' }),
      s('path', { d: 'M -14 10 L -32 7 M -14 13 L -32 15 M 14 10 L 32 7 M 14 13 L 32 15', stroke: shade(sec, -0.25), 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
  } else if (animal === 'chien') {
    const ear = (sgn) => s('path', { d: `M ${sgn * 20} -22 C ${sgn * 40} -20, ${sgn * 42} 6, ${sgn * 33} 20 C ${sgn * 27} 26, ${sgn * 20} 16, ${sgn * 22} 2 Z`, fill: shade(fur, -0.25) });
    ctx.earsFront = [ear(-1), ear(1)];
    H.append(s('ellipse', { cx: 0, cy: 0, rx: r.hrx, ry: r.hry, fill: fur }),
      s('ellipse', { cx: 0, cy: 14, rx: 16, ry: 12.5, fill: sec }), s('ellipse', { cx: 0, cy: 7, rx: 6.4, ry: 4.8, fill: ink }),
      s('ellipse', { cx: -2, cy: 5.6, rx: 1.8, ry: 1.1, fill: '#fff', opacity: 0.6 }));
  } else if (animal === 'loutre') {
    back.push(s('circle', { cx: -21, cy: -15, r: 6, fill: fur }), s('circle', { cx: 21, cy: -15, r: 6, fill: fur }),
      s('circle', { cx: -21, cy: -15, r: 3, fill: shade(fur, -0.3) }), s('circle', { cx: 21, cy: -15, r: 3, fill: shade(fur, -0.3) }));
    H.append(s('ellipse', { cx: 0, cy: 0, rx: r.hrx, ry: r.hry, fill: fur }),
      s('ellipse', { cx: 0, cy: 8, rx: 21, ry: 14, fill: sec }),
      s('ellipse', { cx: 0, cy: 4, rx: 5.6, ry: 3.6, fill: ink }),
      s('path', { d: 'M -9 9 L -27 6 M -9 12 L -27 13 M 9 9 L 27 6 M 9 12 L 27 13', stroke: shade(sec, -0.35), 'stroke-width': 1.1, 'stroke-linecap': 'round' }));
  }
  return { back, shape: H, top };
}

function eyes(r, expression, blush) {
  const ink = '#2B2A28', g = s('g', { class: 'c-eyes' }), out = [];
  const L = -r.eyeDX, R = r.eyeDX, y = r.eyeY, e = r.eyeR;
  const open = (x) => [s('circle', { cx: x, cy: y, r: e, fill: ink, class: 'c-eye' }), s('circle', { cx: x + e * 0.35, cy: y - e * 0.35, r: e * 0.33, fill: '#fff' })];
  const happy = (x) => s('path', { d: `M ${x - e} ${y + 1} Q ${x} ${y - e * 1.4} ${x + e} ${y + 1}`, stroke: ink, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' });
  if (expression === 'joie') g.append(happy(L), happy(R));
  else if (expression === 'clin') g.append(...open(L), happy(R));
  else g.append(...open(L), ...open(R));
  if (expression === 'fier') g.append(s('path', { d: `M ${L - e - 1} ${y - e - 3} L ${L + e} ${y - e - 1} M ${R - e} ${y - e - 1} L ${R + e + 1} ${y - e - 3}`, stroke: ink, 'stroke-width': 2, 'stroke-linecap': 'round' }));
  out.push(g);
  if (blush) out.push(s('ellipse', { cx: L - 3, cy: y + e + 5, rx: 4.5, ry: 2.6, fill: '#E07A5F', opacity: 0.45 }), s('ellipse', { cx: R + 3, cy: y + e + 5, rx: 4.5, ry: 2.6, fill: '#E07A5F', opacity: 0.45 }));
  return out;
}

function mouth(r, expression) {
  const ink = '#2B2A28', y = r.mouthY;
  if (expression === 'joie') return [s('path', { d: `M -7 ${y - 1} Q 0 ${y + 9} 7 ${y - 1} Z`, fill: '#7A2E2A', stroke: ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }), s('ellipse', { cx: 0, cy: y + 4, rx: 3, ry: 1.8, fill: '#E07A5F' })];
  if (expression === 'calme') return [s('path', { d: `M -4 ${y} Q 0 ${y + 2.5} 4 ${y}`, stroke: ink, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round' })];
  if (expression === 'fier') return [s('path', { d: `M -6 ${y} Q 1 ${y + 4} 7 ${y - 2}`, stroke: ink, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' })];
  return [s('path', { d: `M -7 ${y - 1} Q 0 ${y + 6} 7 ${y - 1}`, stroke: ink, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' })];
}

function tail(animal, r, fur, sec) {
  const c = 100;
  if (animal === 'chat') return [s('path', { class: 'c-tail', d: `M ${c + r.hw - 6} ${r.hy + 4} C ${c + 70} ${r.hy + 6}, ${c + 78} ${r.hy - 40}, ${c + 62} ${r.hy - 62}`, stroke: fur, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round' })];
  if (animal === 'chien') return [s('path', { class: 'c-tail', d: `M ${c + r.hw - 6} ${r.hy - 2} C ${c + 58} ${r.hy - 6}, ${c + 64} ${r.hy - 30}, ${c + 56} ${r.hy - 44}`, stroke: fur, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round' })];
  if (animal === 'loutre') return [s('path', { class: 'c-tail', d: `M ${c + r.hw - 12} ${r.hy - 6} C ${c + 66} ${r.hy}, ${c + 82} ${G - 6}, ${c + 92} ${G - 4} C ${c + 84} ${G - 14}, ${c + 70} ${r.hy - 20}, ${c + r.hw - 14} ${r.hy - 22} Z`, fill: shade(fur, -0.1) })];
  if (animal === 'ours') return [s('circle', { cx: c + r.hw - 4, cy: r.hy + 2, r: 7, fill: fur })];
  return [];
}

// ---------- Décor et environnement ----------
function decorLayer(decorId, stage, accent) {
  const out = [];
  const d = decorId ? ITEMS_BY_ID[decorId] : null;
  if (d && d.drawDecor) out.push(...d.drawDecor());
  else out.push(s('ellipse', { cx: 100, cy: 128, rx: 92, ry: 104, fill: 'var(--c-halo, #F1E6D2)' }));
  out.push(s('ellipse', { cx: 100, cy: G + 2, rx: 78, ry: 7, fill: '#2B2A28', opacity: 0.12 }));
  // Détails d'environnement selon l'étape
  if (stage >= 2) out.push(s('g', { class: 'c-env' }, s('path', { d: 'M 22 222 q -2 -14 6 -22 q 2 12 -2 22 Z', fill: '#4F7A5A' }), s('path', { d: 'M 26 222 q 6 -18 16 -20 q -4 14 -12 20 Z', fill: '#6E9B6F' }), s('rect', { x: 16, y: 214, width: 22, height: 10, rx: 3, fill: '#B5674A' })));
  if (stage >= 3) {
    const g = s('g', { class: 'c-env' }, s('path', { d: 'M 18 30 Q 100 52 182 30', stroke: '#9A8B73', 'stroke-width': 1.2, fill: 'none' }));
    const cols = ['#0F5560', '#E07A5F', '#C9A227', '#6E9B6F', '#0F5560', '#E07A5F', '#C9A227'];
    cols.forEach((col, i) => { const x = 34 + i * 22, y = 30 + Math.sin((i + 1) / 8 * Math.PI) * 17; g.append(s('path', { d: `M ${x - 6} ${y} L ${x + 6} ${y} L ${x} ${y + 12} Z`, fill: col })); });
    out.push(g);
  }
  if (stage >= 4) out.push(s('g', { class: 'c-env c-sun' }, s('circle', { cx: 168, cy: 70, r: 11, fill: '#E9C46A' }), ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => s('line', { x1: 168 + Math.cos(a * Math.PI / 180) * 15, y1: 70 + Math.sin(a * Math.PI / 180) * 15, x2: 168 + Math.cos(a * Math.PI / 180) * 20, y2: 70 + Math.sin(a * Math.PI / 180) * 20, stroke: '#E9C46A', 'stroke-width': 2.4, 'stroke-linecap': 'round' }))));
  if (stage >= 5) out.push(s('g', { class: 'c-env c-sparkles' }, ...[[30, 90], [176, 130], [40, 150], [150, 30]].map(([x, y]) => s('path', { d: `M ${x} ${y - 6} L ${x + 1.8} ${y - 1.8} L ${x + 6} ${y} L ${x + 1.8} ${y + 1.8} L ${x} ${y + 6} L ${x - 1.8} ${y + 1.8} L ${x - 6} ${y} L ${x - 1.8} ${y - 1.8} Z`, fill: accent || '#C9A227' }))));
  return out;
}

export function stageOf(level) { return Math.min(5, Math.max(1, Math.ceil(level / 2))); }
export function restExpression(stage) { return ['calme', 'calme', 'sourire', 'sourire', 'fier', 'joie'][stage]; }
export function reactionsFor(stage) { return [['joie', 'repos'], ['joie', 'salut'], ['joie', 'pouce'], ['clin', 'pouce'], ['joie', 'victoire']].slice(0, stage); }

// Assemble les pièces équipées en appliquant les incompatibilités (tenue complète ↔ haut/bas).
export function resolveOutfit(equipped = {}) {
  const e = { ...equipped };
  if (e.tenue) { delete e.haut; delete e.bas; }
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v && ITEMS_BY_ID[v]));
}

/**
 * Rendu du compagnon.
 * comp : { animal, colors: { fur, secondary }, equipped }
 * opts : { stage, expression, pose, decor (bool), title, cls, tryOn: { slot: itemId } }
 */
export function companionSVG(comp, opts = {}) {
  const animal = ANIMALS[comp.animal] ? comp.animal : 'ours';
  const A = ANIMALS[animal], r = A.rig;
  const fur = comp.colors?.fur || A.fur, sec = comp.colors?.secondary || A.secondary;
  const stage = opts.stage || 1;
  const expression = opts.expression || restExpression(stage);
  const pose = opts.pose || 'repos';
  const equipped = resolveOutfit({ ...(comp.equipped || {}), ...(opts.tryOn || {}) });
  const id = 'c' + (++uidc);
  const ctx = { id, fur, sec, r, animal, earsFront: null, L: armLength(r), paw: shade(fur, -0.2) };
  const items = Object.values(equipped).map(i => ITEMS_BY_ID[i]);
  const call = (layer, ...args) => items.flatMap(it => (it.draw && it.draw[layer]) ? it.draw[layer](r, ctx, ...args) : []);

  const svg = s('svg', { viewBox: '0 0 200 240', class: `companion c-${animal} ${opts.cls || ''}`, role: 'img', 'aria-label': opts.title || `${A.label}` });
  const defs = s('defs', {},
    s('clipPath', { id: id + '-torso' }, s('path', { d: torsoPath(r) })),
    s('clipPath', { id: id + '-legs' },
      s('rect', { x: 100 - r.lx - r.lw / 2, y: r.hy - 12, width: r.lw, height: G - r.hy + 6, rx: r.lw / 2 }),
      s('rect', { x: 100 + r.lx - r.lw / 2, y: r.hy - 12, width: r.lw, height: G - r.hy + 6, rx: r.lw / 2 })),
    s('clipPath', { id: id + '-arm' }, s('rect', { x: -r.aw / 2, y: -r.aw / 2, width: r.aw, height: ctx.L + r.aw / 2, rx: r.aw / 2 })));
  svg.append(defs);
  ctx.torso = (el) => { el.setAttribute('clip-path', `url(#${id}-torso)`); return el; };
  ctx.legs = (el) => { el.setAttribute('clip-path', `url(#${id}-legs)`); return el; };
  ctx.arm = (el) => { el.setAttribute('clip-path', `url(#${id}-arm)`); return el; };

  if (opts.decor !== false) svg.append(s('g', { class: 'c-decor' }, ...decorLayer(equipped.decor, stage, opts.accent)));
  if (equipped.sol) svg.append(...call('ground'));

  const body = s('g', { class: 'c-body' });
  svg.append(body);
  body.append(...call('back'), ...tail(animal, r, fur, sec));
  // Jambes et pieds
  const feet = shade(fur, -0.2);
  for (const sg of [-1, 1]) body.append(s('rect', { x: 100 + sg * r.lx - r.lw / 2, y: r.hy - 12, width: r.lw, height: G - r.hy + 6, rx: r.lw / 2, fill: fur }));
  body.append(...call('legs'));
  for (const sg of [-1, 1]) body.append(s('ellipse', { cx: 100 + sg * (r.lx + 2), cy: G - 3, rx: r.lw * 0.68, ry: 6.5, fill: feet }));
  body.append(...call('shoes'));
  // Torse
  const breathe = s('g', { class: 'c-breathe' });
  breathe.append(s('path', { d: torsoPath(r), fill: fur }));
  breathe.append(ctx.torso(s('ellipse', { cx: 100, cy: (r.wy + r.hy) / 2 - 2, rx: r.ww * 0.62, ry: (r.hy - r.sy) * 0.42, fill: sec, opacity: animal === 'gorille' ? 0.45 : 1 })));
  breathe.append(...call('lower'), ...call('upper'), ...call('jacket'), ...call('front'));
  body.append(breathe);
  // Bras
  const angles = { repos: [10, -10], salut: [10, -150], pouce: [10, -128], victoire: [150, -150] }[pose] || [10, -10];
  ['L', 'R'].forEach((side, k) => {
    const sg = k === 0 ? -1 : 1;
    const px = 100 + sg * (r.sw - r.aw / 2 - 1), py = r.sy + 7;
    const outer = s('g', { transform: `translate(${px} ${py}) rotate(${angles[k]})` });
    const inner = s('g', { class: `c-arm c-arm-${side}` });
    inner.append(s('rect', { x: -r.aw / 2, y: -r.aw / 2, width: r.aw, height: ctx.L + r.aw / 2, rx: r.aw / 2, fill: fur }));
    inner.append(...call('sleeve', side), ...call('jacketSleeve', side));
    inner.append(s('circle', { cx: 0, cy: ctx.L, r: r.aw * 0.62, fill: feet }));
    inner.append(...call('hand', side));
    outer.append(inner);
    body.append(outer);
  });
  // Tête
  const h0 = head(animal, r, fur, sec, ctx);
  const hg = s('g', { class: 'c-head', transform: `translate(100 ${r.hcy})` });
  hg.append(...call('hood'), ...h0.back, h0.shape, ...eyes(r, expression, stage >= 3), ...mouth(r, expression));
  hg.append(...call('head'));
  if (ctx.earsFront) hg.append(...ctx.earsFront);
  hg.append(...call('headTop'), ...call('face'));
  body.append(hg);
  return svg;
}
