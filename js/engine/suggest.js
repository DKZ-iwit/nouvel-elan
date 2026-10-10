// Moteur de suggestion de séance. Règles locales et explicables. Module pur.
import { CARDIO_TYPES, ZONES, MOVES, ACTIVITY_TYPES, MUSCLES } from '../data/exercises.js';
import { doneSessions, exKey, workSets, summarizeSets, weekRange } from './stats.js';
import { candidatesFor, admissibility, usageCounts, goalParams } from './program.js';
import { daysBetween, addDays, fmtNum, fmtDate } from '../util.js';

const LEG = new Set(['squat', 'charniere', 'flexion_jambe', 'extension_jambe', 'fessiers', 'mollets', 'adducteurs']);
const UPPER = new Set(['tirage_vertical', 'tirage_horizontal', 'poussee_horizontale', 'poussee_verticale', 'pectoraux_iso', 'epaules_iso', 'haut_dos_iso', 'biceps', 'triceps']);
export const regionOf = (pattern) => LEG.has(pattern) ? 'bas' : UPPER.has(pattern) ? 'haut' : 'tronc';

const fmt = (n, d = 2) => fmtNum(n, d);

export function exerciseConcernsZone(ex, zone) {
  if (!ex) return false;
  if ((ex.zones || []).includes(zone)) return true;
  return (ex.moves || []).some(mv => MOVES[mv] && MOVES[mv].zones.includes(zone));
}

// Entrées comparables (même exercice et même variante/équipement), de la plus récente à la plus ancienne.
export function comparableEntries(sessions, key, beforeDate = null) {
  const out = [];
  const list = doneSessions(sessions).filter(s => !beforeDate || s.date < beforeDate).sort((a, b) => b.date.localeCompare(a.date));
  for (const s of list) for (const e of s.entries || []) if (e.kind !== 'cardio' && exKey(e) === key) out.push({ session: s, entry: e });
  return out;
}

export function incrementFor(ex, profile) {
  const v = profile.increments && profile.increments[ex.id];
  return v || ex.inc || 2.5;
}

// Description exacte d'un ensemble de séries : « 2 × 12 à 50 kg, 1 × 8 à 40 kg (allégée) »
const ROLE_LABEL = { ramp: 'montée', drop: 'allégée' };
export function describeSets(sets, { assist = false, time = false } = {}) {
  const groups = [];
  for (const st of sets) {
    const k = `${st.reps}|${st.load}|${st.seconds}|${st.type}`;
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.n++; else groups.push({ k, n: 1, st });
  }
  return groups.map(({ n, st }) => {
    const role = ROLE_LABEL[st.type] ? ` (${ROLE_LABEL[st.type]})` : '';
    if (time || (st.seconds !== null && st.seconds !== undefined && (st.reps === null || st.reps === undefined))) return `${n} × ${st.seconds ?? '?'} s${role}`;
    const load = st.load !== null && st.load !== undefined ? ` à ${fmt(st.load)} kg${assist ? ' d’assistance' : ''}` : '';
    return `${n} × ${st.reps ?? '?'}${load}${role}`;
  }).join(', ');
}

