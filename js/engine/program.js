// Construction de la trame de programme. Module pur.
import { checkEquipment, MOVES, CARDIO_TYPES, ZONES } from '../data/exercises.js';
import { GOALS, LEVEL_OPTIONS, DAY_TEMPLATES, SPLITS, WEEK_LAYOUT, WEEKDAYS, PROGRESSION_RULES } from '../data/programs.js';
import { doneSessions } from './stats.js';

export function missingForProgram(profile) {
  const m = [];
  if (!profile.goal) m.push({ field: 'goal', label: 'Objectif principal' });
  if (!profile.gymPerWeek) m.push({ field: 'gymPerWeek', label: 'Séances en salle par semaine' });
  if (!profile.level) m.push({ field: 'level', label: 'Niveau' });
  if (!profile.durationMin) m.push({ field: 'durationMin', label: 'Durée habituelle d’une séance' });
  return m;
}

// Paramètres combinant objectif principal et objectifs secondaires, avec explications.
export function goalParams(profile) {
  const g = GOALS[profile.goal] || GOALS.forme;
  const p = { ...g, reps: [...g.reps], sets: [...g.sets], rest: [...g.rest], accessoryReps: [...g.accessoryReps] };
  const notes = [g.why];
  const sec = (profile.secondaryGoals || []).filter(x => x !== profile.goal);
  if (sec.includes('hypertrophie') || sec.includes('renforcement')) {
    if (profile.goal === 'perte_poids') {
      p.isoPriority = 2; p.sets = [3, 4];
      notes.push('Objectif secondaire de maintien et développement musculaire : les exercices d’isolation passent en priorité 2 et les mouvements principaux peuvent aller jusqu’à 4 séries.');
    } else if (profile.goal !== 'hypertrophie') {
      p.isoPriority = Math.min(p.isoPriority, 2);
      notes.push('Objectif secondaire musculaire : davantage de place aux exercices d’isolation.');
    }
  }
  if (sec.includes('endurance') && profile.goal !== 'endurance') {
    p.cardioMin += 10;
    notes.push('Objectif secondaire d’endurance : 10 minutes de cardio supplémentaires par séance.');
  }
  if (sec.includes('perte_poids') && profile.goal !== 'perte_poids') {
    p.cardioMin = Math.max(p.cardioMin, 20);
    notes.push('Objectif secondaire de perte de poids : au moins 20 minutes de cardio par séance.');
  }
  if (sec.includes('force') && profile.goal !== 'force') {
    notes.push('Objectif secondaire de force : le premier exercice de chaque séance peut se faire dans le bas de la plage de répétitions.');
    p.forceFirst = true;
  }
  if (profile.level === 'debutant' || profile.level === 'reprise') {
    p.sets = [Math.min(p.sets[0], 2), Math.min(p.sets[1], 3)];
    notes.push('Niveau ' + LEVEL_OPTIONS[profile.level].label.toLowerCase() + ' : 2 à 3 séries par exercice et des mouvements guidés privilégiés.');
  }
  return { ...p, notes };
}

// Raisons de non-admissibilité d'un exercice pour un profil (filtres obligatoires).
export function admissibility(ex, profile, { usage = {}, todayAttention = [] } = {}) {
  const reasons = [];
  if ((profile.excluded || []).includes(ex.id)) reasons.push('Exercice exclu dans ton profil');
  if (!checkEquipment(ex, profile.equipment)) reasons.push('Matériel non disponible');
  const maxLvl = LEVEL_OPTIONS[profile.level]?.maxLevel ?? 3;
  const tolerated = (profile.attention || []).some(a => (a.tolerated || []).includes(ex.id));
  if (ex.level > maxLvl && !usage[ex.id] && !tolerated) reasons.push('Niveau technique supérieur au niveau déclaré');
  for (const a of profile.attention || []) {
    if ((a.problemExercises || []).includes(ex.id)) reasons.push(`Déclaré gênant (${ZONES[a.zone] || a.zone})`);
    const bad = (a.problemMoves || []).filter(mv => ex.moves.includes(mv));
    if (bad.length) reasons.push(`Mouvement déclaré gênant (${ZONES[a.zone] || a.zone}) : ${MOVES[bad[0]].label.toLowerCase()}`);
  }
  return { ok: reasons.length === 0, reasons };
}

