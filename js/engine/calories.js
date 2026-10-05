// Estimation des calories d'activité. Module pur (sans DOM), testable.
//
// Convention affichée : calories ACTIVES = dépense de l'activité au-delà de la dépense de repos.
//   kcal actives ≈ (MET − 1) × poids (kg) × durée (h)          (1 MET ≈ 1 kcal·kg⁻¹·h⁻¹)
//   Pour la marche et la course avec vitesse et pente connues : équations métaboliques de l'ACSM,
//   en retirant la composante de repos (3,5 mL·kg⁻¹·min⁻¹) et avec ≈ 5 kcal par litre d'O₂.
// Sources des coefficients : voir README (Compendium of Physical Activities, ACSM, Bourne et al. 2018).

import { daysBetween } from '../util.js';

// Valeurs MET par activité et intensité déclarée.
export const MET_TABLE = {
  marche: { legere: 3.0, moderee: 3.5, soutenue: 4.3 },
  randonnee: { legere: 4.5, moderee: 6.0, soutenue: 7.0 },
  course: { legere: 7.0, moderee: 8.3, soutenue: 9.8 },
  velo: { legere: 4.0, moderee: 6.8, soutenue: 8.0 },
  velo_electrique: { legere: 3.5, moderee: 4.5, soutenue: 6.0 },
  natation: { legere: 5.8, moderee: 7.0, soutenue: 9.8 },
  velo_salle: { legere: 3.5, moderee: 6.8, soutenue: 8.8 },
  elliptique: { legere: 4.0, moderee: 5.0, soutenue: 6.5 },
  rameur: { legere: 4.8, moderee: 7.0, soutenue: 8.5 },
  musculation: { legere: 3.5, moderee: 3.5, soutenue: 5.0 },
};

// Ajustement du vélo électrique selon le niveau d'assistance déclaré (MET).
export const EBIKE_ASSIST_ADJ = { forte: -0.5, moyenne: 0, faible: 0.5, aucune: 1.0 };

// Incertitude relative indicative selon la méthode.
const UNCERTAINTY = { acsm: 0.15, met: 0.25, met_speed: 0.2, strength: 0.4 };

const STALE_WEIGHT_DAYS = 30;

// Dernier poids connu à la date (jamais un poids postérieur).
export function weightAt(measurements, dateISO) {
  const ws = (measurements || []).filter(m => m.type === 'poids' && m.value && m.date <= dateISO)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!ws.length) return null;
  const m = ws[0];
  const age = daysBetween(m.date, dateISO);
  return { kg: m.value, date: m.date, approx: !!m.approx, ageDays: age, stale: age > STALE_WEIGHT_DAYS };
}

function walkMetBySpeed(kmh) {
  if (kmh < 3.2) return 2.8;
  if (kmh < 4.5) return 3.0;
  if (kmh < 5.2) return 3.5;
  if (kmh < 6.0) return 4.3;
  if (kmh < 7.0) return 5.0;
  return 7.0;
}

// ACSM : retourne kcal actives par minute
function acsmActivePerMin(kmh, inclinePct, kg, mode) {
  const S = kmh * 1000 / 60; // m/min
  const G = (inclinePct || 0) / 100;
  const vo2net = mode === 'course' ? (0.2 * S + 0.9 * S * G) : (0.1 * S + 1.8 * S * G); // hors repos
  return vo2net * kg / 1000 * 5;
}

function result(kcal, method, weight, extra = {}) {
  const u = UNCERTAINTY[method] ?? 0.3;
  return {
    kind: 'estimation', convention: 'actives', kcal, low: kcal * (1 - u), high: kcal * (1 + u), method,
    weight, ...extra,
  };
}
function unknown(reason) { return { kind: 'inconnue', kcal: null, reason }; }
function manual(c) {
  return { kind: 'saisie', kcal: c.value, convention: c.convention || 'inconnue', source: c.source || null };
}

// Estimation par vitesse/pente ou MET pour un effort de locomotion.
// p : { type, durationMin, speedKmh, inclinePct, intensity, assistLevel }
export function estimateEffort(p, weight) {
  if (!p.durationMin || p.durationMin <= 0) return unknown('Durée inconnue');
  if (!weight) return unknown('Poids inconnu à cette date');
  const kg = weight.kg, h = p.durationMin / 60;
  const t = p.type;

  if ((t === 'marche' || t === 'marche_tapis' || t === 'tapis_incline') && p.speedKmh) {
    if (p.inclinePct !== null && p.inclinePct !== undefined && p.speedKmh >= 3 && p.speedKmh <= 6.5) {
      return result(acsmActivePerMin(p.speedKmh, p.inclinePct, kg, 'marche') * p.durationMin, 'acsm', weight);
    }
    if (p.inclinePct === null || p.inclinePct === undefined) {
      if (t === 'tapis_incline') return p.intensity ? result((MET_TABLE.marche[p.intensity] - 1) * kg * h, 'met', weight) : unknown('Inclinaison inconnue');
      return result((walkMetBySpeed(p.speedKmh) - 1) * kg * h, 'met_speed', weight);
    }
    return result((walkMetBySpeed(p.speedKmh) - 1) * kg * h, 'met_speed', weight);
  }
  if (t === 'course' && p.speedKmh && p.speedKmh >= 8) {
    return result(acsmActivePerMin(p.speedKmh, p.inclinePct || 0, kg, 'course') * p.durationMin, 'acsm', weight);
  }
  const tableKey = { marche_tapis: 'marche', tapis_incline: 'marche', marche: 'marche' }[t] || t;
  const table = MET_TABLE[tableKey];
  if (!table) return unknown('Activité sans référence de calcul');
  if (!p.intensity) {
    return unknown(t === 'velo_electrique' ? 'Effort non renseigné : la vitesse seule ne permet pas d’estimer l’effort à vélo électrique' : 'Intensité non renseignée');
  }
  let met = table[p.intensity];
  if (t === 'velo_electrique') met = Math.max(2.5, met + (EBIKE_ASSIST_ADJ[p.assistLevel] ?? 0));
  return result((met - 1) * kg * h, 'met', weight);
}

