// Indicateurs de suivi. Module pur (sans DOM).
import { addDays, weekStart, daysBetween, parseISO } from '../util.js';
import { sessionCalories, activityCalories, aggregate } from './calories.js';

export const doneSessions = (sessions) => (sessions || []).filter(s => s.status === 'done');

// Clé de comparaison : même exercice + même équipement/variante lorsque renseigné.
export function exKey(entry) {
  const v = [entry.variant, entry.equipmentNote].filter(Boolean).join(' / ').trim().toLowerCase();
  return entry.exerciseId + (v ? '|' + v : '');
}

export function hasValue(set) {
  return (set.reps !== null && set.reps !== undefined) || (set.seconds !== null && set.seconds !== undefined);
}

// Séries de travail (échauffement exclu par défaut)
export function workSets(entry, { includeWarmup = false } = {}) {
  return (entry.sets || []).filter(st => hasValue(st) && (includeWarmup || st.type !== 'warmup'));
}

// Volume = séries × répétitions × charge, uniquement quand la charge a un sens additif.
// Haltères : charge par haltère × 2 pour un exercice bilatéral.
export function entryVolume(entry, ex) {
  if (!ex || entry.kind === 'cardio') return null;
  if (entry.setsCountKnown === false) return null;
  if (!['total', 'per_dumbbell'].includes(ex.load)) return null;
  const mult = ex.load === 'per_dumbbell' && !ex.unilateral ? 2 : 1;
  const ws = workSets(entry);
  if (!ws.length) return null;
  if (ws.some(st => st.load === null || st.load === undefined || st.reps === null || st.reps === undefined)) return null;
  return ws.reduce((a, st) => a + st.load * st.reps * mult, 0);
}

export function sessionVolume(session, getEx) {
  let total = 0, partial = false, any = false;
  for (const e of session.entries || []) {
    if (e.kind === 'cardio') continue;
    const ex = getEx(e.exerciseId);
    if (!ex || !['total', 'per_dumbbell'].includes(ex.load)) continue;
    const v = entryVolume(e, ex);
    if (v === null) partial = true; else { total += v; any = true; }
  }
  return { volume: any ? total : null, partial };
}

export function workSetCount(session) {
  let n = 0, unknown = 0;
  for (const e of session.entries || []) {
    if (e.kind === 'cardio') continue;
    if (e.setsCountKnown === false) unknown++;
    else n += workSets(e).length;
  }
  return { n, unknown };
}

// Résumé d'une entrée pour l'affichage : « 1 × 10 à 33 kg, 2 × 10 à 40 kg »
export function summarizeSets(entry, ex, { fmt }) {
  const ws = workSets(entry);
  if (!ws.length) return 'Aucune série de travail';
  const groups = [];
  for (const st of ws) {
    const k = `${st.reps ?? ''}|${st.load ?? ''}|${st.seconds ?? ''}`;
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.n++; else groups.push({ k, n: 1, st });
  }
  const unit = ex && ex.load === 'assist' ? ' d’assistance' : '';
  const txt = groups.map(({ n, st }) => {
    const cnt = entry.setsCountKnown === false ? '' : `${n} × `;
    if (st.seconds !== null && st.seconds !== undefined) return `${cnt}${fmt(st.seconds, 0)} s${st.load ? ` à ${fmt(st.load, 2)} kg` : ''}`;
    if (st.load !== null && st.load !== undefined) return `${cnt}${st.reps} à ${fmt(st.load, 2)} kg${unit}`;
    return `${cnt}${st.reps} rép.`;
  }).join(', ');
  return entry.setsCountKnown === false ? `${txt} (nombre de séries non précisé)` : txt;
}

// Historique d'un exercice (clé de comparaison) : un point par séance.
export function exerciseSeries(sessions, key, ex) {
  const pts = [];
  for (const s of doneSessions(sessions)) {
    for (const e of s.entries || []) {
      if (e.kind === 'cardio' || exKey(e) !== key) continue;
      const ws = workSets(e);
      if (!ws.length) continue;
      const loads = ws.map(st => st.load).filter(v => v !== null && v !== undefined);
      const secs = ws.map(st => st.seconds).filter(v => v !== null && v !== undefined);
      let top = null, repsAtTop = null;
      if (loads.length) {
        top = ex && ex.load === 'assist' ? Math.min(...loads) : Math.max(...loads);
        repsAtTop = Math.max(...ws.filter(st => st.load === top).map(st => st.reps ?? 0));
      }
      pts.push({
        date: s.date, sessionId: s.id, top, repsAtTop, seconds: secs.length ? Math.max(...secs) : null,
        reps: Math.max(...ws.map(st => st.reps ?? 0)), volume: entryVolume(e, ex), setsKnown: e.setsCountKnown !== false,
        sets: ws.length,
      });
    }
  }
  return pts.sort((a, b) => a.date.localeCompare(b.date));
}