// Conseil de charge (double progression).
// Toutes les séries de travail sont examinées. Les séries explicitement marquées « montée » ou
// « allégée » sont décrites mais ne conditionnent pas la progression ; sans marquage, aucune série
// plus légère n'est ignorée. Si les données ne permettent pas de conclure, la charge est conservée.
export function loadAdvice(ex, key, sessions, range, profile, flags = {}) {
  const hist = comparableEntries(sessions, key, flags.beforeDate);
  const inc = incrementFor(ex, profile);
  const [rMin, rMax] = range;
  const isAssist = ex.measure === 'assist_reps' || ex.load === 'assist';
  const isTime = ex.measure === 'time';
  if (!hist.length) {
    if (isTime) return { kind: 'start', seconds: null, text: 'Première fois : tiens une durée confortable et note-la.', basis: 'Aucun historique comparable' };
    if (ex.measure === 'reps') return { kind: 'start', load: null, text: 'Première fois : fais les répétitions confortables, sans aller à l’échec.', basis: 'Aucun historique comparable' };
    if (isAssist) return { kind: 'start', load: null, text: `Première fois : choisis une assistance qui permet ${rMin} répétitions propres, puis note-la.`, basis: 'Aucun historique comparable' };
    return { kind: 'start', load: null, text: 'Charge de départ à déterminer : fais une série d’essai légère, puis choisis une charge qui laisse 2 à 3 répétitions en réserve.', basis: 'Aucun historique comparable' };
  }
  const { session: ls, entry: le } = hist[0];
  const ws = workSets(le);
  const basis = `${fmtDate(ls.date)} : ${summarizeSets(le, ex, { fmt })}`;
  if (!ws.length) return { kind: 'keep', load: null, text: 'Pas de série de travail enregistrée la dernière fois.', basis };
  const effortOk = le.effort ? ['facile', 'maitrise'].includes(le.effort) : (ls.feedback && ['facile', 'adaptee'].includes(ls.feedback.difficulty));
  const effortHard = le.effort ? ['difficile', 'maximal'].includes(le.effort) : (ls.feedback && ls.feedback.difficulty === 'difficile');
  const noInc = flags.noIncrease;
  const main = ws.filter(s => !s.type || s.type === 'work');
  const marked = ws.filter(s => s.type === 'ramp' || s.type === 'drop');
  const rel = main.length ? main : ws;
  const analysed = describeSets(rel, { assist: isAssist, time: isTime });
  const markedNote = main.length && marked.length ? ` Séries signalées comme montée ou allégées, non prises en compte : ${describeSets(marked, { assist: isAssist, time: isTime })}.` : '';
  const unknownCount = le.setsCountKnown === false;

  if (isTime) {
    const secs = rel.map(s => s.seconds).filter(v => v !== null && v !== undefined);
    if (!secs.length) return { kind: 'keep', seconds: null, text: 'Durée non renseignée la dernière fois.', basis };
    const minS = Math.min(...secs), best = Math.max(...secs);
    if (!noInc && effortOk && !unknownCount && minS === best) return { kind: 'increase', seconds: best + (inc || 5), text: `Toutes les séries analysées (${analysed}) tenues avec un effort maîtrisé : viser ${best + (inc || 5)} s.`, basis };
    return { kind: 'keep', seconds: best, text: noInc ? `Garder ${best} s : ${flags.noIncreaseReason}.` : `Viser ${best} s sur chaque série (analyse : ${analysed}).`, basis };
  }
  if (ex.measure === 'reps') {
    const reps = rel.map(s => s.reps || 0);
    const best = Math.max(...reps), low = Math.min(...reps);
    if (!noInc && effortOk && low === best) return { kind: 'increase', reps: best + 1, text: `Toutes les séries à ${best} répétitions avec un effort maîtrisé : viser ${best + 1}.`, basis };
    return { kind: 'keep', reps: best, text: noInc ? `Garder ${best} répétitions : ${flags.noIncreaseReason}.` : `Viser ${best} répétitions sur chaque série (analyse : ${analysed}).`, basis };
  }

  const missingLoad = rel.some(s => s.load === null || s.load === undefined);
  const loads = rel.map(s => s.load).filter(v => v !== null && v !== undefined);
  if (!loads.length) return { kind: 'keep', load: null, text: 'Charge non renseignée la dernière fois.', basis };
  const top = isAssist ? Math.min(...loads) : Math.max(...loads);
  const unit = isAssist ? ' d’assistance' : '';
  if (missingLoad) return { kind: 'keep', load: top, text: `Une série n’a pas de charge renseignée : impossible de conclure, garder ${fmt(top)} kg${unit}.`, basis };
  const uniform = new Set(loads).size === 1;

  // Deux séances comparables de suite sous la plage ou au maximum de l'effort → légère baisse
  if (hist.length >= 2) {
    const prevE = hist[1].entry;
    const pw = workSets(prevE);
    const pRel = pw.filter(s => !s.type || s.type === 'work').length ? pw.filter(s => !s.type || s.type === 'work') : pw;
    const pLoads = pRel.map(s => s.load).filter(v => v !== null && v !== undefined);
    const pTop = pLoads.length ? (isAssist ? Math.min(...pLoads) : Math.max(...pLoads)) : null;
    const below = (arr, t) => arr.filter(s => s.load === t).some(s => (s.reps || 0) < rMin);
    const hardPrev = prevE.effort === 'maximal' || (hist[1].session.feedback && hist[1].session.feedback.difficulty === 'difficile');
    const hardLast = le.effort === 'maximal' || (ls.feedback && ls.feedback.difficulty === 'difficile');
    if (pTop === top && ((below(rel, top) && below(pRel, top)) || (hardLast && hardPrev))) {
      const nl = isAssist ? top + inc : Math.max(0, top - inc);
      return { kind: 'decrease', load: nl, text: `Deux séances de suite difficiles à ${fmt(top)} kg${unit} : proposition ${fmt(nl)} kg${unit} pour retrouver la plage ${rMin}–${rMax}.`, basis };
    }
  }
  if (unknownCount) return { kind: 'keep', load: top, text: `Nombre de séries non précisé la dernière fois : impossible de vérifier toutes les séries, garder ${fmt(top)} kg${unit}.`, basis };

  const reachedAll = rel.every(s => (s.reps || 0) >= rMax);
  if (reachedAll) {
    const scope = uniform ? `Toutes les séries analysées (${analysed}) atteignent ${rMax} répétitions` : `Toutes les séries analysées, à charges différentes (${analysed}), atteignent ${rMax} répétitions`;
    if (noInc) return { kind: 'keep', load: top, text: `${scope}, mais la charge est conservée : ${flags.noIncreaseReason}.${markedNote}`, basis };
    if (isAssist && top <= 0) return { kind: 'keep', load: 0, text: `${scope} sans assistance : vise davantage de répétitions ou passe à la traction libre.${markedNote}`, basis };
    const next = isAssist ? Math.max(0, top - inc) : top + inc;
    if (effortOk) return { kind: 'increase', load: next, text: `${scope} avec un effort maîtrisé : ${isAssist ? `assistance réduite à ${fmt(next)} kg` : `+${fmt(inc)} kg, soit ${fmt(next)} kg`}${uniform ? '' : ' sur la série la plus difficile'}.${markedNote}`, basis };
    if (effortHard) return { kind: 'keep', load: top, text: `${scope}, mais l’effort déclaré était difficile : garder ${fmt(top)} kg${unit} une séance de plus.${markedNote}`, basis };
    return { kind: 'keep', load: top, text: `${scope}. Effort non déclaré : si c’était maîtrisé, tu peux tenter ${fmt(next)} kg${unit} ; sinon garde ${fmt(top)} kg${unit}.${markedNote}`, basis, optional: next };
  }
  const short = rel.filter(s => (s.reps || 0) < rMax);
  let text = `Garder ${fmt(top)} kg${unit} et viser ${rMax} répétitions sur toutes les séries avant de progresser. Analyse : ${analysed} ; ${describeSets(short, { assist: isAssist })} sous ${rMax}.`;
  if (!uniform && !marked.length) text += ' Si une série plus légère était une montée en charge ou une série allégée, indique-le sur cette série pour qu’elle ne bloque pas la progression.';
  if (effortHard && short.some(s => (s.reps || 0) < rMin)) text += ' Une seule séance difficile ne suffit pas à baisser la charge.';
  return { kind: 'keep', load: top, text: text + markedNote, basis };
}