// Activité hors salle
export function activityCalories(act, measurements) {
  if (act.calories && act.calories.value !== null && act.calories.value !== undefined) return manual(act.calories);
  const weight = weightAt(measurements, act.date);
  const speed = act.distanceKm && act.durationMin ? act.distanceKm / (act.durationMin / 60) : null;
  const useSpeed = (act.type === 'marche' || act.type === 'course') ? speed : null;
  return estimateEffort({
    type: act.type, durationMin: act.durationMin, speedKmh: useSpeed, inclinePct: act.type === 'marche' || act.type === 'course' ? null : undefined,
    intensity: act.intensity, assistLevel: act.assistLevel,
  }, weight);
}

const CARDIO_TO_EFFORT = { marche: 'marche', marche_tapis: 'marche_tapis', tapis_incline: 'tapis_incline', course: 'course', velo: 'velo_salle', elliptique: 'elliptique', rameur: 'rameur', autre: 'autre' };

export function cardioEntryCalories(entry, weight) {
  if (entry.calories && entry.calories.value !== null && entry.calories.value !== undefined) return manual(entry.calories);
  return estimateEffort({
    type: CARDIO_TO_EFFORT[entry.cardioType] || 'autre', durationMin: entry.durationIsMinimum ? null : entry.durationMin,
    speedKmh: entry.speedKmh, inclinePct: entry.inclinePct, intensity: entry.intensity,
  }, weight);
}

// Séance en salle. Si une valeur globale est saisie, elle remplace tout (segments non ajoutés).
export function sessionCalories(session, measurements) {
  if (session.calories && session.calories.value !== null && session.calories.value !== undefined) {
    return { ...manual(session.calories), parts: [], partial: false };
  }
  const weight = weightAt(measurements, session.date);
  const parts = [];
  const cardio = (session.entries || []).filter(e => e.kind === 'cardio');
  const strength = (session.entries || []).filter(e => e.kind !== 'cardio');
  for (const c of cardio) parts.push({ label: c.name, ...cardioEntryCalories(c, weight) });
  if (strength.length) {
    let strengthMin = null;
    const cardioKnown = cardio.every(c => c.durationMin && !c.durationIsMinimum);
    if (session.durationMin && cardioKnown) {
      strengthMin = session.durationMin - cardio.reduce((a, c) => a + c.durationMin, 0);
    }
    const intensity = { facile: 'legere', adaptee: 'moderee', difficile: 'soutenue' }[session.difficulty] || null;
    let r;
    if (!session.durationMin) r = unknown('Durée de séance inconnue');
    else if (!cardioKnown) r = unknown('Durée du cardio incomplète : la part musculation ne peut pas être isolée');
    else if (!intensity) r = unknown('Difficulté globale non renseignée');
    else if (!weight) r = unknown('Poids inconnu à cette date');
    else if (strengthMin <= 0) r = unknown('Durée de musculation incohérente');
    else r = { ...result((MET_TABLE.musculation[intensity] - 1) * weight.kg * strengthMin / 60, 'strength', weight) };
    parts.push({ label: 'Musculation', ...r });
  }
  const agg = aggregate(parts);
  return { kind: agg.known ? 'estimation' : 'inconnue', convention: 'actives', kcal: agg.active, low: agg.low, high: agg.high, partial: agg.unknownCount > 0, parts, other: agg.other, weight };
}

// Agrège des résultats : seules les valeurs « actives » s'additionnent ; les autres conventions sont
// comptées à part ; les inconnues ne deviennent jamais des zéros.
export function aggregate(results) {
  let active = 0, low = 0, high = 0, other = 0, unknownCount = 0, known = 0, hasEstimate = false, hasManual = false;
  for (const r of results) {
    if (r && r.other) { other += r.other; hasManual = true; }
    if (!r || r.kcal === null || r.kcal === undefined) { unknownCount++; continue; }
    if (r.convention === 'actives') {
      active += r.kcal; low += r.low ?? r.kcal; high += r.high ?? r.kcal; known++;
      if (r.kind === 'saisie') hasManual = true; else hasEstimate = true;
      if (r.partial) unknownCount++;
    } else { other += r.kcal; known++; hasManual = true; }
  }
  return { active: known ? active : null, low, high, other, unknownCount, known, hasEstimate, hasManual };
}

export function roundKcal(k) {
  if (k === null || k === undefined) return null;
  if (k < 50) return Math.round(k / 5) * 5;
  return Math.round(k / 10) * 10;
}
