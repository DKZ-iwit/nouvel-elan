// Progression ludique du compagnon. Module pur et déterministe.
// Les points sont recalculés à partir des enregistrements (séances, activités, mesures) : un même
// enregistrement a toujours le même identifiant d'événement, donc un import répété ou une
// modification ne rapporte jamais deux fois. Les pièces débloquées sont conservées à part.
import { weekStart } from '../util.js';
import { itemsUpToLevel, MAX_LEVEL } from '../companion/wardrobe.js';

export const LEVEL_THRESHOLDS = [0, 30, 70, 120, 180, 250, 330, 420, 520, 630];
export const POINTS = { session: 10, activity: 6, weekActive: 5, weekGym: 15, weekOutdoor: 10, milestone: 15, cumul: 10 };
export const CAPS = { sessionsPerDay: 2, activitiesPerDay: 2, activityMinMinutes: 10 };
export const CUMUL_STEPS = [5, 10, 25, 50, 100, 200];

export const RULES = [
  { label: 'Séance en salle terminée', points: POINTS.session, detail: 'Une séance commencée mais non terminée ne compte pas. Au plus 2 séances par jour.' },
  { label: 'Activité hors salle enregistrée', points: POINTS.activity, detail: 'Marche, vélo, vélo électrique, natation… d’au moins 10 minutes. Au plus 2 par jour.' },
  { label: 'Semaine active', points: POINTS.weekActive, detail: 'Au moins une séance ou activité dans la semaine.' },
  { label: 'Objectif de séances de la semaine atteint', points: POINTS.weekGym, detail: 'Selon le nombre de séances que tu t’es fixé, même s’il s’agit d’une seule.' },
  { label: 'Objectif d’activité hors salle de la semaine atteint', points: POINTS.weekOutdoor, detail: 'Si tu as fixé un nombre de minutes hors salle par semaine.' },
  { label: 'Étape de régularité', points: POINTS.cumul, detail: `À la ${CUMUL_STEPS.join('e, ')}e séance ou activité comptée.` },
  { label: 'Palier personnel atteint', points: POINTS.milestone, detail: 'Un palier que tu as toi-même renseigné, atteint après avoir été au-dessus.' },
];

export const RULE_NOTES = [
  'La durée, les charges, les calories et la perte de poids ne rapportent pas de points supplémentaires : chacun progresse à son rythme.',
  'Une semaine de repos ne fait jamais reculer ton compagnon.',
  'Les points sont recalculés à partir de ton historique : corriger ou supprimer un enregistrement ajuste les points, mais les pièces déjà débloquées restent à toi.',
  'Le compagnon est un jeu : il ne mesure ni ta forme ni ta santé. En cas de douleur ou de fatigue, le repos reste le bon choix.',
];

function sessionCounts(s) {
  if (s.status !== 'done') return false;
  return (s.entries || []).some(e => e.kind === 'cardio' ? (e.durationMin || e.distanceKm) : (e.sets || []).some(st => (st.reps ?? st.seconds) !== null && (st.reps ?? st.seconds) !== undefined));
}
function activityCounts(a) {
  if (a.durationMin) return a.durationMin >= CAPS.activityMinMinutes;
  return (a.distanceKm || 0) >= 1;
}