// Durée d'un exercice : effort par série + repos entre les séries + transition (réglage, déplacement).
export function itemMinutes(it) {
  const work = it.measure === 'time' ? (it.targetSeconds || 30) : 40;
  return (it.sets * work + Math.max(0, it.sets - 1) * it.rest) / 60 + 1.5;
}

export function lastCardio(sessions, cardioType) {
  for (const s of doneSessions(sessions).sort((a, b) => b.date.localeCompare(a.date))) {
    const e = (s.entries || []).find(x => x.kind === 'cardio' && x.cardioType === cardioType);
    if (e) return { session: s, entry: e };
  }
  return null;
}

const OUTDOOR_WEIGHT = { legere: 0.5, moderee: 1, soutenue: 1 };

export function suggestSession({ profile, program, sessions, activities, today, options = {}, library, getEx }) {
  const reasons = [], conflicts = [], dataUsed = [];
  if (!program || program.status !== 'ok') return { needsProgram: true };
  const params = { ...goalParams(profile), ...program.params };
  const done = doneSessions(sessions).sort((a, b) => b.date.localeCompare(a.date));
  const usage = usageCounts(sessions);
  dataUsed.push(`Programme : ${program.goalLabel}, ${program.gymPerWeek} séance(s) par semaine`);
  dataUsed.push(done.length ? `Historique : ${done.length} séance(s) enregistrée(s)` : 'Aucun historique : charges à déterminer');

  // ----- Choix de la journée -----
  const days = program.days;
  const lastDone = done[0] || null;
  let idx = 0;
  const lastProg = done.find(s => days.some(d => d.id === s.programDayId));
  if (lastProg) idx = (days.findIndex(d => d.id === lastProg.programDayId) + 1) % days.length;
  if (options.dayId) idx = Math.max(0, days.findIndex(d => d.id === options.dayId));
  if (options.focus === 'haut' || options.focus === 'bas') {
    for (let k = 0; k < days.length; k++) {
      const j = (idx + k) % days.length;
      if (days[j].focus === options.focus) { idx = j; break; }
    }
  }
  const day = days[idx];
  let noIncrease = false, noIncreaseReason = '';

  if (lastDone) {
    const gap = daysBetween(lastDone.date, today);
    const expected = 7 / program.gymPerWeek;
    if (gap > Math.max(3, expected * 2)) {
      reasons.push(`Ta dernière séance date du ${fmtDate(lastDone.date)} : on reprend la suite du programme (${day.label}), sans rattraper les séances manquées.`);
    }
    if (gap > 14) { noIncrease = true; noIncreaseReason = 'reprise après plus de deux semaines'; reasons.push('Plus de deux semaines sans séance : charges conservées, sans augmentation, pour reprendre en douceur.'); }
  }
  reasons.unshift(done.length
    ? `Cette séance reprend les mouvements de ton programme (${day.label}) avec tes dernières charges enregistrées.`
    : `Première séance de ton programme (${day.label}) : les charges sont à déterminer pendant la séance.`);

  // ----- Énergie -----
  const energy = options.energy || null;
  if (energy === 'fatigue') { noIncrease = true; noIncreaseReason = noIncreaseReason || 'fatigue déclarée'; reasons.push('Tu as déclaré une fatigue élevée : la séance proposée est allégée (une série de moins, pas d’augmentation de charge, cardio léger).'); }
  else if (energy === 'moyen') reasons.push('Énergie moyenne : séance normale ; si les premières séries sont difficiles, garde les charges de la dernière fois.');

  // ----- Points d'attention du jour -----
  let todayAtt = options.attention || [];
  if (!options.attentionChecked) {
    const habitualPain = (profile.attention || []).filter(a => (a.nature || []).includes('douleur_actuelle'));
    if (habitualPain.length) {
      todayAtt = habitualPain.map(a => ({ zone: a.zone, level: 'douleur' }));
      reasons.push('Point d’attention du jour non renseigné : la douleur indiquée dans ton profil est prise en compte par prudence.');
    }
  }
  for (const a of todayAtt) {
    if (a.level === 'douleur') reasons.push(`Douleur déclarée aujourd’hui (${(ZONES[a.zone] || a.zone).toLowerCase()}) : progression suspendue sur les mouvements qui sollicitent cette zone. Si la douleur persiste, demande l’avis d’un médecin ou d’un kinésithérapeute.`);
    else reasons.push(`Gêne déclarée aujourd’hui (${(ZONES[a.zone] || a.zone).toLowerCase()}) : charges conservées et amplitude confortable sur les mouvements concernés.`);
  }

  // ----- Activités récentes hors salle -----
  const recentActs = (activities || []).filter(a => a.date <= today && daysBetween(a.date, today) <= 1);
  const legHeavy = recentActs.filter(a => ['course', 'randonnee', 'velo', 'velo_electrique'].includes(a.type) &&
    (a.intensity === 'soutenue' || (a.type !== 'velo_electrique' && (a.durationMin || 0) >= 90)));
  if (legHeavy.length) {
    const a = legHeavy[0];
    reasons.push(`${ACTIVITY_TYPES[a.type]} ${a.intensity === 'soutenue' ? 'soutenue' : 'longue'} ${daysBetween(a.date, today) === 0 ? 'aujourd’hui' : 'hier'} : volume des jambes réduit d’une série, sans augmentation de charge.`);
  }

  // ----- Muscles sollicités récemment -----
  const recentLoad = {};
  for (const s of done.filter(s => daysBetween(s.date, today) <= 1 && s.date <= today)) {
    for (const e of s.entries || []) {
      const ex = getEx(e.exerciseId); if (!ex || e.kind === 'cardio') continue;
      for (const m of ex.primary) recentLoad[m] = (recentLoad[m] || 0) + workSets(e).length;
    }
  }
  const tired = new Set(Object.entries(recentLoad).filter(([, n]) => n >= 6).map(([m]) => m));

  // ----- Tendance des retours -----
  const fb = done.slice(0, 2).map(s => s.feedback && s.feedback.difficulty).filter(Boolean);
  let trend = null;
  if (fb.length === 2 && fb[0] === 'difficile' && fb[1] === 'difficile') { trend = 'dur'; reasons.push('Tes deux dernières séances ont été jugées trop difficiles : une série de moins sur les exercices secondaires.'); }
  else if (fb.length === 2 && fb[0] === 'facile' && fb[1] === 'facile') { trend = 'facile'; reasons.push('Tes deux dernières séances ont été jugées trop faciles : une série de plus sur les exercices principaux.'); }
  else if (fb[0] === 'difficile') reasons.push('Dernière séance jugée difficile : une seule séance ne change pas le programme.');

  // ----- Construction des exercices -----
  let items = [];
  let firstMain = true;
  for (const sl of day.slots) {
    if (!sl.exerciseId) { conflicts.push(`${sl.pattern} : aucun exercice compatible. Vérifie ton matériel et tes exclusions.`); continue; }
    let ex = getEx(sl.exerciseId);
    let replacedNote = null;
    const adm = ex ? admissibility(ex, profile, { usage }) : { ok: false, reasons: ['Exercice introuvable'] };
    if (!adm.ok) {
      const alt = candidatesFor(sl.pattern, profile, library, { usage })[0];
      if (!alt) { conflicts.push(`${ex ? ex.name : sl.exerciseId} : ${adm.reasons[0]} ; aucune alternative compatible.`); continue; }
      replacedNote = `${ex ? ex.name : 'Exercice'} remplacé par ${alt.ex.name} (${adm.reasons[0].toLowerCase()}).`;
      ex = alt.ex;
    }
    const region = regionOf(sl.pattern);
    const flags = [];
    let prio = sl.prio;
    let isMain = prio === 1 && ex.compound;
    let range = isMain ? [...params.reps] : (profile.goal === 'force' || prio === 3 ? [...params.accessoryReps] : [...params.reps]);
    if (isMain && firstMain && params.forceFirst) range = [Math.max(4, range[0] - 2), Math.max(6, range[0])];
    if (isMain) firstMain = false;
    let sets = prio === 1 ? params.sets[1] : prio === 2 ? Math.round((params.sets[0] + params.sets[1]) / 2) : params.sets[0];
    const rest = isMain ? params.rest[1] : params.rest[0];
    let itemNoInc = noIncrease, itemReason = noIncreaseReason;

    if (energy === 'fatigue') sets = Math.max(2, sets - 1);
    if (trend === 'dur' && prio >= 2) sets = Math.max(2, sets - 1);
    if (trend === 'facile' && prio === 1) sets = Math.min(params.sets[1] + 1, 5);
    if (legHeavy.length && region === 'bas') { sets = Math.max(2, sets - 1); itemNoInc = true; itemReason = itemReason || 'activité soutenue récente'; flags.push('Jambes déjà sollicitées par une activité récente'); }
    if (ex.primary.some(m => tired.has(m)) && prio >= 2) { sets = Math.max(2, sets - 1); flags.push(`${ex.primary.filter(m => tired.has(m)).map(m => MUSCLES[m]).join(', ')} : déjà bien sollicités il y a moins de 48 h`); }

    let replacement = null;
    for (const a of todayAtt) {
      if (!exerciseConcernsZone(ex, a.zone)) continue;
      itemNoInc = true;
      if (a.level === 'douleur') {
        itemReason = `douleur déclarée (${(ZONES[a.zone] || a.zone).toLowerCase()})`;
        flags.push(`Progression suspendue : douleur déclarée (${(ZONES[a.zone] || a.zone).toLowerCase()})`);
        const alt = candidatesFor(sl.pattern, profile, library, { usage }).find(c => c.ex.id !== ex.id && !exerciseConcernsZone(c.ex, a.zone));
        replacement = alt ? { exerciseId: alt.ex.id, name: alt.ex.name, why: `Ne sollicite pas directement la zone ${(ZONES[a.zone] || a.zone).toLowerCase()}` } : null;
        if (!alt) flags.push('Aucune alternative de ce rôle n’épargne cette zone : tu peux retirer l’exercice.');
      } else {
        itemReason = itemReason || `gêne déclarée (${(ZONES[a.zone] || a.zone).toLowerCase()})`;
        flags.push(`Gêne déclarée (${(ZONES[a.zone] || a.zone).toLowerCase()}) : charge conservée, amplitude confortable`);
      }
    }

    const key = ex.id; // variante non connue à l'avance : comparaison sur l'exercice sans variante
    const hist = comparableEntries(sessions, key);
    const lastVariantEntry = comparableEntriesAnyVariant(sessions, ex.id)[0];
    const compKey = lastVariantEntry ? exKey(lastVariantEntry.entry) : key;
    const advice = loadAdvice(ex, compKey, sessions, range, profile, { noIncrease: itemNoInc, noIncreaseReason: itemReason });
    items.push({
      slotKey: sl.key, pattern: sl.pattern, region, prio, exerciseId: ex.id, name: ex.name, measure: ex.measure, loadType: ex.load,
      variant: lastVariantEntry ? (lastVariantEntry.entry.variant || '') : '', equipmentNote: lastVariantEntry ? (lastVariantEntry.entry.equipmentNote || '') : '',
      sets, range, rest, advice, flags, replacement, replacedNote, targetSeconds: advice.seconds || null,
      why: sl.reason || '', hadHistory: hist.length > 0 || !!lastVariantEntry,
    });
    if (replacedNote) reasons.push(replacedNote);
  }

  // ----- Demande de focus sur une journée complète -----
  if ((options.focus === 'haut' || options.focus === 'bas') && day.focus === 'complet') {
    const other = options.focus === 'haut' ? 'bas' : 'haut';
    const before = items.length;
    items = items.filter(it => !(it.region === other && it.prio >= 2));
    items.forEach(it => { if (it.region === options.focus && it.prio === 1) it.sets = Math.min(it.sets + 1, 5); });
    reasons.push(`Davantage de ${options.focus === 'haut' ? 'haut' : 'bas'} du corps : exercices secondaires du ${other} du corps retirés${before !== items.length ? '' : ' (aucun à retirer)'} et une série de plus sur les exercices principaux.`);
  }
  if (energy === 'fatigue') items = items.filter(it => it.prio < 3);

  // ----- Cardio -----
  const cp = program.cardio;
  let cardioType = cp.types[0] || 'marche';
  let cardioMin = cp.minutes;
  const cardioWhy = [cp.why];
  const { from, to } = weekRange(today);
  const weekGymCardio = doneSessions(sessions).filter(s => s.date >= from && s.date <= to)
    .flatMap(s => (s.entries || []).filter(e => e.kind === 'cardio')).reduce((a, e) => a + (e.durationMin || 0), 0);
  const weekOutdoor = (activities || []).filter(a => a.date >= from && a.date <= to)
    .reduce((a, x) => a + (x.durationMin || 0) * (x.type === 'velo_electrique' && x.intensity !== 'soutenue' ? 0.5 : (OUTDOOR_WEIGHT[x.intensity] ?? 0.5)), 0);
  if (cp.weeklyTarget && weekGymCardio + weekOutdoor >= cp.weeklyTarget && options.focus !== 'cardio') {
    cardioMin = 10;
    cardioWhy.push(`Objectif cardio de la semaine déjà atteint (≈ ${Math.round(weekGymCardio + weekOutdoor)} min comptées, activités hors salle incluses) : cardio raccourci et facultatif.`);
  } else if (weekOutdoor > 0) {
    cardioWhy.push(`Tes activités hors salle de la semaine comptent déjà pour ≈ ${Math.round(weekOutdoor)} min sur l’objectif cardio.`);
  }
  let cardioIntensity = cp.intensity;
  if (energy === 'fatigue') { cardioIntensity = 'légère'; cardioMin = Math.min(cardioMin, 15); }
  if (options.focus === 'cardio') {
    cardioMin += 15;
    items = items.filter(it => it.prio === 1);
    reasons.push('Davantage de cardio : 15 minutes de plus, seuls les exercices principaux sont conservés.');
  }
  for (const a of todayAtt) {
    const cex = getEx(CARDIO_TYPES[cardioType]?.exerciseId);
    if (a.level === 'douleur' && cex && exerciseConcernsZone(cex, a.zone)) {
      const alt = cp.types.find(t => !exerciseConcernsZone(getEx(CARDIO_TYPES[t].exerciseId), a.zone));
      if (alt) { cardioType = alt; cardioWhy.push('Type de cardio modifié pour épargner la zone douloureuse.'); }
      else cardioWhy.push('Le cardio prévu sollicite la zone douloureuse : à faire seulement s’il reste confortable.');
    }
  }
  const lc = lastCardio(sessions, cardioType);
  let cardioDetail = '';
  if (lc) {
    const e = lc.entry;
    const bits = [];
    if (e.durationMin) bits.push(`${e.durationIsMinimum ? 'au moins ' : ''}${fmt(e.durationMin, 0)} min`);
    if (e.speedKmh) bits.push(`${fmt(e.speedKmh, 1)} km/h`);
    if (e.inclinePct !== null && e.inclinePct !== undefined) bits.push(`${fmt(e.inclinePct, 1)} %`);
    cardioDetail = `Dernière fois (${fmtDate(lc.session.date)}) : ${bits.join(', ') || 'détails non renseignés'}.`;
  }
  let runOption = null;
  const painLegs = todayAtt.some(a => a.level === 'douleur' && ['genoux', 'chevilles', 'hanches'].includes(a.zone));
  if ((cp.progressive || []).includes('course') && cardioType !== 'course' && energy !== 'fatigue' && !painLegs) {
    runOption = 'Option pour intégrer progressivement la course : 3 à 5 fois 1 minute de course lente, séparées par 2 minutes de marche. À ne garder que si c’est confortable.';
  }

  // ----- Ajustement au temps disponible -----
  // Estimation : échauffement (5 min + séries légères), séries (effort + repos), transitions, cardio.
  const budget = options.minutes || profile.durationMin || 60;
  const warmMin = () => 5 + (items.some(it => it.measure === 'load_reps') ? 2 : 0);
  const total = () => warmMin() + items.reduce((a, it) => a + itemMinutes(it), 0) + cardioMin;
  const over = () => Math.ceil(total()) > budget;
  const trimmed = [];
  const minCardio = options.focus === 'cardio' ? Math.min(cardioMin, 20) : (['perte_poids', 'endurance'].includes(profile.goal) ? Math.min(cardioMin, 15) : Math.min(cardioMin, 10));
  const dropPrio = (p) => {
    while (over()) {
      const i = items.map(it => it.prio).lastIndexOf(p);
      if (i < 0) break;
      trimmed.push(items[i].name); items.splice(i, 1);
    }
  };
  const reduceSets = (p) => {
    while (over() && items.some(it => it.prio >= p && it.sets > 2)) {
      const it = items.filter(x => x.prio >= p && x.sets > 2).pop(); it.sets--;
      if (!trimmed.includes('séries réduites')) trimmed.push('séries réduites');
    }
  };
  const shortenCardio = (floor) => {
    if (over() && cardioMin > floor) {
      cardioMin = Math.max(floor, Math.floor(cardioMin - (Math.ceil(total()) - budget)));
      if (!trimmed.includes('cardio raccourci')) trimmed.push('cardio raccourci');
    }
  };
  dropPrio(3);
  shortenCardio(minCardio);
  reduceSets(2);
  dropPrio(2);
  reduceSets(1);
  shortenCardio(0);
  let overBudget = false;
  if (trimmed.length) reasons.push(`Tu disposes de ${budget} minutes : les exercices prioritaires sont conservés (${trimmed.join(', ')}).`);
  if (over()) {
    overBudget = true;
    reasons.push(`Les exercices essentiels demandent environ ${Math.ceil(total())} minutes, plus que tes ${budget} minutes : retire un exercice pendant la séance ou choisis plus de temps.`);
  } else if (!trimmed.length && budget - Math.ceil(total()) > 15 && ['perte_poids', 'endurance', 'forme'].includes(profile.goal)) {
    const extra = Math.min(15, Math.floor(budget - Math.ceil(total()) - 5));
    if (extra >= 5) { cardioMin += extra; reasons.push(`Il reste du temps sur tes ${budget} minutes : ${extra} minutes de cardio en plus.`); }
  }
  cardioMin = Math.floor(cardioMin);

  // ----- Échauffement -----
  const warmup = ['5 minutes de cardio léger pour monter progressivement en température.'];
  const first = items.find(it => it.measure === 'load_reps');
  if (first) {
    const l = first.advice.load;
    warmup.push(l ? `1 à 2 séries légères de ${first.name} (≈ ${fmt(Math.round(l * 0.5 / 2.5) * 2.5)} kg puis ${fmt(Math.round(l * 0.7 / 2.5) * 2.5)} kg), non comptées comme séries de travail.` : `1 à 2 séries légères de ${first.name}, non comptées comme séries de travail.`);
  }

  const est = Math.ceil(total());
  return {
    dayId: day.id, title: day.label, focus: day.focus, items, warmup,
    cardio: cardioMin > 0 ? { cardioType, label: CARDIO_TYPES[cardioType]?.label || cardioType, minutes: cardioMin, intensity: cardioIntensity, detail: cardioDetail, why: cardioWhy, runOption, optional: cardioMin <= 10 && cardioWhy.length > 1 } : null,
    estMinutes: est, budget, overBudget, reasons, conflicts, dataUsed, options,
  };
}