// Clés d'exercices présentes dans l'historique
export function exerciseKeys(sessions) {
  const map = new Map();
  for (const s of doneSessions(sessions)) for (const e of s.entries || []) {
    if (e.kind === 'cardio') continue;
    const k = exKey(e);
    const cur = map.get(k) || { key: k, exerciseId: e.exerciseId, name: e.name, variant: [e.variant, e.equipmentNote].filter(Boolean).join(' / '), count: 0, last: '' };
    cur.count++; if (s.date > cur.last) cur.last = s.date;
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}

// Records personnels. Définitions :
//  - charge : charge la plus lourde sur une série de travail (répétitions associées indiquées) ;
//  - assistance : assistance la plus faible sur une série de travail (à égalité, le plus de répétitions) ;
//  - durée : plus longue série chronométrée ;
//  - répétitions : plus grand nombre de répétitions sur une série (exercices au poids du corps) ;
//  - volume : volume le plus élevé sur une séance pour l'exercice (séries connues uniquement).
export function personalRecords(sessions, getEx) {
  const recs = new Map();
  const ordered = doneSessions(sessions).slice().sort((a, b) => a.date.localeCompare(b.date));
  for (const s of ordered) for (const e of s.entries || []) {
    if (e.kind === 'cardio') continue;
    const ex = getEx(e.exerciseId); if (!ex) continue;
    const k = exKey(e);
    const r = recs.get(k) || { key: k, name: e.name, variant: [e.variant, e.equipmentNote].filter(Boolean).join(' / '), exerciseId: e.exerciseId };
    for (const st of workSets(e)) {
      if (ex.load === 'assist' && st.load !== null && st.load !== undefined) {
        if (!r.assist || st.load < r.assist.value || (st.load === r.assist.value && (st.reps ?? 0) > (r.assist.reps ?? 0))) r.assist = { value: st.load, reps: st.reps, date: s.date };
      } else if (st.seconds !== null && st.seconds !== undefined) {
        if (!r.time || st.seconds > r.time.value) r.time = { value: st.seconds, date: s.date };
      } else if (st.load !== null && st.load !== undefined) {
        if (!r.load || st.load > r.load.value || (st.load === r.load.value && (st.reps ?? 0) > r.load.reps)) r.load = { value: st.load, reps: st.reps, date: s.date };
      } else if (st.reps) {
        if (!r.reps || st.reps > r.reps.value) r.reps = { value: st.reps, date: s.date };
      }
    }
    const v = entryVolume(e, ex);
    if (v !== null && (!r.volume || v > r.volume.value)) r.volume = { value: v, date: s.date };
    recs.set(k, r);
  }
  return [...recs.values()];
}

// Répartition des séries de travail par groupe musculaire :
// 1 série pour chaque muscle principal, 0,5 pour chaque muscle secondaire.
export function muscleDistribution(sessions, getEx, from, to) {
  const out = {}; let unknownEntries = 0;
  for (const s of doneSessions(sessions)) {
    if (s.date < from || s.date > to) continue;
    for (const e of s.entries || []) {
      if (e.kind === 'cardio') continue;
      const ex = getEx(e.exerciseId); if (!ex) continue;
      if (e.setsCountKnown === false) { unknownEntries++; continue; }
      const n = workSets(e).length;
      for (const m of ex.primary) out[m] = (out[m] || 0) + n;
      for (const m of ex.secondary) out[m] = (out[m] || 0) + n * 0.5;
    }
  }
  delete out.cardio;
  return { counts: out, unknownEntries };
}

// Minutes actives d'une séance : durée connue, sinon somme des segments cardio connus (partiel).
export function sessionMinutes(s) {
  if (s.durationMin) return { min: s.durationMin, partial: false };
  const known = (s.entries || []).filter(e => e.kind === 'cardio' && e.durationMin).reduce((a, e) => a + e.durationMin, 0);
  const hasStrength = (s.entries || []).some(e => e.kind !== 'cardio');
  const minFlag = (s.entries || []).some(e => e.kind === 'cardio' && e.durationIsMinimum);
  return { min: known || null, partial: hasStrength || minFlag || !known, minimum: minFlag };
}

function hm(str) { if (!str) return null; const [h, m] = str.split(':').map(Number); return h * 60 + m; }

// Minutes actives sur un ensemble de jours, sans chevauchement quand les heures sont connues.
export function activeMinutes(sessions, activities, from, to) {
  let total = 0, partial = false;
  const byDay = {};
  const push = (date, start, dur) => { (byDay[date] = byDay[date] || []).push({ start, dur }); };
  for (const s of doneSessions(sessions)) {
    if (s.date < from || s.date > to) continue;
    const m = sessionMinutes(s);
    if (m.partial) partial = true;
    if (!m.min) continue;
    let start = null;
    if (s.startedAt && s.durationSource === 'mesuree') { const d = new Date(s.startedAt); start = d.getHours() * 60 + d.getMinutes(); }
    push(s.date, start, m.min);
  }
  for (const a of activities || []) {
    if (a.date < from || a.date > to) continue;
    if (!a.durationMin) { partial = true; continue; }
    push(a.date, hm(a.startTime), a.durationMin);
  }
  for (const items of Object.values(byDay)) {
    const timed = items.filter(i => i.start !== null).sort((a, b) => a.start - b.start);
    let curS = null, curE = null;
    for (const i of timed) {
      const e = i.start + i.dur;
      if (curS === null) { curS = i.start; curE = e; }
      else if (i.start <= curE) curE = Math.max(curE, e);
      else { total += curE - curS; curS = i.start; curE = e; }
    }
    if (curS !== null) total += curE - curS;
    total += items.filter(i => i.start === null).reduce((a, i) => a + i.dur, 0);
  }
  return { minutes: total, partial };
}

export function caloriesBetween(sessions, activities, measurements, from, to) {
  const results = [];
  for (const s of doneSessions(sessions)) if (s.date >= from && s.date <= to) results.push(sessionCalories(s, measurements));
  for (const a of activities || []) if (a.date >= from && a.date <= to) results.push(activityCalories(a, measurements));
  const agg = aggregate(results);
  return { ...agg, count: results.length };
}

export function weekRange(iso) { const from = weekStart(iso); return { from, to: addDays(from, 6) }; }

export function weeklySummary(profile, sessions, activities, measurements, todayIso) {
  const { from, to } = weekRange(todayIso);
  const gym = doneSessions(sessions).filter(s => s.date >= from && s.date <= to);
  const acts = (activities || []).filter(a => a.date >= from && a.date <= to);
  const outdoorMin = acts.reduce((a, x) => a + (x.durationMin || 0), 0);
  return {
    from, to, gymDone: gym.length, gymTarget: profile.gymPerWeek || null,
    outdoorCount: acts.length, outdoorMin, outdoorTarget: profile.outdoorMinutesTarget || null,
    minutes: activeMinutes(sessions, activities, from, to),
    calories: caloriesBetween(sessions, activities, measurements, from, to),
    items: [...gym.map(s => ({ kind: 'gym', date: s.date, id: s.id })), ...acts.map(a => ({ kind: 'outdoor', date: a.date, id: a.id, type: a.type }))].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Séries hebdomadaires pour les graphiques
export function weeklySeries(profile, sessions, activities, measurements, fromIso, toIso) {
  const out = [];
  let w = weekStart(fromIso);
  while (w <= toIso) {
    const to = addDays(w, 6);
    const gym = doneSessions(sessions).filter(s => s.date >= w && s.date <= to);
    const acts = (activities || []).filter(a => a.date >= w && a.date <= to);
    const gymMin = activeMinutes(gym, [], w, to);
    const outMin = activeMinutes([], acts, w, to);
    const cal = caloriesBetween(sessions, activities, measurements, w, to);
    const cardio = gym.flatMap(s => (s.entries || []).filter(e => e.kind === 'cardio'));
    out.push({
      week: w, gym: gym.length, outdoor: acts.length, gymMin: gymMin.minutes, outMin: outMin.minutes,
      minutesPartial: gymMin.partial || outMin.partial, kcal: cal.active, kcalPartial: cal.unknownCount > 0, kcalOther: cal.other,
      cardioMin: cardio.reduce((a, e) => a + (e.durationMin || 0), 0), cardioDist: cardio.reduce((a, e) => a + (e.distanceKm || 0), 0),
      target: profile.gymPerWeek || null,
      byType: acts.reduce((m, a) => { m[a.type] = (m[a.type] || 0) + 1; return m; }, {}),
    });
    w = addDays(w, 7);
  }
  return out;
}

export function periodStart(period, todayIso, firstDate) {
  if (period === '4s') return addDays(todayIso, -27);
  if (period === '3m') return addDays(todayIso, -90);
  if (period === '6m') return addDays(todayIso, -182);
  return firstDate || addDays(todayIso, -27);
}

export function firstDataDate(sessions, activities, measurements) {
  const ds = [...doneSessions(sessions), ...(activities || []), ...(measurements || [])].map(x => x.date).filter(Boolean).sort();
  return ds[0] || null;
}

export function streakInfo(sessions) {
  const ds = doneSessions(sessions).map(s => s.date).sort();
  return { last: ds[ds.length - 1] || null, count: ds.length };
}

export function daysSince(iso, todayIso) { return iso ? daysBetween(iso, todayIso) : null; }
export { parseISO };