export function usageCounts(sessions) {
  const u = {};
  for (const s of doneSessions(sessions)) for (const e of s.entries || []) u[e.exerciseId] = (u[e.exerciseId] || 0) + 1;
  return u;
}

export function scoreExercise(ex, profile, { usage = {}, prevId = null, role = 1 } = {}) {
  let sc = 0; const why = [];
  const u = usage[ex.id] || 0;
  if (u) { sc += Math.min(u, 6) * 2; why.push('déjà pratiqué'); }
  if ((profile.favorites || []).includes(ex.id)) { sc += 5; why.push('exercice préféré'); }
  if ((profile.attention || []).some(a => (a.tolerated || []).includes(ex.id))) { sc += 3; why.push('bien toléré'); }
  if (prevId === ex.id) { sc += 4; why.push('stabilité du programme'); }
  if ((profile.replaceRequests || []).includes(ex.id)) { sc -= 8; why.push('remplacement demandé'); }
  if (role === 1 && ex.compound) sc += 2;
  if ((profile.level === 'debutant' || profile.level === 'reprise') && ex.eq.some(g => (Array.isArray(g) ? g : [g]).includes('machines'))) sc += 1;
  return { score: sc, why };
}

export function candidatesFor(pattern, profile, library, ctx = {}) {
  return library
    .filter(ex => ex.pattern === pattern && ex.cat !== 'cardio')
    .map(ex => ({ ex, adm: admissibility(ex, profile, ctx), ...scoreExercise(ex, profile, ctx) }))
    .filter(c => c.adm.ok)
    .sort((a, b) => b.score - a.score || library.indexOf(a.ex) - library.indexOf(b.ex));
}

function cardioPlan(profile, params) {
  const prefs = profile.cardioPrefs || [];
  const eq = new Set(profile.equipment || []);
  const gymTypes = [];
  for (const k of prefs) {
    if (k === 'marche') gymTypes.push(eq.has('tapis') ? 'marche_tapis' : 'marche');
    else if (k === 'tapis_incline' && eq.has('tapis')) gymTypes.push('tapis_incline');
    else if (k === 'course') gymTypes.push('course');
    else if (k === 'velo' && eq.has('velo_salle')) gymTypes.push('velo');
    else if (k === 'elliptique' && eq.has('elliptique')) gymTypes.push('elliptique');
    else if (k === 'rameur' && eq.has('rameur')) gymTypes.push('rameur');
  }
  if (!gymTypes.length) {
    if (eq.has('tapis')) gymTypes.push('marche_tapis');
    else if (eq.has('velo_salle')) gymTypes.push('velo');
    else gymTypes.push('marche');
  }
  const progressive = (profile.cardioProgressive || []).filter(Boolean);
  return {
    minutes: params.cardioMin, intensity: params.cardioIntensity, types: [...new Set(gymTypes)].filter(t => CARDIO_TYPES[t]),
    progressive, why: params.cardioWhy,
    weeklyTarget: params.cardioMin * (profile.gymPerWeek || 0),
  };
}