export function comparableEntriesAnyVariant(sessions, exerciseId) {
  const out = [];
  for (const s of doneSessions(sessions).sort((a, b) => b.date.localeCompare(a.date))) for (const e of s.entries || []) if (e.kind !== 'cardio' && e.exerciseId === exerciseId) out.push({ session: s, entry: e });
  return out;
}

// Remplacement d'un exercice : alternatives admissibles du même rôle, sans transfert de charge.
export function replacementOptions(ex, profile, library, { usage = {}, zone = null } = {}) {
  const altIds = (ex.alts || []).map(([id]) => id);
  const list = candidatesFor(ex.pattern, profile, library, { usage })
    .filter(c => c.ex.id !== ex.id && (!zone || !exerciseConcernsZone(c.ex, zone)));
  list.sort((a, b) => (altIds.includes(b.ex.id) - altIds.includes(a.ex.id)) || b.score - a.score);
  return list.map(c => ({ ex: c.ex, note: (ex.alts.find(([id]) => id === c.ex.id) || [])[1] || '' }));
}

// Compatibilité d'un exercice avec le profil et la séance du jour, pour les remplacements et ajouts libres.
// blocked : exclusion explicite (jamais contournée) ; reasons : conflits à confirmer explicitement.
export function compatibility(ex, profile, { usage = {}, todayAttention = [], pattern = null } = {}) {
  const adm = admissibility(ex, profile, { usage });
  const blocked = (profile.excluded || []).includes(ex.id);
  const reasons = adm.reasons.filter(r => r !== 'Exercice exclu dans ton profil');
  for (const a of todayAttention) {
    if (a.level === 'douleur' && exerciseConcernsZone(ex, a.zone)) reasons.push(`Sollicite la zone douloureuse aujourd’hui (${(ZONES[a.zone] || a.zone).toLowerCase()})`);
  }
  const sameRole = !pattern || ex.pattern === pattern;
  return { blocked, reasons, sameRole, ok: !blocked && !reasons.length && sameRole };
}
