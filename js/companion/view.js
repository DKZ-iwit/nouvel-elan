// Affichage du compagnon dans les écrans : animations (désactivables), réactions et célébrations.
import { h } from '../util.js';
import { companionSVG, stageOf, reactionsFor, ANIMALS } from './art.js';

const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const animationsOn = (comp) => !!comp && comp.animations !== false && !reduced();

export function companionName(comp) {
  return comp && comp.name ? comp.name : (comp ? ANIMALS[comp.animal]?.label || 'Compagnon' : 'Compagnon');
}

// Rend le compagnon. reaction : 'joie' | 'salut' | 'pouce' | 'victoire' (si animations actives, mouvement court ;
// sinon pose et expression statiques correspondantes).
export function renderCompanion(comp, { level = 1, reaction = null, decor = true, cls = '', tryOn, pose, expression, title } = {}) {
  const stage = stageOf(level);
  let ex = expression, po = pose;
  if (reaction) {
    const opts = reactionsFor(stage);
    const pick = reaction === 'auto' ? opts[opts.length - 1] : (opts.find(o => o[1] === reaction) || opts[opts.length - 1]);
    ex = ex || pick[0]; po = po || pick[1];
  }
  const anim = animationsOn(comp);
  const svg = companionSVG(comp, {
    stage, expression: ex, pose: po, decor, tryOn,
    cls: `${anim ? 'anim' : ''} ${anim && reaction ? 'react-' + (po === 'repos' ? 'joie' : po) : ''} ${cls}`,
    title: title || `${companionName(comp)}, ${ANIMALS[comp.animal]?.label.toLowerCase() || ''}`,
  });
  return svg;
}

// Petite réaction sur un compagnon déjà affiché (série validée…). Ne bloque rien.
export function react(host, comp, level, reaction = 'joie') {
  if (!host || !comp) return;
  const next = renderCompanion(comp, { level, reaction, decor: false, cls: host.firstElementChild?.getAttribute('class')?.includes('mini') ? 'mini' : '' });
  host.replaceChildren(next);
  if (animationsOn(comp)) setTimeout(() => { if (host.isConnected) host.replaceChildren(renderCompanion(comp, { level, decor: false })); }, 1600);
}

// Célébration courte (passage de niveau) : confettis CSS, aucune attente imposée.
export function confetti(host, comp) {
  if (!host || !animationsOn(comp)) return;
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  const cols = ['#0F5560', '#D9654A', '#C9A227', '#6E9B6F'];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, d = 70 + (i % 5) * 18;
    layer.append(h('i', { style: { background: cols[i % 4], '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 30}px`, animationDelay: `${(i % 6) * 40}ms` } }));
  }
  host.classList.add('confetti-host');
  host.append(layer);
  setTimeout(() => layer.remove(), 1700);
}