export function buildProgram(profile, sessions, library, prevProgram = null) {
  const missing = missingForProgram(profile);
  if (missing.length) return { status: 'incomplet', missing };
  const params = goalParams(profile);
  const usage = usageCounts(sessions);
  const freq = Math.min(6, Math.max(1, profile.gymPerWeek));
  const tplIds = SPLITS[freq];
  const prevSlots = {};
  for (const d of prevProgram?.days || []) for (const sl of d.slots) if (sl.exerciseId) prevSlots[`${sl.pattern}#${sl.rank}`] = sl.exerciseId;

  const chosen = {}; // pattern#rank -> exerciseId (stable entre journées)
  const days = tplIds.map((tid, i) => {
    const tpl = DAY_TEMPLATES[tid];
    const used = new Set();
    const slots = tpl.slots.map(sl => {
      let prio = sl.prio;
      const isIso = !['squat', 'charniere', 'tirage_vertical', 'tirage_horizontal', 'poussee_horizontale', 'poussee_verticale'].includes(sl.pattern);
      if (isIso && sl.prio >= 2 && params.isoPriority < sl.prio) prio = params.isoPriority;
      const key = `${sl.pattern}#${sl.rank}`;
      let exId = chosen[key];
      let reason = '';
      if (!exId || used.has(exId)) {
        const cands = candidatesFor(sl.pattern, profile, library, { usage, prevId: prevSlots[key], role: prio })
          .filter(c => !used.has(c.ex.id));
        const otherRank = Object.entries(chosen).filter(([k]) => k.startsWith(sl.pattern + '#') && k !== key).map(([, v]) => v);
        const pick = cands.find(c => !otherRank.includes(c.ex.id)) || cands[0];
        if (pick) { exId = pick.ex.id; reason = pick.why.join(', '); chosen[key] = exId; }
      }
      if (exId) used.add(exId);
      return { key, pattern: sl.pattern, rank: sl.rank, prio, exerciseId: exId || null, reason: exId ? reason : 'Aucun exercice compatible avec ton matériel et tes exclusions' };
    });
    return { id: String.fromCharCode(65 + i), template: tid, label: tpl.label, focus: tpl.focus, slots };
  });

  const layout = WEEK_LAYOUT[freq].map((wd, i) => ({ weekday: WEEKDAYS[wd], dayId: days[i].id }));
  const g = GOALS[profile.goal];
  const priorities = [];
  if (profile.goal === 'perte_poids') priorities.push('Conserver ou augmenter les charges des mouvements principaux', 'Régularité des séances', 'Cardio d’intensité faible à modérée');
  else if (profile.goal === 'hypertrophie') priorities.push('Volume de séries par groupe musculaire', 'Progression des charges', 'Récupération');
  else if (profile.goal === 'force') priorities.push('Charges des mouvements polyarticulaires', 'Technique stable', 'Repos longs');
  else if (profile.goal === 'endurance') priorities.push('Durée du cardio', 'Séries longues à repos courts', 'Régularité');
  else priorities.push('Régularité', 'Tout le corps à chaque semaine', 'Progression graduelle');

  return {
    status: 'ok', version: 1, builtAt: new Date().toISOString(),
    goal: profile.goal, goalLabel: g.label, secondaryGoals: profile.secondaryGoals || [],
    gymPerWeek: freq, durationMin: profile.durationMin, level: profile.level,
    params: { reps: params.reps, sets: params.sets, rest: params.rest, accessoryReps: params.accessoryReps, cardioMin: params.cardioMin, cardioIntensity: params.cardioIntensity, isoPriority: params.isoPriority, forceFirst: !!params.forceFirst, weeklySets: params.weeklySets || null },
    explanation: params.notes,
    priorities,
    cardio: cardioPlan(profile, params),
    weekPlan: layout,
    days,
    rules: PROGRESSION_RULES,
    adaptationCriteria: [
      'Temps disponible du jour : les exercices de priorité 3 puis 2 sont retirés en premier.',
      'Fatigue déclarée : une série de moins, pas d’augmentation de charge, cardio léger.',
      'Point d’attention du jour : progression suspendue sur les mouvements concernés et alternatives proposées.',
      'Activité soutenue récente (vélo, course, randonnée) : volume des jambes réduit.',
      'Objectif cardio de la semaine déjà atteint grâce aux activités : cardio de séance raccourci.',
      'Séance manquée : on reprend la suivante dans l’ordre, sans cumuler le travail prévu.',
    ],
  };
}
