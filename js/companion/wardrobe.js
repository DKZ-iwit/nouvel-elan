// Garde-robe des compagnons. Trois collections de style (féminin, masculin, non genré) de dix pièces
// chacune, plus des décors. Toutes les pièces sont disponibles pour tous les animaux : elles sont
// dessinées à partir du squelette de l'animal (r) et découpées sur sa silhouette (ctx.torso / legs / arm).
import { s } from '../util.js';

export const COLLECTIONS = { feminin: 'Féminin', masculin: 'Masculin', neutre: 'Non genré', decor: 'Décors' };
export const SLOTS = {
  tenue: 'Tenue complète', haut: 'Haut', bas: 'Bas', veste: 'Veste ou sweat', tete: 'Tête', lunettes: 'Lunettes',
  dos: 'Sac', main: 'Dans la main', sol: 'Équipement', decor: 'Décor',
};

const G = 222;
const ink = '#2B2A28';
// ---------- Aides de dessin ----------
const band = (r, ctx, y1, y2, fill, extra = {}) => ctx.torso(s('rect', { x: 0, y: y1, width: 200, height: y2 - y1, fill, ...extra }));
const legBand = (r, ctx, y1, y2, fill) => ctx.legs(s('rect', { x: 0, y: y1, width: 200, height: y2 - y1, fill }));
const sleeve = (r, ctx, len, fill) => ctx.arm(s('rect', { x: -r.aw, y: -r.aw, width: r.aw * 2, height: len + r.aw, fill }));
const knee = (r) => r.hy + (G - r.hy) * 0.5;
const thigh = (r) => r.hy + (G - r.hy) * 0.3;
const brow = (r) => r.eyeY - r.eyeR - 7; // limite haute du regard, en coordonnées de tête
const lowerTorso = (r, ctx, fill, from) => band(r, ctx, from ?? r.wy - 2, r.hy + 16, fill);
const outerLegStripes = (r, ctx, y1, y2, fill, n = 1) => {
  const out = [];
  for (const sg of [-1, 1]) for (let k = 0; k < n; k++) out.push(ctx.legs(s('rect', { x: 100 + sg * (r.lx + r.lw / 2 - 3 - k * 3.5) - 0.9, y: y1, width: 1.8, height: y2 - y1, fill })));
  return out;
};
const sleeveStripes = (r, ctx, len, fill, n = 2) => Array.from({ length: n }, (_, k) => ctx.arm(s('rect', { x: r.aw / 2 - 3 - k * 3.4, y: -r.aw / 2, width: 1.6, height: len + r.aw / 2, fill })));
const zipper = (r, ctx, y1, y2, col = '#D8D1C4') => ctx.torso(s('line', { x1: 100, y1, x2: 100, y2, stroke: col, 'stroke-width': 1.6 }));

export const ITEMS = [];
const I = (id, name, collection, slot, level, desc, draw, extra = {}) => ITEMS.push({ id, name, collection, slot, level, desc, draw, ...extra });