export function computeEvents(profile, { sessions = [], activities = [], measurements = [] }) {
  const actions = [];
  for (const s of sessions) if (s.status === 'done') actions.push({ id: 'seance:' + s.id, date: s.date, kind: 'session', valid: sessionCounts(s), ref: s.id });
  for (const a of activities) actions.push({ id: 'activite:' + a.id, date: a.date, kind: 'activity', valid: activityCounts(a), ref: a.id, minutes: a.durationMin || 0 });
  actions.sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
  // Un identifiant d'événement n'est jamais récompensé deux fois
  const seen = new Set();
  for (let i = actions.length - 1; i >= 0; i--) { if (seen.has(actions[i].id)) actions.splice(i, 1); else seen.add(actions[i].id); }
  const perDay = {};
  const events = [];
  for (const a of actions) {
    const k = a.date + a.kind;
    let pts = 0, note = '';
    if (!a.valid) note = a.kind === 'activity' ? 'Activité de moins de 10 minutes' : 'Séance sans série enregistrée';
    else if ((perDay[k] = (perDay[k] || 0) + 1) > (a.kind === 'session' ? CAPS.sessionsPerDay : CAPS.activitiesPerDay)) note = 'Plafond quotidien atteint';
    else pts = a.kind === 'session' ? POINTS.session : POINTS.activity;
    events.push({ id: a.id, date: a.date, kind: a.kind, points: pts, label: a.kind === 'session' ? 'Séance terminée' : 'Activité enregistrée', note, ref: a.ref, minutes: a.minutes });
  }
  // Semaines
  const weeks = {};
  for (const e of events) if (e.points > 0) {
    const w = weekStart(e.date);
    const W = weeks[w] = weeks[w] || { gym: 0, outMin: 0, last: e.date };
    if (e.kind === 'session') W.gym++; else W.outMin += e.minutes || 0;
    if (e.date > W.last) W.last = e.date;
  }
  for (const [w, W] of Object.entries(weeks)) {
    events.push({ id: `semaine:${w}:active`, date: W.last, kind: 'week', points: POINTS.weekActive, label: 'Semaine active' });
    if (profile.gymPerWeek && W.gym >= profile.gymPerWeek) events.push({ id: `semaine:${w}:salle`, date: W.last, kind: 'week', points: POINTS.weekGym, label: `Objectif de ${profile.gymPerWeek} séance(s) atteint` });
    if (profile.outdoorMinutesTarget && W.outMin >= profile.outdoorMinutesTarget) events.push({ id: `semaine:${w}:dehors`, date: W.last, kind: 'week', points: POINTS.weekOutdoor, label: 'Objectif hors salle atteint' });
  }
  // Étapes de régularité
  const counted = events.filter(e => (e.kind === 'session' || e.kind === 'activity') && e.points > 0).sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
  for (const n of CUMUL_STEPS) if (counted.length >= n) events.push({ id: `cumul:${n}`, date: counted[n - 1].date, kind: 'cumul', points: POINTS.cumul, label: `${n} séances ou activités` });
  // Paliers personnels (renseignés par l'utilisateur), atteints après avoir été au-dessus
  const ws = measurements.filter(m => m.type === 'poids' && m.value !== null && m.value !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  for (const t of profile.weightTargets || []) {
    const th = t.max ?? t.value;
    if (!th || !t.id) continue;
    let above = false;
    for (const m of ws) {
      if (m.value > th) above = true;
      else if (above) { events.push({ id: `palier:${t.id}`, date: m.date, kind: 'milestone', points: POINTS.milestone, label: `Palier atteint : ${t.label || th + ' kg'}` }); break; }
    }
  }
  return events.sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
}

export function levelFor(points) {
  let l = 1;
  LEVEL_THRESHOLDS.forEach((t, i) => { if (points >= t) l = i + 1; });
  return Math.min(l, MAX_LEVEL);
}
export function stageFor(level) { return Math.min(5, Math.max(1, Math.ceil(level / 2))); }

export function computeProgress(profile, data) {
  const events = computeEvents(profile, data);
  const points = events.reduce((a, e) => a + e.points, 0);
  const level = levelFor(points);
  const isMax = level >= MAX_LEVEL;
  const prevAt = LEVEL_THRESHOLDS[level - 1];
  const nextAt = isMax ? null : LEVEL_THRESHOLDS[level];
  return { events, points, level, stage: stageFor(level), prevAt, nextAt, toNext: isMax ? 0 : nextAt - points, isMax };
}

export function newCompanion({ animal, name }, prog) {
  return {
    animal, name: name || '', colors: { fur: null, secondary: null }, equipped: { decor: 'd_halo' },
    hidden: false, animations: true,
    unlocked: itemsUpToLevel(prog.level),
    ledger: prog.events.filter(e => e.points > 0).map(e => e.id),
    seenLevel: prog.level, points: prog.points, level: prog.level,
    welcomeShown: false, createdAt: new Date().toISOString(),
  };
}

// Synchronise le compagnon avec les points recalculés.
// silent : aucune célébration (ouverture, import, correction d'historique).
export function syncCompanion(comp, prog, { silent = false } = {}) {
  const c = normalizeCompanion(comp);
  const ledger = new Set(c.ledger);
  const newEvents = prog.events.filter(e => e.points > 0 && !ledger.has(e.id));
  const unlocked = new Set(c.unlocked);
  const newlyUnlocked = itemsUpToLevel(prog.level).filter(id => !unlocked.has(id));
  newlyUnlocked.forEach(id => unlocked.add(id));
  let levelUp = null;
  if (prog.level > (c.seenLevel || 1)) {
    if (!silent) levelUp = { from: c.seenLevel || 1, to: prog.level };
    c.seenLevel = prog.level;
  }
  c.unlocked = [...unlocked];
  c.ledger = prog.events.filter(e => e.points > 0).map(e => e.id);
  c.points = prog.points; c.level = prog.level;
  return { comp: c, newEvents: silent ? [] : newEvents, levelUp, newlyUnlocked: silent ? [] : newlyUnlocked };
}

// Remet en forme un compagnon importé (valeurs manquantes ou de mauvais type).
export function normalizeCompanion(comp) {
  const c = { ...(comp || {}) };
  const arr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  c.unlocked = arr(c.unlocked); c.ledger = arr(c.ledger);
  c.equipped = c.equipped && typeof c.equipped === 'object' ? { ...c.equipped } : {};
  c.colors = c.colors && typeof c.colors === 'object' ? { fur: c.colors.fur || null, secondary: c.colors.secondary || null } : { fur: null, secondary: null };
  c.seenLevel = Number.isFinite(c.seenLevel) ? c.seenLevel : 1;
  c.hidden = !!c.hidden; c.animations = c.animations !== false;
  c.name = typeof c.name === 'string' ? c.name.slice(0, 30) : '';
  return c;
}
