// Graphiques SVG légers, sans dépendance. Chaque graphique a une légende textuelle,
// une zone de lecture des valeurs au toucher et un tableau de valeurs dépliable.
import { h, s, fmtNum, fmtShort, parseISO, isoDate } from '../util.js';

const W = 340, PAD = { l: 38, r: 10, t: 12, b: 26 };

function niceTicks(min, max, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(st => span / st <= n) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const t = []; for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(6));
  return t;
}

function table(headers, rows) {
  return h('details', { class: 'chart-table' }, h('summary', { text: 'Voir les valeurs' }),
    h('table', {}, h('thead', {}, h('tr', {}, ...headers.map(x => h('th', { scope: 'col', text: x })))),
      h('tbody', {}, ...rows.map(r => h('tr', {}, ...r.map(c => h('td', { text: c })))))));
}

function legend(items) {
  return h('ul', { class: 'legend' }, ...items.map(i => h('li', {},
    h('span', { class: `sw ${i.style || ''}`, style: { '--c': i.color } }), i.label)));
}

// series: [{ name, color, points: [{ x: 'AAAA-MM-JJ', y, approx, note }], dashed, marker }]
export function lineChart({ series, height = 190, yFmt = (v) => fmtNum(v, 1), refLines = [], title, unit = '', yMinZero = false, caption }) {
  const all = series.flatMap(sr => sr.points.filter(p => p.y !== null && p.y !== undefined));
  const wrap = h('figure', { class: 'chart' });
  if (title) wrap.append(h('figcaption', { class: 'chart-title', text: title }));
  if (!all.length) { wrap.append(h('p', { class: 'muted chart-empty', text: 'Pas encore de valeur sur cette période.' })); return wrap; }
  const xs = all.map(p => parseISO(p.x).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const ysAll = [...all.map(p => p.y), ...refLines.map(r => r.y)];
  let y0 = Math.min(...ysAll), y1 = Math.max(...ysAll);
  if (yMinZero) y0 = Math.min(0, y0);
  const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
  const ticks = niceTicks(y0, y1);
  y0 = Math.min(y0, ticks[0]); y1 = Math.max(y1, ticks[ticks.length - 1]);
  const X = (t) => PAD.l + (t - x0) / (x1 - x0) * (W - PAD.l - PAD.r);
  const Y = (v) => PAD.t + (1 - (v - y0) / (y1 - y0)) * (height - PAD.t - PAD.b);
  const readout = h('p', { class: 'chart-readout', 'aria-live': 'polite', text: caption || 'Touchez un point pour lire sa valeur.' });
  const svg = s('svg', { viewBox: `0 0 ${W} ${height}`, class: 'chart-svg', role: 'img', 'aria-label': (title || 'Graphique') + ' : ' + series.map(sr => sr.name).join(', ') });
  for (const t of ticks) {
    svg.append(s('line', { x1: PAD.l, x2: W - PAD.r, y1: Y(t), y2: Y(t), class: 'grid' }));
    svg.append(s('text', { x: PAD.l - 6, y: Y(t) + 3.5, class: 'axis', 'text-anchor': 'end', text: yFmt(t) }));
  }
  const xt = [x0, (x0 + x1) / 2, x1];
  xt.forEach((t, i) => svg.append(s('text', { x: X(t), y: height - 8, class: 'axis', 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle', text: fmtShort(isoDate(new Date(t))) })));
  for (const r of refLines) {
    svg.append(s('line', { x1: PAD.l, x2: W - PAD.r, y1: Y(r.y), y2: Y(r.y), class: 'ref', stroke: r.color || 'currentColor' }));
    svg.append(s('text', { x: W - PAD.r - 2, y: Y(r.y) - 4, class: 'axis ref-label', 'text-anchor': 'end', text: r.label }));
  }
  series.forEach((sr) => {
    const pts = sr.points.filter(p => p.y !== null && p.y !== undefined).sort((a, b) => a.x.localeCompare(b.x));
    if (pts.length > 1) svg.append(s('polyline', { points: pts.map(p => `${X(parseISO(p.x).getTime())},${Y(p.y)}`).join(' '), fill: 'none', stroke: sr.color, 'stroke-width': 2.2, 'stroke-dasharray': sr.dashed ? '5 4' : null, 'stroke-linejoin': 'round' }));
    for (const p of pts) {
      const cx = X(parseISO(p.x).getTime()), cy = Y(p.y);
      const label = `${sr.name} — ${fmtShort(p.x)} : ${p.approx ? '≈ ' : ''}${yFmt(p.y)}${unit}${p.note ? ' (' + p.note + ')' : ''}`;
      const shape = sr.marker === 'square'
        ? s('rect', { x: cx - 4, y: cy - 4, width: 8, height: 8, fill: p.approx ? 'var(--surface)' : sr.color, stroke: sr.color, 'stroke-width': 2 })
        : s('circle', { cx, cy, r: 4.5, fill: p.approx ? 'var(--surface)' : sr.color, stroke: sr.color, 'stroke-width': 2 });
      const hit = s('circle', { cx, cy, r: 14, fill: 'transparent', class: 'hit', onclick: () => { readout.textContent = label; } });
      svg.append(shape, hit);
    }
  });
  wrap.append(svg, readout);
  const legItems = series.map(sr => ({ label: sr.name, color: sr.color, style: sr.dashed ? 'dashed' : '' }));
  if (all.some(p => p.approx)) legItems.push({ label: 'Point creux : valeur approximative ou estimée', color: 'var(--ink-soft)', style: 'hollow' });
  for (const r of refLines) legItems.push({ label: r.label, color: r.color || 'var(--ink-soft)', style: 'ref' });
  wrap.append(legend(legItems));
  const rows = series.flatMap(sr => sr.points.filter(p => p.y !== null && p.y !== undefined).map(p => [sr.name, fmtShort(p.x), (p.approx ? '≈ ' : '') + yFmt(p.y) + unit, p.note || '']));
  wrap.append(table(['Série', 'Date', 'Valeur', 'Remarque'], rows));
  return wrap;
}

// labels : étiquettes d'abscisse ; series : [{ name, color, values: [nombre|null], partial: [bool] }]
export function barChart({ labels, series, height = 190, stacked = false, target = null, targetLabel = 'Objectif', yFmt = (v) => fmtNum(v, 0), title, unit = '', partialNote = 'Total partiel : certaines valeurs sont inconnues' }) {
  const wrap = h('figure', { class: 'chart' });
  if (title) wrap.append(h('figcaption', { class: 'chart-title', text: title }));
  const totals = labels.map((_, i) => stacked ? series.reduce((a, sr) => a + (sr.values[i] || 0), 0) : Math.max(0, ...series.map(sr => sr.values[i] || 0)));
  const maxV = Math.max(target || 0, ...totals, 1);
  const ticks = niceTicks(0, maxV, 4);
  const y1 = ticks[ticks.length - 1];
  const n = labels.length;
  const band = (W - PAD.l - PAD.r) / Math.max(n, 1);
  const bw = stacked ? Math.max(4, band * 0.62) : Math.max(3, band * 0.7 / series.length);
  const Y = (v) => PAD.t + (1 - v / y1) * (height - PAD.t - PAD.b);
  const readout = h('p', { class: 'chart-readout', 'aria-live': 'polite', text: 'Touchez une barre pour lire sa valeur.' });
  const svg = s('svg', { viewBox: `0 0 ${W} ${height}`, class: 'chart-svg', role: 'img', 'aria-label': (title || 'Graphique') + ' : ' + series.map(sr => sr.name).join(', ') });
  const defs = s('defs', {}, s('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 6, height: 6, fill: 'var(--surface)' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--ink-soft)', 'stroke-width': 3 })));
  svg.append(defs);
  for (const t of ticks) {
    svg.append(s('line', { x1: PAD.l, x2: W - PAD.r, y1: Y(t), y2: Y(t), class: 'grid' }));
    svg.append(s('text', { x: PAD.l - 6, y: Y(t) + 3.5, class: 'axis', 'text-anchor': 'end', text: yFmt(t) }));
  }
  const every = Math.ceil(n / 7);
  labels.forEach((lb, i) => {
    const cx = PAD.l + band * i + band / 2;
    if (i % every === 0 || i === n - 1) svg.append(s('text', { x: cx, y: height - 8, class: 'axis', 'text-anchor': 'middle', text: lb }));
    let acc = 0;
    series.forEach((sr, k) => {
      const v = sr.values[i];
      if (v === null || v === undefined) return;
      const x = stacked ? cx - bw / 2 : cx - (bw * series.length) / 2 + bw * k;
      const yTop = Y(acc + v), yBot = Y(acc);
      const partial = sr.partial && sr.partial[i];
      const label = `${sr.name} — ${lb} : ${yFmt(v)}${unit}${partial ? ' (partiel)' : ''}`;
      svg.append(s('rect', { x, y: yTop, width: bw, height: Math.max(0, yBot - yTop), rx: 2, fill: sr.color, opacity: partial ? 0.55 : 1 }));
      if (partial) svg.append(s('rect', { x, y: yTop, width: bw, height: Math.max(0, yBot - yTop), fill: 'url(#hatch)', opacity: 0.45 }));
      svg.append(s('rect', { x, y: Math.min(yTop, Y(0) - 14), width: bw, height: Math.max(14, yBot - yTop), fill: 'transparent', class: 'hit', onclick: () => { readout.textContent = label; } }));
      if (stacked) acc += v;
    });
  });
  if (target) {
    svg.append(s('line', { x1: PAD.l, x2: W - PAD.r, y1: Y(target), y2: Y(target), class: 'ref', stroke: 'var(--ink)' }));
    svg.append(s('text', { x: W - PAD.r - 2, y: Y(target) - 4, class: 'axis ref-label', 'text-anchor': 'end', text: targetLabel }));
  }
  wrap.append(svg, readout);
  const leg = series.map(sr => ({ label: sr.name, color: sr.color }));
  if (series.some(sr => (sr.partial || []).some(Boolean))) leg.push({ label: partialNote, color: 'var(--ink-soft)', style: 'hatch' });
  if (target) leg.push({ label: targetLabel, color: 'var(--ink)', style: 'ref' });
  wrap.append(legend(leg));
  const rows = labels.map((lb, i) => [lb, ...series.map(sr => sr.values[i] === null || sr.values[i] === undefined ? '—' : yFmt(sr.values[i]) + unit + (sr.partial && sr.partial[i] ? ' (partiel)' : ''))]);
  wrap.append(table(['Période', ...series.map(sr => sr.name)], rows));
  return wrap;
}

// Barres horizontales HTML (répartition)
export function hbars(items, { color = 'var(--accent)', fmt = (v) => fmtNum(v, 1) } = {}) {
  const max = Math.max(1, ...items.map(i => i.value));
  return h('ul', { class: 'hbars' }, ...items.map(i => h('li', {},
    h('span', { class: 'hb-label', text: i.label }),
    h('span', { class: 'hb-track' }, h('span', { class: 'hb-fill', style: { width: (i.value / max * 100) + '%', background: i.color || color } })),
    h('span', { class: 'hb-val', text: i.valueLabel || fmt(i.value) }))));
}