// ================= Collection féminine =================
I('f_debardeur', 'Débardeur dos nageur', 'feminin', 'haut', 1, 'Encolure dégagée, bretelles fines.', {
  upper: (r, ctx) => [
    ctx.torso(s('path', { d: `M 0 ${r.sy + 12} L ${100 - r.sw * 0.35} ${r.sy + 12} Q 100 ${r.sy + 30} ${100 + r.sw * 0.35} ${r.sy + 12} L 200 ${r.sy + 12} L 200 ${r.wy + 8} L 0 ${r.wy + 8} Z`, fill: '#D8A031' })),
    ...[-1, 1].map(sg => ctx.torso(s('rect', { x: 100 + sg * r.sw * 0.5 - 3.5, y: r.sy - 6, width: 7, height: 20, rx: 3, fill: '#D8A031' }))),
    band(r, ctx, r.wy + 5, r.wy + 8, '#A8771C'),
  ],
});
I('f_bandeau_noue', 'Bandeau noué', 'feminin', 'tete', 2, 'Bandeau large avec nœud sur le côté.', {
  head: (r) => {
    const y = brow(r) - 6, w = r.hrx - 1;
    return [s('path', { d: `M ${-w} ${y + 3} Q 0 ${y - 7} ${w} ${y + 3} L ${w} ${y + 12} Q 0 ${y + 3} ${-w} ${y + 12} Z`, fill: '#E07A5F' }),
      s('path', { d: `M ${w - 3} ${y + 4} q 12 -10 16 -2 q -6 6 -14 6 Z M ${w - 3} ${y + 9} q 10 8 15 2 q -6 -6 -13 -6 Z`, fill: '#C9604A' }),
      s('circle', { cx: w - 2, cy: y + 7, r: 4.2, fill: '#B8533F' })];
  },
});
I('f_jupe_tennis', 'Jupe-short plissée', 'feminin', 'bas', 3, 'Jupe évasée à plis, short intégré.', {
  legs: (r, ctx) => [legBand(r, ctx, r.hy - 12, thigh(r) - 2, '#23304A')],
  lower: (r, ctx) => {
    const y1 = r.wy - 1, y2 = r.hy + 20, x1 = r.ww + 1, x2 = r.hw + 11;
    const pleats = [-0.6, -0.2, 0.2, 0.6].map(f => s('line', { x1: 100 + f * x1, y1: y1 + 6, x2: 100 + f * x2, y2, stroke: '#1B2438', 'stroke-width': 1.4 }));
    return [s('path', { d: `M ${100 - x1} ${y1} L ${100 + x1} ${y1} L ${100 + x2} ${y2} L ${100 - x2} ${y2} Z`, fill: '#2E3F5C' }), ...pleats,
      s('rect', { x: 100 - x1, y: y1, width: x1 * 2, height: 5, fill: '#1B2438' }), s('line', { x1: 100 - x2 + 1, y1: y2 - 2, x2: 100 + x2 - 1, y2: y2 - 2, stroke: '#F6EFE2', 'stroke-width': 1.4 })];
  },
});
I('f_lunettes_chat', 'Lunettes œil-de-chat', 'feminin', 'lunettes', 4, 'Monture relevée aux coins.', {
  face: (r) => {
    const e = r.eyeR + 4.5, y = r.eyeY;
    const lens = (x, sg) => s('path', { d: `M ${x - sg * e} ${y - 1} Q ${x - sg * e} ${y + e} ${x} ${y + e - 1} Q ${x + sg * e} ${y + e - 2} ${x + sg * (e + 3)} ${y - e - 2} Q ${x} ${y - e + 1} ${x - sg * e} ${y - 1} Z`, fill: 'rgba(255,255,255,.18)', stroke: '#7A1F2B', 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
    return [lens(-r.eyeDX, 1), lens(r.eyeDX, -1), s('path', { d: `M ${-r.eyeDX + e - 1} ${y - 1} Q 0 ${y - 4} ${r.eyeDX - e + 1} ${y - 1}`, stroke: '#7A1F2B', 'stroke-width': 2, fill: 'none' })];
  },
});
I('f_tote', 'Sac cabas rayé', 'feminin', 'dos', 5, 'Cabas en toile porté à l’épaule.', {
  front: (r, ctx) => {
    const bx = 100 + r.hw + 2, by = r.hy - 14;
    return [s('path', { d: `M ${100 + r.sw * 0.55} ${r.sy - 2} L ${bx + 4} ${by}`, stroke: '#8E7A5C', 'stroke-width': 3.2, 'stroke-linecap': 'round' }),
      s('path', { d: `M ${bx - 4} ${by} L ${bx + 22} ${by} L ${bx + 19} ${by + 26} L ${bx - 1} ${by + 26} Z`, fill: '#E9DCC4', stroke: '#8E7A5C', 'stroke-width': 1.4 }),
      s('rect', { x: bx - 2.5, y: by + 9, width: 23, height: 4, fill: '#0F5560' }), s('rect', { x: bx - 1.8, y: by + 16, width: 21.6, height: 2.4, fill: '#E07A5F' })];
  },
});
I('f_veste_courte', 'Veste courte cintrée', 'feminin', 'veste', 6, 'Coupe courte, portée ouverte.', {
  jacket: (r, ctx) => {
    const y2 = (r.sy + r.wy) / 2 + 8;
    return [band(r, ctx, r.sy - 4, y2, '#8BA888', { width: 95 }), ctx.torso(s('rect', { x: 105, y: r.sy - 4, width: 95, height: y2 - r.sy + 4, fill: '#8BA888' })),
      ctx.torso(s('path', { d: `M 95 ${r.sy - 2} L 88 ${r.sy + 16} L 95 ${r.sy + 12} Z M 105 ${r.sy - 2} L 112 ${r.sy + 16} L 105 ${r.sy + 12} Z`, fill: '#6D8B6A' })),
      band(r, ctx, y2 - 4, y2, '#6D8B6A')];
  },
  jacketSleeve: (r, ctx) => [sleeve(r, ctx, ctx.L - 9, '#8BA888'), ctx.arm(s('rect', { x: -r.aw, y: ctx.L - 13, width: r.aw * 2, height: 4, fill: '#6D8B6A' }))],
});
I('f_legging_motif', 'Legging à motifs', 'feminin', 'bas', 7, 'Taille haute, motif losanges.', {
  legs: (r, ctx) => {
    const out = [legBand(r, ctx, r.hy - 12, G - 9, '#5B3A5E')];
    for (let y = r.hy; y < G - 12; y += 9) for (const sg of [-1, 1]) out.push(ctx.legs(s('path', { d: `M ${100 + sg * r.lx} ${y} l 3 4 l -3 4 l -3 -4 Z`, fill: '#C9A227', opacity: 0.8 })));
    return out;
  },
  lower: (r, ctx) => [lowerTorso(r, ctx, '#5B3A5E', r.wy - 6), band(r, ctx, r.wy - 6, r.wy - 2, '#43284A')],
});
I('f_tapis_yoga', 'Tapis de yoga roulé', 'feminin', 'sol', 8, 'Tapis roulé, sangle de transport.', {
  ground: () => [s('rect', { x: 10, y: G - 20, width: 40, height: 19, rx: 9.5, fill: '#5E7FA8' }), s('circle', { cx: 19.5, cy: G - 10.5, r: 9.5, fill: '#7D9CC4' }),
    s('path', { d: `M 19.5 ${G - 10.5} m -5 0 a 5 5 0 1 1 5 5 a 3 3 0 1 1 -3 -3`, stroke: '#4B6990', 'stroke-width': 1.3, fill: 'none' }), s('rect', { x: 34, y: G - 21, width: 3, height: 21, fill: '#2B2A28' })],
});
I('f_foulard', 'Foulard à pois', 'feminin', 'tete', 9, 'Foulard noué sur la tête.', {
  head: (r) => {
    const yb = brow(r) - 2, w = r.hrx * 0.98, t = r.top - 5;
    const dots = [];
    for (let x = -w + 8; x < w - 6; x += 9) for (let y = t + 8; y < yb - 2; y += 8) dots.push(s('circle', { cx: x + ((y / 8) % 2) * 4, cy: y, r: 1.5, fill: '#F6EFE2' }));
    return [s('path', { d: `M ${-w} ${yb} Q ${-w} ${t} 0 ${t} Q ${w} ${t} ${w} ${yb} Q 0 ${yb - 6} ${-w} ${yb} Z`, fill: '#1E6F73' }),
      s('g', {}, ...dots.filter(d => { const x = +d.getAttribute('cx'), y = +d.getAttribute('cy'); return (x * x) / (w * w) + ((y - yb) * (y - yb)) / ((yb - t) * (yb - t)) < 0.8; })),
      s('path', { d: `M ${w - 4} ${yb - 2} l 10 6 l -3 7 Z M ${w - 4} ${yb - 2} l 12 -2 l -2 7 Z`, fill: '#175A5D' })];
  },
});
I('f_ensemble_yoga', 'Ensemble brassière et legging', 'feminin', 'tenue', 10, 'Brassière croisée et legging taille haute.', {
  upper: (r, ctx) => [band(r, ctx, r.sy + 10, r.sy + 30, '#2A7F7A'),
    ...[-1, 1].map(sg => ctx.torso(s('path', { d: `M ${100 + sg * r.sw * 0.55} ${r.sy - 5} L ${100 - sg * 6} ${r.sy + 14} L ${100 - sg * 1} ${r.sy + 14} L ${100 + sg * r.sw * 0.55 + sg * 7} ${r.sy - 5} Z`, fill: '#2A7F7A' }))),
    band(r, ctx, r.sy + 27, r.sy + 30, '#1D5E5A')],
  legs: (r, ctx) => [legBand(r, ctx, r.hy - 12, G - 9, '#B85C45'), ...outerLegStripes(r, ctx, r.hy - 8, G - 10, '#2A7F7A')],
  lower: (r, ctx) => [lowerTorso(r, ctx, '#B85C45', r.wy - 8), band(r, ctx, r.wy - 8, r.wy - 3, '#94452F')],
});

// ================= Collection masculine =================
I('m_jogging', 'Pantalon de jogging', 'masculin', 'bas', 1, 'Coupe fuselée, chevilles resserrées.', {
  legs: (r, ctx) => [legBand(r, ctx, r.hy - 12, G - 9, '#3E4347'), legBand(r, ctx, G - 17, G - 9, '#2C3033')],
  lower: (r, ctx) => [lowerTorso(r, ctx, '#3E4347'), band(r, ctx, r.wy - 2, r.wy + 3, '#2C3033'),
    s('path', { d: `M 98 ${r.wy + 3} l -2 8 M 102 ${r.wy + 3} l 2 8`, stroke: '#E8E2D6', 'stroke-width': 1.4, 'stroke-linecap': 'round' })],
});
I('m_casquette', 'Casquette', 'masculin', 'tete', 2, 'Casquette à visière courbée.', {
  head: (r) => {
    const y = brow(r) - 1, w = r.hrx * 0.86, t = r.top - 5;
    return [s('path', { d: `M ${-w} ${y} Q ${-w} ${t} 0 ${t} Q ${w} ${t} ${w} ${y} Z`, fill: '#B5542D' }),
      s('path', { d: `M ${-w * 0.2} ${y} Q ${w * 0.6} ${y - 5} ${w * 1.25} ${y + 2} Q ${w * 0.6} ${y + 6} ${-w * 0.2} ${y + 3} Z`, fill: '#8E3F20' }),
      s('line', { x1: 0, y1: t + 1, x2: 0, y2: y, stroke: '#8E3F20', 'stroke-width': 1.2 }), s('circle', { cx: 0, cy: t + 1, r: 2.4, fill: '#8E3F20' })];
  },
});
I('m_short_basket', 'Short de basket', 'masculin', 'bas', 3, 'Short ample au genou, passepoil.', {
  legs: (r) => {
    const out = [], h = knee(r) - r.hy + 10;
    for (const sg of [-1, 1]) {
      const x = 100 + sg * r.lx - r.lw / 2 - 5;
      out.push(s('rect', { x, y: r.hy - 10, width: r.lw + 10, height: h, rx: 3, fill: '#7B2D3A' }),
        s('rect', { x: sg < 0 ? x + 1 : x + r.lw + 7, y: r.hy - 8, width: 2, height: h - 4, fill: '#F2E6CF' }));
    }
    return out;
  },
  lower: (r, ctx) => [lowerTorso(r, ctx, '#7B2D3A'), band(r, ctx, r.wy - 2, r.wy + 4, '#5E2029')],
});
I('m_lunettes_sport', 'Lunettes de sport', 'masculin', 'lunettes', 4, 'Écran enveloppant teinté.', {
  face: (r) => {
    const x1 = -r.eyeDX - r.eyeR - 7, x2 = r.eyeDX + r.eyeR + 7, y = r.eyeY;
    return [s('path', { d: `M ${x1} ${y - r.eyeR - 3} Q 0 ${y - r.eyeR - 7} ${x2} ${y - r.eyeR - 3} L ${x2 - 2} ${y + r.eyeR + 3} Q ${r.eyeDX} ${y + r.eyeR + 6} 3 ${y + 2} L -3 ${y + 2} Q ${-r.eyeDX} ${y + r.eyeR + 6} ${x1 + 2} ${y + r.eyeR + 3} Z`, fill: '#2F6F8F', opacity: 0.42, stroke: '#26343A', 'stroke-width': 2 }),
      s('path', { d: `M ${x1 + 4} ${y - r.eyeR} L ${x1 + 10} ${y - r.eyeR - 2}`, stroke: '#fff', 'stroke-width': 1.4, opacity: 0.8, 'stroke-linecap': 'round' })];
  },
});
I('m_sac_dos', 'Sac à dos', 'masculin', 'dos', 5, 'Sac à dos avec sangle de poitrine.', {
  back: (r) => [s('rect', { x: 100 - r.sw - 8, y: r.sy - 6, width: (r.sw + 8) * 2, height: r.wy - r.sy + 10, rx: 10, fill: '#2C3E63' }), s('rect', { x: 100 - r.sw - 8, y: r.wy - 10, width: (r.sw + 8) * 2, height: 6, fill: '#22314F' })],
  front: (r, ctx) => [...[-1, 1].map(sg => ctx.torso(s('rect', { x: 100 + sg * r.sw * 0.55 - 3, y: r.sy - 4, width: 6, height: r.wy - r.sy - 2, rx: 2, fill: '#2C3E63' }))),
    ctx.torso(s('rect', { x: 100 - r.sw * 0.55, y: r.sy + 16, width: r.sw * 1.1, height: 3, fill: '#C9A227' }))],
});
I('m_bomber', 'Blouson bomber', 'masculin', 'veste', 6, 'Bords côtelés, col contrasté.', {
  jacket: (r, ctx) => [band(r, ctx, r.sy - 4, r.hy + 2, '#5F6B3A'), band(r, ctx, r.hy - 6, r.hy + 2, '#4A5430'),
    ...[0, 1, 2].map(k => band(r, ctx, r.hy - 5 + k * 2.6, r.hy - 4.2 + k * 2.6, '#3E4728')), zipper(r, ctx, r.sy, r.hy - 6),
    ctx.torso(s('path', { d: `M ${100 - r.sw * 0.42} ${r.sy - 4} Q 100 ${r.sy + 8} ${100 + r.sw * 0.42} ${r.sy - 4} L ${100 + r.sw * 0.42} ${r.sy} Q 100 ${r.sy + 13} ${100 - r.sw * 0.42} ${r.sy} Z`, fill: '#D9822B' }))],
  jacketSleeve: (r, ctx) => [sleeve(r, ctx, ctx.L - 9, '#5F6B3A'), ctx.arm(s('rect', { x: -r.aw, y: ctx.L - 14, width: r.aw * 2, height: 5, fill: '#4A5430' }))],
});
I('m_bonnet', 'Bonnet côtelé', 'masculin', 'tete', 7, 'Bonnet à revers.', {
  head: (r) => {
    const yb = brow(r) - 2, w = r.hrx * 0.92, t = r.top - 9;
    return [s('path', { d: `M ${-w} ${yb} Q ${-w} ${t} 0 ${t} Q ${w} ${t} ${w} ${yb} Z`, fill: '#C9A227' }),
      ...[-0.5, -0.17, 0.17, 0.5].map(f => s('line', { x1: f * w * 1.6, y1: t + 6, x2: f * w * 1.9, y2: yb - 8, stroke: '#A8861C', 'stroke-width': 1.2 })),
      s('rect', { x: -w - 1, y: yb - 9, width: (w + 1) * 2, height: 10, rx: 4, fill: '#A8861C' })];
  },
});
I('m_kettlebell', 'Kettlebell', 'masculin', 'sol', 8, 'Kettlebell décorative posée au sol.', {
  ground: () => [s('path', { d: `M 160 ${G - 22} q 0 -12 9 -12 q 9 0 9 12`, stroke: '#2B2A28', 'stroke-width': 4, fill: 'none' }),
    s('circle', { cx: 169, cy: G - 11, r: 12, fill: '#2B2A28' }), s('rect', { x: 163, y: G - 15, width: 12, height: 6, rx: 2, fill: '#C9A227' })],
});
I('m_debardeur_large', 'Débardeur emmanchures larges', 'masculin', 'haut', 9, 'Emmanchures profondes, bande pectorale.', {
  upper: (r, ctx) => [ctx.torso(s('path', { d: `M ${100 - r.sw * 0.5} ${r.sy - 6} L ${100 - r.sw * 0.25} ${r.sy - 6} Q 100 ${r.sy + 9} ${100 + r.sw * 0.25} ${r.sy - 6} L ${100 + r.sw * 0.5} ${r.sy - 6} Q ${100 + r.sw * 0.55} ${r.wy - 18} 200 ${r.wy - 10} L 200 ${r.hy + 4} L 0 ${r.hy + 4} L 0 ${r.wy - 10} Q ${100 - r.sw * 0.55} ${r.wy - 18} ${100 - r.sw * 0.5} ${r.sy - 6} Z`, fill: '#8F969C' })),
    band(r, ctx, r.sy + 18, r.sy + 24, '#E07A5F')],
});
I('m_survetement', 'Survêtement à bandes', 'masculin', 'tenue', 10, 'Veste zippée et pantalon à double bande.', {
  upper: (r, ctx) => [band(r, ctx, r.sy - 4, r.hy + 2, '#2F5D46'), zipper(r, ctx, r.sy + 2, r.hy), band(r, ctx, r.hy - 3, r.hy + 2, '#24493A'),
    ctx.torso(s('path', { d: `M ${100 - r.sw * 0.4} ${r.sy - 5} L 100 ${r.sy + 6} L ${100 + r.sw * 0.4} ${r.sy - 5}`, stroke: '#F2EDE2', 'stroke-width': 2, fill: 'none' }))],
  sleeve: (r, ctx) => [sleeve(r, ctx, ctx.L - 8, '#2F5D46'), ...sleeveStripes(r, ctx, ctx.L - 8, '#F2EDE2')],
  legs: (r, ctx) => [legBand(r, ctx, r.hy - 12, G - 9, '#2F5D46'), ...outerLegStripes(r, ctx, r.hy - 8, G - 10, '#F2EDE2', 2)],
  lower: (r, ctx) => [lowerTorso(r, ctx, '#2F5D46')],
});

// ================= Collection non genrée =================
I('n_tshirt', 'T-shirt technique', 'neutre', 'haut', 1, 'Coupe raglan respirante.', {
  upper: (r, ctx) => [band(r, ctx, r.sy - 4, r.wy + 10, '#2E6E8E'), band(r, ctx, r.wy + 7, r.wy + 10, '#255A74'),
    ...[-1, 1].map(sg => ctx.torso(s('line', { x1: 100 + sg * r.sw * 0.3, y1: r.sy - 2, x2: 100 + sg * (r.sw + 2), y2: r.sy + 20, stroke: '#255A74', 'stroke-width': 1.3 })))],
  sleeve: (r, ctx) => [sleeve(r, ctx, 16, '#2E6E8E'), ctx.arm(s('rect', { x: -r.aw, y: 13, width: r.aw * 2, height: 3, fill: '#255A74' }))],
});
I('n_bandeau_eponge', 'Bandeau et poignets éponge', 'neutre', 'tete', 2, 'Éponge rayée, assortie aux poignets.', {
  head: (r) => {
    const y = brow(r) - 4, w = r.hrx - 1;
    return [s('path', { d: `M ${-w} ${y} Q 0 ${y - 8} ${w} ${y} L ${w} ${y + 9} Q 0 ${y + 1} ${-w} ${y + 9} Z`, fill: '#F6EFE2' }),
      s('path', { d: `M ${-w} ${y + 3} Q 0 ${y - 5} ${w} ${y + 3} L ${w} ${y + 6} Q 0 ${y - 2} ${-w} ${y + 6} Z`, fill: '#1E6F73' })];
  },
  hand: (r, ctx) => [ctx.arm(s('rect', { x: -r.aw, y: ctx.L - r.aw * 0.9 - 6, width: r.aw * 2, height: 7, fill: '#F6EFE2' })), ctx.arm(s('rect', { x: -r.aw, y: ctx.L - r.aw * 0.9 - 3.5, width: r.aw * 2, height: 2, fill: '#1E6F73' }))],
});
I('n_short_course', 'Short de course fendu', 'neutre', 'bas', 3, 'Court, fendu sur le côté, bande réfléchissante.', {
  legs: (r, ctx) => [legBand(r, ctx, r.hy - 12, thigh(r) + 2, '#2B2A28'), legBand(r, ctx, thigh(r) - 3, thigh(r) - 1, '#D8D1C4'),
    ...[-1, 1].map(sg => s('path', { d: `M ${100 + sg * (r.lx + r.lw / 2)} ${thigh(r) + 2} l ${-sg * 4} -7 l ${-sg * 0} 7 Z`, fill: '#F2E6CF' }))],
  lower: (r, ctx) => [lowerTorso(r, ctx, '#2B2A28')],
});
I('n_lunettes_rondes', 'Lunettes rondes', 'neutre', 'lunettes', 4, 'Monture fine et ronde.', {
  face: (r) => {
    const e = r.eyeR + 4.5;
    return [s('circle', { cx: -r.eyeDX, cy: r.eyeY, r: e, fill: 'rgba(255,255,255,.15)', stroke: '#A8862A', 'stroke-width': 2 }),
      s('circle', { cx: r.eyeDX, cy: r.eyeY, r: e, fill: 'rgba(255,255,255,.15)', stroke: '#A8862A', 'stroke-width': 2 }),
      s('path', { d: `M ${-r.eyeDX + e} ${r.eyeY} Q 0 ${r.eyeY - 4} ${r.eyeDX - e} ${r.eyeY}`, stroke: '#A8862A', 'stroke-width': 1.8, fill: 'none' })];
  },
});
I('n_gourde', 'Gourde isotherme', 'neutre', 'main', 5, 'Gourde tenue dans la main gauche.', {
  hand: (r, ctx, side) => side !== 'L' ? [] : [s('rect', { x: -6, y: ctx.L - 6, width: 12, height: 24, rx: 4, fill: '#0F5560' }),
    s('rect', { x: -4.5, y: ctx.L - 11, width: 9, height: 6, rx: 2, fill: '#C9A227' }), s('rect', { x: -6, y: ctx.L + 6, width: 12, height: 3, fill: '#E07A5F' }),
    s('circle', { cx: 0, cy: ctx.L, r: r.aw * 0.62, fill: ctx.paw })],
});
I('n_coupe_vent', 'Coupe-vent bicolore', 'neutre', 'veste', 6, 'Empiècement en chevron, col montant.', {
  jacket: (r, ctx) => [band(r, ctx, r.sy - 4, r.hy, '#E9C46A'),
    ctx.torso(s('path', { d: `M 0 ${r.sy + 14} L 100 ${r.sy + 30} L 200 ${r.sy + 14} L 200 ${r.sy + 24} L 100 ${r.sy + 40} L 0 ${r.sy + 24} Z`, fill: '#1E6F73' })),
    zipper(r, ctx, r.sy, r.hy - 2, '#8B6E1A'), band(r, ctx, r.hy - 4, r.hy, '#C9A227')],
  jacketSleeve: (r, ctx) => [sleeve(r, ctx, ctx.L - 9, '#E9C46A'), ctx.arm(s('rect', { x: -r.aw, y: ctx.L - 14, width: r.aw * 2, height: 5, fill: '#1E6F73' }))],
});
I('n_bob', 'Bob à carreaux', 'neutre', 'tete', 7, 'Bob à bord large.', {
  head: (r) => {
    const y = brow(r) - 1, w = r.hrx * 0.8, t = r.top - 6;
    const lines = [];
    for (let x = -w + 6; x < w; x += 7) lines.push(s('line', { x1: x, y1: t + 4, x2: x, y2: y - 2, stroke: '#8A7F55', 'stroke-width': 0.9 }));
    return [s('path', { d: `M ${-w} ${y - 1} L ${-w * 0.8} ${t + 2} Q 0 ${t - 3} ${w * 0.8} ${t + 2} L ${w} ${y - 1} Z`, fill: '#A89B6C' }), ...lines,
      s('ellipse', { cx: 0, cy: y, rx: w + 11, ry: 5.5, fill: '#958859' })];
  },
});
I('n_velo', 'Vélo', 'neutre', 'sol', 8, 'Petit vélo de ville posé à côté.', {
  ground: () => {
    const y = G - 13, c = '#0F5560';
    return [s('circle', { cx: 18, cy: y, r: 12, fill: 'none', stroke: ink, 'stroke-width': 2.4 }), s('circle', { cx: 56, cy: y, r: 12, fill: 'none', stroke: ink, 'stroke-width': 2.4 }),
      s('path', { d: `M 18 ${y} L 32 ${y - 18} L 50 ${y - 18} L 56 ${y} M 32 ${y - 18} L 38 ${y} L 50 ${y - 18} M 18 ${y} L 38 ${y}`, stroke: c, 'stroke-width': 2.6, fill: 'none', 'stroke-linejoin': 'round' }),
      s('path', { d: `M 30 ${y - 22} l 6 0 M 50 ${y - 18} l -2 -7 l 6 0`, stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' })];
  },
});
I('n_sweat_capuche', 'Sweat à capuche', 'neutre', 'veste', 9, 'Poche kangourou, cordons.', {
  hood: (r) => [s('ellipse', { cx: 0, cy: r.hry * 0.62, rx: r.hrx + 4, ry: r.hry * 0.55, fill: '#B9A98C' })],
  jacket: (r, ctx) => [band(r, ctx, r.sy - 4, r.hy + 2, '#CDBFA6'), band(r, ctx, r.hy - 4, r.hy + 2, '#B9A98C'),
    ctx.torso(s('path', { d: `M ${100 - r.ww * 0.55} ${r.wy + 2} L ${100 + r.ww * 0.55} ${r.wy + 2} L ${100 + r.ww * 0.65} ${r.hy - 6} L ${100 - r.ww * 0.65} ${r.hy - 6} Z`, fill: '#B9A98C' })),
    ctx.torso(s('path', { d: `M 96 ${r.sy - 2} l -1 18 M 104 ${r.sy - 2} l 1 18`, stroke: '#F6EFE2', 'stroke-width': 1.6, 'stroke-linecap': 'round' }))],
  jacketSleeve: (r, ctx) => [sleeve(r, ctx, ctx.L - 8, '#CDBFA6'), ctx.arm(s('rect', { x: -r.aw, y: ctx.L - 13, width: r.aw * 2, height: 5, fill: '#B9A98C' }))],
});
I('n_tenue_cycliste', 'Tenue de cycliste', 'neutre', 'tenue', 10, 'Maillot à bande, cuissard et mitaines.', {
  upper: (r, ctx) => [band(r, ctx, r.sy - 4, r.hy - 2, '#1E6F73'), band(r, ctx, r.sy + 18, r.sy + 27, '#E9C46A'), band(r, ctx, r.sy + 27, r.sy + 29, '#E07A5F'), zipper(r, ctx, r.sy, r.sy + 16)],
  sleeve: (r, ctx) => [sleeve(r, ctx, 15, '#1E6F73'), ctx.arm(s('rect', { x: -r.aw, y: 11, width: r.aw * 2, height: 4, fill: '#E9C46A' }))],
  hand: (r, ctx) => [s('path', { d: `M ${-r.aw * 0.62} ${ctx.L} a ${r.aw * 0.62} ${r.aw * 0.62} 0 0 1 ${r.aw * 1.24} 0 Z`, fill: '#2B2A28' })],
  legs: (r, ctx) => [legBand(r, ctx, r.hy - 12, thigh(r) + 8, '#2B2A28'), legBand(r, ctx, thigh(r) + 5, thigh(r) + 8, '#E9C46A')],
  lower: (r, ctx) => [lowerTorso(r, ctx, '#2B2A28', r.hy - 8)],
});

// ================= Décors =================
const D = (id, name, level, drawDecor, desc) => I(id, name, 'decor', 'decor', level, desc, {}, { drawDecor });
const frame = (fill) => s('rect', { x: 6, y: 14, width: 188, height: 214, rx: 26, fill });
D('d_halo', 'Halo chaleureux', 1, () => [s('ellipse', { cx: 100, cy: 128, rx: 92, ry: 104, fill: 'var(--c-halo, #F1E6D2)' }), s('ellipse', { cx: 100, cy: 128, rx: 80, ry: 92, fill: 'none', stroke: 'var(--line, #E6D5B8)', 'stroke-width': 2 })], 'Fond doux, adapté au mode sombre.');
D('d_salle', 'Salle de sport', 2, () => [frame('#E3E9E4'), s('rect', { x: 6, y: 150, width: 188, height: 8, fill: '#0F5560', opacity: 0.25 }),
  ...[0, 1, 2, 3, 4, 5, 6].map(k => s('line', { x1: 20, y1: 40 + k * 22, x2: 44, y2: 40 + k * 22, stroke: '#B5926A', 'stroke-width': 3 })),
  s('line', { x1: 20, y1: 30, x2: 20, y2: 222, stroke: '#B5926A', 'stroke-width': 3 }), s('line', { x1: 44, y1: 30, x2: 44, y2: 222, stroke: '#B5926A', 'stroke-width': 3 })], 'Espalier et mur clair.');
D('d_parc', 'Parc', 4, () => [frame('#DCEBEA'), s('path', { d: 'M 6 190 Q 70 160 194 182 L 194 228 L 6 228 Z', fill: '#9CC49A' }),
  s('rect', { x: 162, y: 120, width: 6, height: 60, fill: '#7A5A3E' }), s('circle', { cx: 165, cy: 112, r: 22, fill: '#6E9B6F' }), s('circle', { cx: 150, cy: 124, r: 14, fill: '#5E8A60' })], 'Herbe, arbre et ciel clair.');
D('d_mer', 'Bord de mer', 6, () => [frame('#E4F0F0'), s('rect', { x: 6, y: 150, width: 188, height: 30, fill: '#5FA3A8' }),
  s('path', { d: 'M 6 158 q 12 -5 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 20 0', stroke: '#E4F0F0', 'stroke-width': 1.6, fill: 'none' }), s('path', { d: 'M 6 180 L 194 176 L 194 228 L 6 228 Z', fill: '#EED9B2' })], 'Mer et sable.');
D('d_montagne', 'Montagne', 8, () => [frame('#E7EEF2'), s('path', { d: 'M 6 200 L 60 90 L 104 170 L 140 110 L 194 196 L 194 228 L 6 228 Z', fill: '#7D8F96' }),
  s('path', { d: 'M 60 90 L 48 114 L 58 110 L 64 118 L 72 112 Z M 140 110 L 130 128 L 140 124 L 148 130 Z', fill: '#FFFDF8' }), s('path', { d: 'M 6 206 Q 100 190 194 206 L 194 228 L 6 228 Z', fill: '#8DAA86' })], 'Sommets enneigés.');
D('d_studio', 'Studio lumineux', 10, () => [frame('#F4E7D3'), s('rect', { x: 128, y: 36, width: 50, height: 62, rx: 6, fill: '#DCEBEA', stroke: '#C2A985', 'stroke-width': 3 }),
  s('line', { x1: 153, y1: 36, x2: 153, y2: 98, stroke: '#C2A985', 'stroke-width': 2 }), ...[0, 1, 2, 3, 4].map(k => s('line', { x1: 6, y1: 196 + k * 7, x2: 194, y2: 196 + k * 7, stroke: '#D9BF97', 'stroke-width': 1.2 })),
  s('path', { d: 'M 168 196 q -10 -26 0 -40 q 10 14 0 40 Z', fill: '#6E9B6F' }), s('rect', { x: 160, y: 190, width: 16, height: 14, rx: 2, fill: '#B5674A' })], 'Fenêtre, parquet et plante.');

export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const MAX_LEVEL = 10;
export function itemsUpToLevel(level) { return ITEMS.filter(i => i.level <= level).map(i => i.id); }
export function itemsAtLevel(level) { return ITEMS.filter(i => i.level === level); }
