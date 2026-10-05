// Libellés et formats partagés par les vues.
import { h, fmtNum, fmtDate, daysBetween, todayISO } from '../util.js';
import { roundKcal } from '../engine/calories.js';
import { GOALS } from '../data/programs.js';

export const GOAL_OPTIONS = Object.fromEntries(Object.entries(GOALS).map(([k, g]) => [k, g.label]));

export const MEASURE_TYPES = {
  poids: { label: 'Poids', unit: 'kg' },
  masse_grasse_pct: { label: 'Masse grasse', unit: '%' },
  masse_musculaire: { label: 'Masse musculaire', unit: 'kg' },
  tour_taille: { label: 'Tour de taille', unit: 'cm' },
  tour_hanches: { label: 'Tour de hanches', unit: 'cm' },
  tour_poitrine: { label: 'Tour de poitrine', unit: 'cm' },
  tour_bras: { label: 'Tour de bras', unit: 'cm' },
  tour_cuisse: { label: 'Tour de cuisse', unit: 'cm' },
};
export const MEASURE_SOURCES = { balance: 'Balance', montre: 'Montre', ruban: 'Mètre ruban', autre: 'Autre' };
export const KCAL_CONVENTIONS = { actives: 'Calories actives (hors repos)', totales: 'Calories totales (repos inclus)', inconnue: 'Je ne sais pas' };
export const KCAL_SOURCES = { montre: 'Montre', appareil: 'Appareil de la salle', application: 'Autre application', autre: 'Autre' };
export const ENERGY = { forme: 'En forme', moyen: 'Moyen', fatigue: 'Fatigué' };
export const SESSION_DIFFICULTY = { facile: 'Trop facile', adaptee: 'Adaptée', difficile: 'Trop difficile' };
export const ASSIST_LEVELS = { aucune: 'Aucune', faible: 'Faible', moyenne: 'Moyenne', forte: 'Forte' };

export function estimateLabel(m) {
  // Mesures de balance ou montre : estimations déclarées
  if (m.source === 'montre' || m.source === 'balance') return `estimation ${m.source === 'montre' ? 'de la montre' : 'de la balance'}`;
  return m.approx ? 'approximatif' : '';
}

export function measureValue(m) {
  const t = MEASURE_TYPES[m.type] || { unit: '' };
  return `${m.approx ? '≈ ' : ''}${fmtNum(m.value, 1)} ${t.unit}`;
}

export function latest(measurements, type) {
  return (measurements || []).filter(m => m.type === type && m.value !== null).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function targetLabel(t) {
  if (t.min && t.max) return `${fmtNum(t.min, 1)} à ${fmtNum(t.max, 1)} kg`;
  return `${fmtNum(t.value, 1)} kg`;
}

export function nextMilestone(profile, weightKg) {
  const ts = (profile.weightTargets || []).slice();
  if (!ts.length || weightKg === null || weightKg === undefined) return null;
  const val = (t) => t.max || t.value;
  const losing = ts.every(t => val(t) <= weightKg) || ts.some(t => val(t) < weightKg);
  if (losing) {
    const next = ts.filter(t => val(t) < weightKg).sort((a, b) => val(b) - val(a))[0];
    return next || null;
  }
  return ts.filter(t => val(t) > weightKg).sort((a, b) => val(a) - val(b))[0] || null;
}

// Texte d'un résultat agrégé de calories
export function kcalAggText(agg) {
  if (!agg || agg.active === null || agg.active === undefined) {
    return agg && agg.other ? `${fmtNum(roundKcal(agg.other), 0)} kcal (convention différente)` : 'Inconnues';
  }
  return `≈ ${fmtNum(roundKcal(agg.active), 0)} kcal`;
}

export function kcalAggNotes(agg) {
  const n = [];
  if (!agg) return n;
  if (agg.unknownCount > 0) n.push(`Total partiel : ${agg.unknownCount} élément(s) sans valeur.`);
  if (agg.other) n.push(`${fmtNum(roundKcal(agg.other), 0)} kcal saisies dans une autre convention ou une convention inconnue, non additionnées.`);
  if (agg.hasEstimate && agg.hasManual) n.push('Mélange de valeurs saisies et d’estimations.');
  else if (agg.hasEstimate) n.push('Estimations approximatives.');
  return n;
}

export function kcalResultText(r) {
  if (!r || r.kcal === null || r.kcal === undefined) return r && r.reason ? `Inconnues : ${r.reason.toLowerCase()}` : 'Inconnues';
  if (r.kind === 'saisie') return `${fmtNum(r.kcal, 0)} kcal saisies (${r.convention === 'actives' ? 'actives' : r.convention === 'totales' ? 'totales, repos inclus' : 'convention inconnue'})`;
  const low = roundKcal(r.low), high = roundKcal(r.high);
  return `≈ ${fmtNum(roundKcal(r.kcal), 0)} kcal actives (fourchette ${fmtNum(low, 0)}–${fmtNum(high, 0)})${r.partial ? ', total partiel' : ''}`;
}

export function weightNote(w, date) {
  if (!w) return 'Aucun poids connu à cette date.';
  const age = daysBetween(w.date, date || todayISO());
  const t = `Poids utilisé : ${w.approx ? '≈ ' : ''}${fmtNum(w.kg, 1)} kg, mesuré le ${fmtDate(w.date)}${w.stale || age > 30 ? ' (mesure ancienne)' : ''}`;
  return t.endsWith('.') ? t : t + '.';
}

export function profileChip(p, onclick) {
  return h('button', { type: 'button', class: 'profile-chip', onclick, 'aria-label': `Profil actif : ${p.name}. Changer de profil` },
    h('span', { class: 'avatar', style: { background: p.color }, 'aria-hidden': 'true' }, p.avatar || p.name.slice(0, 1)),
    h('span', { text: p.name }));
}
