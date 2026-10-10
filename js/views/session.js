import { h, clear, uid, fmtNum, fmtDate, todayISO, nowISO, debounce, fmtClock, fmtDuration } from '../util.js';
import { S, getEx, allExercises, saveRecord, deleteRecord, saveProfile, draftSession, registerFlusher, companionSync, companionProgress } from '../state.js';
import { CARDIO_TYPES, ZONES, EFFORTS, INTENSITIES, LOADS } from '../data/exercises.js';
import { suggestSession, comparableEntriesAnyVariant, lastCardio, exerciseConcernsZone, describeSets } from '../engine/suggest.js';
import { missingForProgram } from '../engine/program.js';
import { workSets, exKey, doneSessions, summarizeSets } from '../engine/stats.js';
import { weightAt, cardioEntryCalories } from '../engine/calories.js';
import { btn, iconBtn, icon, field, textInput, textArea, numInput, dateInput, selectInput, chips, segmented, pageHeader, section, note, confirmDialog, toast, sheet } from '../ui/components.js';
import { ENERGY, SESSION_DIFFICULTY, KCAL_CONVENTIONS, KCAL_SOURCES, kcalResultText, weightNote } from './common.js';
import { openExercisePicker } from './exercises.js';
import { clarificationCards } from './attention.js';
import { completeProgramCard } from './program.js';
import { renderCompanion, react, confetti, companionName } from '../companion/view.js';
import { celebrate } from './companion.js';
import { rerender, go } from '../router.js';

// ---------- Fabrication des entrées ----------
function newSet(type = 'work', load = null, ph = {}) {
  return { id: uid(), type, load, reps: null, seconds: null, done: false, ph };
}

export function strengthEntry(ex, { n = null, load, repsPh, secondsPh, target = null, variant = '', equipmentNote = '' } = {}) {
  const last = comparableEntriesAnyVariant(S.data.sessions, ex.id)[0];
  let sets = [];
  if (n === null && last) {
    sets = workSets(last.entry).map(st => newSet('work', st.load, { reps: st.reps, seconds: st.seconds }));
    variant = variant || last.entry.variant || '';
    equipmentNote = equipmentNote || last.entry.equipmentNote || '';
  } else {
    for (let i = 0; i < (n ?? 3); i++) sets.push(newSet('work', load ?? null, { reps: repsPh ?? null, seconds: secondsPh ?? null }));
  }
  if (!sets.length) sets = [newSet('work', null, {})];
  return { id: uid(), kind: 'strength', exerciseId: ex.id, name: ex.name, variant, equipmentNote, sets, setsCountKnown: true, effort: null, notes: '', target };
}

export function cardioEntry(type, { minutesPh = null, target = null } = {}) {
  const ct = CARDIO_TYPES[type] || CARDIO_TYPES.autre;
  const lc = lastCardio(S.data.sessions, type);
  const ph = lc ? { durationMin: lc.entry.durationIsMinimum ? null : lc.entry.durationMin, speedKmh: lc.entry.speedKmh, inclinePct: lc.entry.inclinePct } : {};
  if (minutesPh) ph.durationMin = minutesPh;
  return { id: uid(), kind: 'cardio', exerciseId: ct.exerciseId, cardioType: type, name: ct.label, durationMin: null, durationIsMinimum: false, distanceKm: null, speedKmh: null, inclinePct: null, intensity: null, notes: '', calories: null, ph, target };
}

export function newSessionObj(fields = {}) {
  return {
    id: uid(), profileId: S.profile.id, date: todayISO(), status: 'draft', startedAt: nowISO(), endedAt: null,
    durationMin: null, durationSource: null, energy: null, difficulty: null, notes: '', pain: null,
    programDayId: null, suggestion: null, feedback: null, calories: null, todayCheck: null, entries: [], ui: { cur: 0 }, ...fields,
  };
}

async function startDraft(sess) {
  if (draftSession()) { toast('Une séance est déjà en cours : reprends-la ou termine-la d’abord.', { kind: 'error' }); go('#/seance'); return; }
  await saveRecord('sessions', sess);
  go('#/seance');
}

function lastRepsAt(exId, load) {
  const c = comparableEntriesAnyVariant(S.data.sessions, exId)[0];
  if (!c) return null;
  const ws = workSets(c.entry).filter(s => load === null || s.load === load);
  return ws.length ? Math.max(...ws.map(s => s.reps || 0)) || null : null;
}

// Crée la séance à partir d'une suggestion et mémorise les réponses du jour.
async function startFromSuggestion(sg, opts, attState) {
  const p = S.profile;
  if (opts.attentionChecked) {
    for (const a of p.attention || []) {
      const v = attState[a.zone] || 'rien';
      a.lastStatus = { painFree: v === 'rien', level: v === 'rien' ? null : v, date: todayISO(), note: '' };
    }
    if ((p.attention || []).length) await saveProfile(p, { rebuild: false });
  }
  const entries = sg.items.map(it => {
    const ex = getEx(it.exerciseId);
    const load = it.advice.load ?? null;
    const repsPh = it.advice.reps ?? (it.advice.kind === 'increase' ? it.range[0] : Math.min(it.range[1], Math.max(it.range[0], lastRepsAt(ex.id, load) ?? it.range[0])));
    return strengthEntry(ex, { n: it.sets, load, repsPh: ex.measure === 'time' ? null : repsPh, secondsPh: it.advice.seconds ?? null, variant: it.variant, equipmentNote: it.equipmentNote,
      target: { range: it.range, rest: it.rest, advice: it.advice.text, basis: it.advice.basis, flags: it.flags, replacement: it.replacement, prio: it.prio, sets: it.sets, pattern: it.pattern } });
  });
  if (sg.cardio) entries.push(cardioEntry(sg.cardio.cardioType, { minutesPh: sg.cardio.minutes, target: { advice: `${sg.cardio.minutes} min, intensité ${sg.cardio.intensity}. ${sg.cardio.detail}`, flags: sg.cardio.runOption ? [sg.cardio.runOption] : [] } }));
  await startDraft(newSessionObj({
    entries, energy: opts.energy, programDayId: sg.dayId,
    suggestion: { title: sg.title, reasons: sg.reasons, warmup: sg.warmup, estMinutes: sg.estMinutes, budget: sg.budget },
    todayCheck: { minutes: opts.minutes, energy: opts.energy, attentionChecked: opts.attentionChecked, attention: opts.attention, focus: opts.focus },
  }));
}

// ---------- Questions du jour (temps, énergie, points d'attention) ----------
function todayQuestions(p, opts, attState, onChange) {
  const wrap = h('div', { class: 'stack' });
  const attWrap = h('div', { class: 'stack-sm' });
  const known = (p.attention || []).map(a => a.zone);
  const update = () => { opts.attention = Object.entries(attState).filter(([, v]) => v === 'gene' || v === 'douleur').map(([zone, level]) => ({ zone, level })); onChange(); };
  const drawAtt = (open) => {
    clear(attWrap);
    if (!open) return;
    const row = (z) => h('div', { class: 'att-row' }, h('span', { class: 'att-zone', text: ZONES[z] }), segmented({ rien: 'Rien', gene: 'Gêne', douleur: 'Douleur' }, attState[z] || 'rien', v => { attState[z] = v || 'rien'; update(); }, { label: ZONES[z] }));
    known.forEach(z => attWrap.append(row(z)));
    const others = Object.keys(ZONES).filter(z => !known.includes(z));
    const det = h('details', { class: 'more' }, h('summary', { text: known.length ? 'Une autre zone' : 'Choisir la zone' }), ...others.map(row));
    if (!known.length) det.open = true;
    attWrap.append(det);
  };
  wrap.append(
    h('div', { class: 'prep-q' }, h('span', { class: 'label', text: 'Temps disponible' }), segmented(['30', '45', '60', '90'].map(v => ({ value: v, label: v + ' min' })), String(opts.minutes), v => { opts.minutes = Number(v) || p.durationMin || 60; onChange(); }, { label: 'Temps disponible' })),
    h('div', { class: 'prep-q' }, h('span', { class: 'label', text: 'Énergie du jour' }), segmented(ENERGY, opts.energy, v => { opts.energy = v; onChange(); }, { allowNone: true, label: 'Énergie du jour' })),
    h('div', { class: 'prep-q' }, h('span', { class: 'label', text: 'Un point d’attention aujourd’hui ?' }),
      segmented({ non: 'Non', oui: 'Oui' }, null, v => { opts.attentionChecked = !!v; if (v !== 'oui') for (const k of Object.keys(attState)) delete attState[k]; drawAtt(v === 'oui'); update(); }, { allowNone: true, label: 'Point d’attention aujourd’hui' }),
      attWrap,
      known.length ? h('p', { class: 'fine', text: `Zones de ton profil : ${known.map(z => ZONES[z]).join(', ')}. Réponds pour aujourd’hui : une absence de douleur passée ne vaut pas pour le jour même.` }) : null));
  return wrap;
}

export function openQuickStart() {
  const p = S.profile;
  if (draftSession() || missingForProgram(p).length) { go('#/seance'); return; }
  const opts = { minutes: p.durationMin || 60, energy: null, attention: [], attentionChecked: false, focus: null };
  const attState = {};
  const summary = h('p', { class: 'fine', 'aria-live': 'polite' });
  const compute = () => suggestSession({ profile: p, program: p.program, sessions: S.data.sessions, activities: S.data.activities, today: todayISO(), options: opts, library: allExercises(), getEx });
  const refresh = () => { const sg = compute(); summary.textContent = `${sg.title} : ≈ ${sg.estMinutes} min, ${sg.items.length} exercices${sg.cardio ? ' + cardio' : ''}.${sg.overBudget ? ' Dépasse le temps choisi : tu pourras retirer un exercice.' : ''}${opts.attentionChecked ? '' : ' Point d’attention non renseigné.'}`; };
  const sh = sheet({ title: 'Avant de commencer', content: h('div', { class: 'stack' }, todayQuestions(p, opts, attState, refresh), summary,
    h('button', { type: 'button', class: 'link-btn', onclick: () => { sh.close(); go('#/seance/preparer'); } }, 'Voir le détail et adapter')),
  actions: [btn('Commencer la séance', async () => { const sg = compute(); sh.close(); await startFromSuggestion(sg, opts, attState); }, { kind: 'primary', iconName: 'seance' })] });
  refresh();
}

// ---------- Hub Séance ----------
export function renderSessionHub(root) {
  const draft = draftSession();
  if (draft) return renderEditor(root, draft, { mode: 'live' });
  const p = S.profile;
  root.append(pageHeader('Séance'));
  if (missingForProgram(p).length) root.append(completeProgramCard(p));
  else root.append(h('section', { class: 'card card-hero' },
    h('h2', { class: 'card-title', text: 'Séance proposée' }),
    h('p', { class: 'muted', text: 'Temps, énergie, points d’attention : trois réponses et la séance s’adapte.' }),
    h('div', { class: 'row' }, btn('Commencer', () => openQuickStart(), { kind: 'light', iconName: 'seance' }), btn('Adapter', () => go('#/seance/preparer'), { kind: 'outline-light' }))));
  root.append(section('Autres façons de commencer', h('div', { class: 'stack' },
    btn('Séance libre', () => startDraft(newSessionObj()), { iconName: 'plus' }),
    btn('À partir d’un modèle', () => pickTemplate(), { iconName: 'copy' }),
    btn('Refaire une séance passée', () => pickPastSession(), { iconName: 'historique' }),
    btn('Noter une séance déjà faite', () => pastSessionDialog(), { iconName: 'calendar' }))));
}

function pickTemplate() {
  const tpls = S.data.templates;
  const sh = sheet({ title: 'Modèles de séance', content: tpls.length ? h('ul', { class: 'list' }, ...tpls.map(t => h('li', {}, h('button', { type: 'button', class: 'list-link', onclick: () => { sh.close(); startDraft(newSessionObj({ entries: t.entries.map(instantiate) })); } },
    h('span', { class: 'grow', text: t.name }), h('span', { class: 'muted', text: `${t.entries.length} exercice(s)` }))))) :
    h('p', { class: 'muted', text: 'Aucun modèle. Depuis l’historique, ouvre une séance puis « Enregistrer comme modèle ».' }) });
}

// Copie d'une entrée : charges conservées, répétitions en suggestion, rien de validé.
function instantiate(e) {
  if (e.kind === 'cardio') return { ...JSON.parse(JSON.stringify(e)), id: uid(), ph: { durationMin: e.durationIsMinimum ? null : e.durationMin, speedKmh: e.speedKmh, inclinePct: e.inclinePct }, durationMin: null, durationIsMinimum: false, distanceKm: null, speedKmh: null, inclinePct: null, calories: null };
  return { ...JSON.parse(JSON.stringify(e)), id: uid(), effort: null, notes: '', setsCountKnown: true, target: null,
    sets: (e.sets || []).map(st => ({ id: uid(), type: st.type, load: st.load ?? null, reps: null, seconds: null, done: false, ph: { reps: st.reps, seconds: st.seconds } })) };
}

function pickPastSession() {
  const list = doneSessions(S.data.sessions).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  const sh = sheet({ title: 'Refaire une séance', content: list.length ? h('ul', { class: 'list' }, ...list.map(s => h('li', {}, h('button', { type: 'button', class: 'list-link', onclick: () => { sh.close(); startDraft(newSessionObj({ entries: s.entries.map(instantiate) })); } },
    h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: fmtDate(s.date, { weekday: true }) }), h('span', { class: 'fine', text: s.entries.map(e => e.name).slice(0, 3).join(', ') })))))) :
    h('p', { class: 'muted', text: 'Aucune séance terminée pour l’instant.' }) });
}

function pastSessionDialog() {
  let date = todayISO();
  const sh = sheet({ title: 'Séance déjà faite', content: h('div', {}, field('Date de la séance', dateInput(date, { max: todayISO(), oninput: v => { date = v; } })),
    h('p', { class: 'fine', text: 'La durée ne sera pas mesurée : tu pourras la saisir si tu la connais.' })),
  actions: [btn('Commencer la saisie', () => { sh.close(); startDraft(newSessionObj({ date, startedAt: null })); }, { kind: 'primary' })] });
}

// ---------- Préparation détaillée (Adapter) ----------
export function renderPrepare(root) {
  const p = S.profile;
  if (draftSession()) { go('#/seance'); return; }
  if (missingForProgram(p).length) { root.append(pageHeader('Adapter la séance', { back: '#/seance' }), completeProgramCard(p)); return; }
  const opts = { minutes: p.durationMin || 60, energy: null, attention: [], attentionChecked: false, focus: null, dayId: null };
  const attState = {};
  root.append(pageHeader('Adapter la séance', { back: '#/accueil' }));
  const preview = h('div', { class: 'stack', 'aria-live': 'polite' });
  root.append(todayQuestions(p, opts, attState, () => draw()));
  root.append(h('div', { class: 'prep-q' }, h('span', { class: 'label', text: 'Davantage de…' }), segmented({ haut: 'Haut du corps', bas: 'Bas du corps', cardio: 'Cardio' }, null, v => { opts.focus = v; draw(); }, { allowNone: true, cls: 'seg-wrap', label: 'Orientation' })));
  for (const c of clarificationCards(p, () => rerender())) root.append(c);
  root.append(preview);
  function draw() {
    clear(preview);
    const sg = suggestSession({ profile: p, program: p.program, sessions: S.data.sessions, activities: S.data.activities, today: todayISO(), options: opts, library: allExercises(), getEx });
    if (sg.needsProgram) { preview.append(note('Programme à recalculer depuis « Mon programme ».', 'warning')); return; }
    preview.append(h('div', { class: 'card' },
      h('div', { class: 'row-between' }, h('h2', { class: 'card-title', text: sg.title }), h('span', { class: 'tag tag-accent', text: `≈ ${sg.estMinutes} min` })),
      h('label', { class: 'row fine' }, 'Journée du programme : ', selectInput(Object.fromEntries(p.program.days.map(d => [d.id, d.label])), sg.dayId, { oninput: v => { opts.dayId = v; draw(); } })),
      sg.overBudget ? note(`Les exercices essentiels dépassent tes ${sg.budget} minutes. Tu pourras en retirer un pendant la séance.`, 'warning') : null,
      ...sg.conflicts.map(c => note(c, 'warning')),
      h('ol', { class: 'plan' }, ...sg.items.map(it => h('li', { class: 'plan-item' },
        h('div', { class: 'row-between' }, h('strong', { text: it.name }), h('span', { class: 'tag', text: it.measure === 'time' ? `${it.sets} × ${it.targetSeconds ? it.targetSeconds + ' s' : 'durée libre'}` : `${it.sets} × ${it.range[0]}–${it.range[1]}` })),
        h('p', { class: 'fine', text: it.advice.load !== null && it.advice.load !== undefined ? `${fmtNum(it.advice.load, 2)} kg${it.loadType === 'assist' ? ' d’assistance' : ''}` : it.advice.kind === 'start' ? 'Charge à déterminer' : '' }),
        ...it.flags.map(f => h('p', { class: 'flag', text: f }))))),
      sg.cardio ? h('p', { class: 'fine', text: `Cardio : ${sg.cardio.label.toLowerCase()}, ${sg.cardio.minutes} min${sg.cardio.optional ? ' (facultatif)' : ''}.` }) : null,
      h('details', { class: 'more' }, h('summary', { text: 'Pourquoi cette séance' }), h('ul', { class: 'bullets fine' }, ...sg.reasons.map(r => h('li', { text: r }))),
        h('p', { class: 'fine' }, sg.dataUsed.join(' ; ') + '. ', h('a', { href: '#/attention', text: 'Mes points d’attention' }), ' · ', h('a', { href: '#/programme', text: 'Mon programme' }))),
      btn('Commencer cette séance', () => startFromSuggestion(sg, opts, attState), { kind: 'primary', iconName: 'seance', cls: 'btn-wide' })));
  }
  draw();
}

// ---------- Minuteur de repos (dans la barre de séance) ----------
const rest = { endAt: 0, timer: null };
function restEl() { return document.getElementById('restbar'); }
export function startRest(sec) {
  rest.endAt = Date.now() + sec * 1000;
  clearInterval(rest.timer);
  rest.timer = setInterval(drawRest, 250);
  drawRest();
}
function stopRest() { clearInterval(rest.timer); rest.timer = null; rest.endAt = 0; const b = restEl(); if (b) { b.hidden = true; clear(b); } }
function drawRest() {
  const b = restEl(); if (!b) return;
  if (!rest.endAt) { b.hidden = true; return; }
  const left = (rest.endAt - Date.now()) / 1000;
  clear(b); b.hidden = false;
  if (left <= 0) {
    if (rest.timer) navigator.vibrate?.([180, 90, 180]);
    clearInterval(rest.timer); rest.timer = null;
    b.classList.add('done');
    b.append(h('span', { class: 'rest-txt', text: 'Repos terminé' }), iconBtn('close', 'Fermer', stopRest));
    setTimeout(() => { if (!rest.timer && rest.endAt && Date.now() - rest.endAt > 5000) stopRest(); }, 6000);
    return;
  }
  b.classList.remove('done');
  b.append(icon('timer', { size: 18 }), h('span', { class: 'rest-txt', text: `Repos ${fmtClock(left)}` }),
    btn('−15 s', () => { rest.endAt -= 15000; drawRest(); }, { small: true }), btn('+15 s', () => { rest.endAt += 15000; drawRest(); }, { small: true }),
    iconBtn('close', 'Arrêter le minuteur', stopRest));
}

// ---------- Éditeur de séance ----------
let unregisterFlush = null;
const SET_TYPES = ['work', 'warmup', 'ramp', 'drop'];
const SET_TYPE_LABEL = { work: 'série de travail', warmup: 'échauffement', ramp: 'série de montée en charge', drop: 'série allégée' };

export function renderEditSession(root, id) {
  const s = S.data.sessions.find(x => x.id === id);
  if (!s) { root.append(pageHeader('Séance introuvable', { back: '#/historique' })); return; }
  if (s.status === 'draft') { go('#/seance'); return; }
  renderEditor(root, s, { mode: 'edit' });
}

function entryDone(e) {
  if (e.kind === 'cardio') return !!(e.durationMin || e.distanceKm);
  return e.sets.length > 0 && e.sets.every(s => s.done);
}

export function renderEditor(root, sess, { mode }) {
  const p = S.profile;
  const live = mode === 'live';
  const persist = () => saveRecord('sessions', sess);
  const save = debounce(() => persist().catch(() => {}), 350);
  if (unregisterFlush) unregisterFlush();
  unregisterFlush = registerFlusher(() => persist());
  sess.ui = sess.ui || { cur: 0 };
  const firstOpen = sess.entries.findIndex(e => !entryDone(e));
  let cur = Math.min(sess.ui.cur ?? Math.max(0, firstOpen), Math.max(0, sess.entries.length - 1));
  const comp = p.companion && !p.companion.hidden ? p.companion : null;
  const level = comp ? companionProgress(p).level : 1;
  const ownerName = S.profiles.find(x => x.id === sess.profileId)?.name || p.name;

  // Barre de séance (fixe en haut, ne recouvre aucun champ)
  const miniHost = comp ? h('span', { class: 'mini-host', 'aria-hidden': 'true' }, renderCompanion(comp, { level, decor: false, cls: 'mini' })) : null;
  const elapsedEl = h('span', { class: 'elapsed' });
  const progEl = h('span', { style: { width: '0%' } });
  const sbar = h('div', { class: 'sbar' },
    h('div', { class: 'sbar-top' }, miniHost,
      h('div', { class: 'grow' }, h('div', { class: 'sbar-title', text: live ? (sess.suggestion?.title || 'Séance libre') : `Modifier la séance du ${fmtDate(sess.date)}` }), h('div', { class: 'fine', text: `Séance de ${ownerName}` })),
      live && sess.startedAt ? elapsedEl : null,
      iconBtn('list', 'Voir toute la séance', () => overview()),
      btn(live ? 'Terminer' : 'Enregistrer', () => finishDialog(), { small: true, kind: 'primary' })),
    h('div', { class: 'sprog', role: 'progressbar', 'aria-label': 'Séries validées' }, progEl),
    h('div', { id: 'restbar', class: 'rest', role: 'status', 'aria-live': 'polite', hidden: true }));
  root.append(sbar);
  if (live && sess.startedAt) {
    const tick = () => { elapsedEl.textContent = fmtClock((Date.now() - new Date(sess.startedAt)) / 1000); };
    tick();
    const t = setInterval(() => { if (!elapsedEl.isConnected) { clearInterval(t); return; } tick(); }, 1000);
  }
  if (rest.endAt) drawRest();

  const nav = h('div', { class: 'ex-nav' });
  const body = h('div', { class: 'stack' });
  root.append(nav, body);

  function updateProgress() {
    let total = 0, done = 0;
    for (const e of sess.entries) {
      if (e.kind === 'cardio') { total++; if (entryDone(e)) done++; }
      else { total += e.sets.length; done += e.sets.filter(s => s.done).length; }
    }
    progEl.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
  }
  function setCur(i) { cur = Math.max(0, Math.min(i, sess.entries.length - 1)); sess.ui.cur = cur; save(); drawAll(); window.scrollTo({ top: 0 }); }

  function drawAll() {
    clear(nav); clear(body);
    updateProgress();
    if (!sess.entries.length) {
      body.append(h('div', { class: 'empty' }, h('p', { class: 'empty-title', text: 'Séance vide' }), h('p', { class: 'muted', text: 'Ajoute un premier exercice pour commencer.' }),
        h('div', { class: 'row' }, btn('Ajouter un exercice', addExercise, { kind: 'primary', iconName: 'plus' }), btn('Ajouter du cardio', addCardio, { iconName: 'plus' }))));
      return;
    }
    nav.append(iconBtn('back', 'Exercice précédent', () => setCur(cur - 1)),
      h('span', { class: 'ex-count', text: `Exercice ${cur + 1} sur ${sess.entries.length}` }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Exercice suivant', onclick: () => setCur(cur + 1) }, icon('chevron')));
    nav.firstChild.disabled = cur === 0; nav.lastChild.disabled = cur >= sess.entries.length - 1;
    const e = sess.entries[cur];
    body.append(e.kind === 'cardio' ? cardioCard(e, cur) : strengthCard(e, cur));
    const isLast = cur >= sess.entries.length - 1;
    body.append(h('div', { class: 'row' },
      isLast ? btn(live ? 'Terminer la séance' : 'Enregistrer', () => finishDialog(), { kind: entryDone(e) ? 'primary' : 'secondary', iconName: 'check', cls: 'grow' })
        : btn('Exercice suivant', () => setCur(cur + 1), { kind: entryDone(e) ? 'primary' : 'secondary', cls: 'grow' }),
      btn('Ajouter', () => addMenu(), { iconName: 'plus' })));
    if (sess.suggestion?.warmup && cur === 0) body.append(h('details', { class: 'box' }, h('summary', { text: 'Échauffement conseillé' }), h('ul', { class: 'bullets fine' }, ...sess.suggestion.warmup.map(w => h('li', { text: w })))));
  }

  function addMenu() {
    const sh = sheet({ title: 'Ajouter', content: h('div', { class: 'add-menu' },
      btn('Un exercice de musculation', () => { sh.close(); addExercise(); }, { iconName: 'seance' }),
      btn('Du cardio', () => { sh.close(); addCardio(); }, { iconName: 'bike' })) });
  }
  function addExercise() {
    openExercisePicker({ mode: 'add', cat: 'muscu', todayAttention: sess.todayCheck?.attention || [], title: 'Ajouter un exercice', onPick: (ex) => { sess.entries.push(strengthEntry(ex)); save(); setCur(sess.entries.length - 1); } });
  }
  function addCardio() {
    const sh = sheet({ title: 'Type de cardio', content: h('div', { class: 'stack' }, ...Object.entries(CARDIO_TYPES).map(([k, v]) => btn(v.label, () => { sh.close(); sess.entries.push(cardioEntry(k)); save(); setCur(sess.entries.length - 1); }))) });
  }

  function overview() {
    const list = h('ul', { class: 'list overview' });
    const drawList = () => {
      clear(list);
      sess.entries.forEach((e, i) => {
        const state = e.kind === 'cardio' ? (entryDone(e) ? 'fait' : 'à faire') : `${e.sets.filter(s => s.done).length}/${e.sets.length} séries`;
        list.append(h('li', { class: `list-row${i === cur ? ' current' : ''}` },
          h('button', { type: 'button', class: 'link-btn grow', style: { textAlign: 'left', textDecoration: 'none', color: 'inherit' }, onclick: () => { sh.close(); setCur(i); } },
            h('span', { class: 'block-txt strong', text: `${i + 1}. ${e.name}` }), h('span', { class: 'fine', text: state })),
          iconBtn('up', `Monter ${e.name}`, () => { if (i > 0) { [sess.entries[i - 1], sess.entries[i]] = [sess.entries[i], sess.entries[i - 1]]; if (cur === i) cur--; else if (cur === i - 1) cur++; save(); drawList(); drawAll(); } }),
          iconBtn('down', `Descendre ${e.name}`, () => { if (i < sess.entries.length - 1) { [sess.entries[i + 1], sess.entries[i]] = [sess.entries[i], sess.entries[i + 1]]; if (cur === i) cur++; else if (cur === i + 1) cur--; save(); drawList(); drawAll(); } }),
          iconBtn('trash', `Retirer ${e.name}`, async () => {
            if (!await confirmDialog(`Retirer « ${e.name} » de la séance ?`, { confirmLabel: 'Retirer', danger: true })) return;
            sess.entries.splice(i, 1); cur = Math.min(cur, Math.max(0, sess.entries.length - 1)); sess.ui.cur = cur; save(); drawList(); drawAll();
          })));
      });
    };
    drawList();
    const sh = sheet({ title: 'Toute la séance', wide: true, content: h('div', { class: 'stack' }, list,
      live ? btn('Abandonner la séance', async () => {
        if (!await confirmDialog('Abandonner cette séance ? Les séries saisies seront supprimées.', { danger: true, confirmLabel: 'Abandonner' })) return;
        sh.close(); stopRest(); if (unregisterFlush) { unregisterFlush(); unregisterFlush = null; } await deleteRecord('sessions', sess.id); go('#/accueil');
      }, { kind: 'danger', small: true }) : btn('Annuler les modifications', () => { sh.close(); go(`#/historique/s/${sess.id}`); }, { kind: 'ghost', small: true })),
    actions: [btn('Exercice', () => { sh.close(); addExercise(); }, { iconName: 'plus' }), btn('Cardio', () => { sh.close(); addCardio(); }, { iconName: 'plus' })] });
  }

  function replaceEntry(i) {
    const e = sess.entries[i];
    const ex = getEx(e.exerciseId);
    openExercisePicker({ mode: 'replace', cat: 'muscu', pattern: ex?.pattern || e.target?.pattern || null, current: ex, todayAttention: sess.todayCheck?.attention || [], title: `Remplacer ${e.name}`, onPick: (nex) => {
      // Rôle conservé, charge jamais transférée : seules les valeurs déjà notées sur le nouvel exercice sont reprises.
      const ne = strengthEntry(nex, { n: Math.max(1, e.sets.filter(st => st.type !== 'warmup').length) });
      const last = comparableEntriesAnyVariant(S.data.sessions, nex.id)[0];
      if (last) { const ws = workSets(last.entry); ne.sets.forEach((st, k) => { const ref = ws[Math.min(k, ws.length - 1)]; st.load = ref ? ref.load : null; st.ph = { reps: ref?.reps ?? null, seconds: ref?.seconds ?? null }; }); }
      else ne.sets.forEach(st => { st.load = null; });
      ne.target = { ...(e.target || {}), replacement: null, flags: [`Remplace ${e.name} : charge non transférée`],
        advice: last ? `Charges reprises de ta dernière séance sur ${nex.name}.` : 'Nouvel exercice : détermine une charge de départ confortable sur une première série.' };
      sess.entries[i] = ne; save(); drawAll();
      toast(`${e.name} remplacé par ${nex.name}.`);
    } });
  }

  function strengthCard(e, i) {
    const ex = getEx(e.exerciseId) || { measure: 'load_reps', load: 'total', name: e.name, inc: 2.5, cues: '', caution: '' };
    const isTime = ex.measure === 'time';
    const card = h('article', { class: 'entry', 'aria-label': e.name });
    card.append(h('div', { class: 'entry-head' }, h('h2', { class: 'entry-title', text: e.name }),
      iconBtn('swap', 'Remplacer cet exercice', () => replaceEntry(i)),
      iconBtn('trash', 'Retirer cet exercice', async () => { if (!await confirmDialog(`Retirer « ${e.name} » ?`, { confirmLabel: 'Retirer', danger: true })) return; sess.entries.splice(i, 1); cur = Math.min(cur, Math.max(0, sess.entries.length - 1)); sess.ui.cur = cur; save(); drawAll(); })));
    if (e.target && e.target.range) card.append(h('p', { class: 'target' },
      h('span', { class: 'tag tag-accent', text: isTime ? `${e.target.sets || e.sets.length} séries` : `${e.target.sets || e.sets.length} × ${e.target.range[0]}–${e.target.range[1]}` }),
      e.target.rest ? h('span', { class: 'tag', text: `repos ${e.target.rest} s` }) : null));
    // Alertes visibles en permanence pour l'exercice en cours
    for (const f of (e.target?.flags || [])) card.append(h('p', { class: 'flag', text: f }));
    if (e.target?.replacement) card.append(btn(`Remplacer par ${e.target.replacement.name}`, () => {
      const nex = getEx(e.target.replacement.exerciseId);
      const ne = strengthEntry(nex, { n: e.target.sets || 3 });
      if (!comparableEntriesAnyVariant(S.data.sessions, nex.id).length) ne.sets.forEach(st => { st.load = null; });
      ne.target = { ...e.target, replacement: null, advice: 'Alternative proposée pour épargner la zone douloureuse ; charge non transférée.', flags: [] };
      sess.entries[i] = ne; save(); drawAll();
    }, { small: true, iconName: 'swap' }));
    // Valeurs précédentes, faciles à reprendre
    const last = comparableEntriesAnyVariant(S.data.sessions, e.exerciseId).filter(c => c.session.id !== sess.id)[0];
    if (last) {
      const ws = workSets(last.entry);
      card.append(h('div', { class: 'prev' }, h('span', { class: 'grow' }, h('span', { class: 'fine block-txt', text: `Dernière fois, ${fmtDate(last.session.date)}` }), h('span', { class: 'strong', text: describeSets(ws, { assist: ex.load === 'assist', time: isTime }) })),
        btn('Reprendre', () => {
          e.sets.filter(st => !st.done && st.type !== 'warmup').forEach((st, k) => { const ref = ws[Math.min(k, ws.length - 1)]; if (!ref) return; st.load = ref.load ?? st.load; if (isTime) st.seconds = ref.seconds; else st.reps = ref.reps; });
          save(); drawAll(); toast('Valeurs de la dernière fois reprises.');
        }, { small: true })));
    }
    const unitLabel = ex.load === 'assist' ? 'Assistance (kg)' : ex.load === 'per_dumbbell' ? 'Kg / haltère' : ex.load === 'bodyweight' ? 'Lest (kg)' : 'Charge (kg)';
    const table = h('div', { class: 'sets', role: 'table', 'aria-label': `Séries de ${e.name}` });
    table.append(h('div', { class: 'set-row set-head', role: 'row' }, h('span', { role: 'columnheader', text: 'Série' }), h('span', { role: 'columnheader', text: ex.load === 'none' ? '' : unitLabel }), h('span', { role: 'columnheader', text: isTime ? 'Secondes' : 'Répétitions' }), h('span', { role: 'columnheader', class: 'sr-only', text: 'Valider' })));
    let workN = 0;
    e.sets.forEach((st, k) => {
      const type = st.type || 'work';
      if (type !== 'warmup') workN++;
      const row = h('div', { class: `set-row${st.done ? ' done' : ''}${type === 'warmup' ? ' warm' : ''}${type === 'ramp' ? ' ramp' : ''}${type === 'drop' ? ' drop' : ''}`, role: 'row' });
      const nextType = SET_TYPES[(SET_TYPES.indexOf(type) + 1) % SET_TYPES.length];
      const typeBtn = h('button', { type: 'button', class: 'set-type', 'aria-label': `Série ${k + 1} : ${SET_TYPE_LABEL[type]}. Toucher pour la marquer comme ${SET_TYPE_LABEL[nextType]}`, title: SET_TYPE_LABEL[type],
        onclick: () => { st.type = nextType; save(); drawAll(); } }, type === 'warmup' ? 'É' : type === 'ramp' ? 'M' : type === 'drop' ? 'A' : String(workN));
      const loadIn = ex.load === 'none' ? h('span', {}) : numInput(st.load, { placeholder: st.ph?.load ?? '', ariaLabel: `${unitLabel}, série ${k + 1}`, oninput: v => { st.load = v; save(); } });
      const repIn = numInput(isTime ? st.seconds : st.reps, { decimals: 0, placeholder: isTime ? (st.ph?.seconds ?? '') : (st.ph?.reps ?? ''), ariaLabel: `${isTime ? 'Secondes' : 'Répétitions'}, série ${k + 1}`, oninput: v => { if (isTime) st.seconds = v; else st.reps = v; save(); } });
      const ok = h('button', { type: 'button', class: 'set-ok', 'aria-pressed': String(!!st.done), 'aria-label': st.done ? `Série ${k + 1} validée, toucher pour annuler` : `Valider la série ${k + 1}`, onclick: () => {
        if (st.done) { st.done = false; save(); drawAll(); return; }
        if (isTime) { if (st.seconds === null && st.ph?.seconds) st.seconds = st.ph.seconds; }
        else if (st.reps === null && st.ph?.reps) st.reps = st.ph.reps;
        if ((isTime ? st.seconds : st.reps) === null) { toast(isTime ? 'Indique la durée tenue.' : 'Indique le nombre de répétitions.', { kind: 'error' }); repIn.focus(); return; }
        if (['total', 'per_dumbbell', 'assist'].includes(ex.load) && (st.load === null || st.load === undefined)) { toast(ex.load === 'assist' ? 'Indique l’assistance utilisée.' : 'Indique la charge utilisée.', { kind: 'error' }); loadIn.focus && loadIn.focus(); return; }
        st.done = true; save(); drawAll();
        const rows = body.querySelectorAll('.set-row:not(.set-head)');
        rows[k]?.classList.add('just-done');
        if (miniHost) react(miniHost, comp, level, 'joie');
        if (live && type !== 'warmup') startRest(e.target?.rest || S.settings.restSeconds || 90);
      } }, icon('check', { size: 22 }));
      row.append(typeBtn, loadIn, repIn, ok);
      table.append(row);
    });
    card.append(table);
    card.append(h('div', { class: 'set-tools' },
      btn('Série', () => { const lst = e.sets[e.sets.length - 1]; e.sets.push(newSet('work', lst ? lst.load : null, { reps: lst ? (lst.reps ?? lst.ph?.reps) : null, seconds: lst ? (lst.seconds ?? lst.ph?.seconds) : null })); save(); drawAll(); }, { small: true, iconName: 'plus' }),
      btn('Échauffement', () => { e.sets.unshift(newSet('warmup', null, {})); save(); drawAll(); }, { small: true, iconName: 'plus' }),
      e.sets.length > 1 ? btn('Retirer la dernière', () => { e.sets.pop(); save(); drawAll(); }, { small: true, kind: 'ghost' }) : null));
    if (e.setsCountKnown === false) card.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (ev) => { e.setsCountKnown = ev.target.checked; save(); } }), ' Le nombre de séries est connu'));
    card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Ressenti (facultatif)' }),
      segmented(Object.fromEntries(Object.entries(EFFORTS).map(([k, v]) => [k, v.label])), e.effort, v => { e.effort = v; save(); }, { allowNone: true, cls: 'seg-wrap', label: 'Ressenti' })));
    card.append(h('details', { class: 'more' }, h('summary', { text: 'Conseils, machine et notes' }),
      e.target?.advice ? h('p', { class: 'fine', text: e.target.advice }) : null,
      ex.cues ? h('p', { class: 'fine', text: 'Consignes : ' + ex.cues }) : null,
      ex.caution ? h('p', { class: 'fine', text: 'Attention : ' + ex.caution }) : null,
      h('p', { class: 'fine', text: `Bouton de série : chiffre = travail, É = échauffement (exclu des calculs), M = montée en charge, A = série allégée. ${Object.values(EFFORTS).map(x => `${x.label} : ${x.help}`).join(' ')}` }),
      field('Variante', textInput(e.variant, { placeholder: 'ex. prise neutre, siège cran 4', oninput: v => { e.variant = v; save(); } })),
      field('Machine ou équipement', textInput(e.equipmentNote, { placeholder: 'ex. marque, modèle', oninput: v => { e.equipmentNote = v; save(); } }), { help: 'Les performances ne sont comparées qu’avec la même variante et le même équipement.' }),
      ex.load === 'assist' ? h('p', { class: 'fine', text: LOADS.assist + '.' }) : null,
      field('Note', textArea(e.notes, { rows: 2, oninput: v => { e.notes = v; save(); } }))));
    return card;
  }

  function cardioCard(e, i) {
    const card = h('article', { class: 'entry entry-cardio', 'aria-label': e.name });
    card.append(h('div', { class: 'entry-head' }, h('h2', { class: 'entry-title', text: e.name }),
      iconBtn('trash', 'Retirer', async () => { if (!await confirmDialog(`Retirer « ${e.name} » ?`, { confirmLabel: 'Retirer', danger: true })) return; sess.entries.splice(i, 1); cur = Math.min(cur, Math.max(0, sess.entries.length - 1)); save(); drawAll(); })));
    if (e.target?.advice) card.append(h('p', { class: 'fine', text: e.target.advice }));
    for (const f of e.target?.flags || []) card.append(h('p', { class: 'fine', text: f }));
    const kcal = h('p', { class: 'kcal-line' });
    const drawKcal = () => { const w = weightAt(S.data.measurements, sess.date); const r = cardioEntryCalories(e, w); kcal.textContent = 'Calories : ' + kcalResultText(r) + (r.kind === 'estimation' ? ' ' + weightNote(w, sess.date) : ''); };
    const upd = () => { save(); drawKcal(); updateProgress(); };
    if (e.ph && (e.ph.durationMin || e.ph.speedKmh) && !e.durationMin) card.append(h('div', { class: 'prev' }, h('span', { class: 'grow', text: `Proposé : ${[e.ph.durationMin ? fmtNum(e.ph.durationMin, 0) + ' min' : null, e.ph.speedKmh ? fmtNum(e.ph.speedKmh, 1) + ' km/h' : null, e.ph.inclinePct !== null && e.ph.inclinePct !== undefined ? fmtNum(e.ph.inclinePct, 1) + ' %' : null].filter(Boolean).join(', ')}` }),
      btn('Reprendre', () => { e.durationMin = e.ph.durationMin ?? null; e.speedKmh = e.ph.speedKmh ?? null; e.inclinePct = e.ph.inclinePct ?? null; save(); drawAll(); }, { small: true })));
    card.append(h('div', { class: 'grid-2' },
      field('Durée (min)', numInput(e.durationMin, { decimals: 1, placeholder: e.ph?.durationMin ?? '', oninput: v => { e.durationMin = v; upd(); } })),
      field('Distance (km)', numInput(e.distanceKm, { oninput: v => { e.distanceKm = v; upd(); } })),
      field('Vitesse (km/h)', numInput(e.speedKmh, { decimals: 1, placeholder: e.ph?.speedKmh ?? '', oninput: v => { e.speedKmh = v; upd(); } })),
      field('Inclinaison (%)', numInput(e.inclinePct, { decimals: 1, placeholder: e.ph?.inclinePct ?? '', oninput: v => { e.inclinePct = v; upd(); } }))));
    card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Intensité ressentie' }), segmented(INTENSITIES, e.intensity, v => { e.intensity = v; upd(); }, { allowNone: true })));
    card.append(kcal);
    const c = e.calories || { value: null, convention: 'inconnue', source: 'appareil' };
    card.append(h('details', { class: 'more' }, h('summary', { text: 'Type, calories de l’appareil et note' }),
      field('Type', selectInput(Object.fromEntries(Object.entries(CARDIO_TYPES).map(([k, v]) => [k, v.label])), e.cardioType, { oninput: v => { e.cardioType = v; e.exerciseId = CARDIO_TYPES[v].exerciseId; e.name = CARDIO_TYPES[v].label; save(); drawAll(); } })),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!e.durationIsMinimum, onchange: (ev) => { e.durationIsMinimum = ev.target.checked; upd(); } }), ' Durée minimale (au moins)'),
      field('Calories indiquées (kcal)', numInput(c.value, { decimals: 0, oninput: v => { c.value = v; e.calories = v ? c : null; upd(); } }), { help: 'Une valeur saisie remplace l’estimation.' }),
      field('Convention', selectInput(KCAL_CONVENTIONS, c.convention, { oninput: v => { c.convention = v; if (e.calories) upd(); } })),
      field('Source', selectInput(KCAL_SOURCES, c.source, { oninput: v => { c.source = v; if (e.calories) upd(); } })),
      field('Note', textArea(e.notes, { rows: 2, oninput: v => { e.notes = v; save(); } }))));
    drawKcal();
    return card;
  }

  // Fin de séance : un seul écran court, puis bilan
  function finishDialog() {
    save.flush();
    const unvalidated = sess.entries.filter(e => e.kind !== 'cardio').flatMap(e => e.sets.filter(st => !st.done && ((st.reps ?? null) !== null || (st.seconds ?? null) !== null)));
    const raw = sess.startedAt && live ? Math.round((Date.now() - new Date(sess.startedAt)) / 60000) : null;
    const measured = raw && raw >= 1 ? raw : null;
    const f = { durationMin: sess.durationMin ?? measured, durationSource: sess.durationSource || (measured ? 'mesuree' : null), keep: true };
    const content = h('div', { class: 'form' },
      unvalidated.length ? h('div', { class: 'card card-soft' }, h('p', { text: `${unvalidated.length} série(s) remplie(s) mais non validée(s).` }),
        segmented({ oui: 'Les compter', non: 'Les retirer' }, 'oui', v => { f.keep = v !== 'non'; }, { label: 'Séries non validées' })) : null,
      field('Durée (min)', numInput(f.durationMin, { decimals: 0, placeholder: 'Inconnue', oninput: v => { f.durationMin = v; f.durationSource = v === measured ? 'mesuree' : (v ? 'saisie' : null); } }), { help: measured ? `Durée mesurée : ${fmtDuration(measured)}.` : 'Laisse vide si tu ne la connais pas.' }),
      field('Date', dateInput(sess.date, { max: todayISO(), oninput: v => { if (v) sess.date = v; } })));
    const sh = sheet({ title: live ? 'Terminer la séance' : 'Enregistrer les modifications', content, actions: [
      btn('Continuer la séance', () => sh.close(), { kind: 'ghost' }),
      btn('Enregistrer', async () => {
        for (const e of sess.entries) if (e.kind !== 'cardio') {
          e.sets = e.sets.filter(st => {
            const has = (st.reps ?? null) !== null || (st.seconds ?? null) !== null;
            if (!has || (!st.done && !f.keep)) return false;
            st.done = true; delete st.ph; return true;
          });
        }
        sess.entries = sess.entries.filter(e => e.kind === 'cardio' ? (e.durationMin || e.distanceKm) : e.sets.length);
        for (const e of sess.entries) delete e.ph;
        sess.durationMin = f.durationMin; sess.durationSource = f.durationSource;
        if (live) { sess.status = 'done'; sess.endedAt = nowISO(); }
        delete sess.ui;
        try { await saveRecord('sessions', sess); } catch { return; }
        if (unregisterFlush) { unregisterFlush(); unregisterFlush = null; }
        stopRest();
        sh.close();
        const res = await companionSync({ silent: !live });
        await saveProfile(S.profile, { rebuild: true });
        if (live) { S.lastReward = { sessionId: sess.id, ...(res || {}), shown: false }; go(`#/bilan/${sess.id}`); }
        else { toast('Modifications enregistrées.'); go(`#/historique/s/${sess.id}`); }
      }, { kind: 'primary' }),
    ] });
  }

  drawAll();
}

// ---------- Bilan de fin de séance ----------
function performances(sess) {
  const out = [];
  const before = S.data.sessions.filter(x => x.status === 'done' && x.id !== sess.id && (x.date < sess.date || (x.date === sess.date && (x.endedAt || '') < (sess.endedAt || ''))));
  for (const e of sess.entries) {
    if (e.kind === 'cardio') { if (e.durationMin) out.push({ text: `${e.name} : ${e.durationIsMinimum ? 'au moins ' : ''}${fmtNum(e.durationMin, 0)} min`, tag: null }); continue; }
    const ex = getEx(e.exerciseId); if (!ex) continue;
    const ws = workSets(e); if (!ws.length) continue;
    const key = exKey(e);
    const prev = before.flatMap(s => s.entries.filter(x => x.kind !== 'cardio' && exKey(x) === key).map(x => workSets(x))).filter(x => x.length);
    const isAssist = ex.load === 'assist';
    const best = (sets, f) => sets.length ? f(...sets) : null;
    const loads = ws.map(s => s.load).filter(v => v !== null && v !== undefined);
    const top = loads.length ? (isAssist ? Math.min(...loads) : Math.max(...loads)) : null;
    if (!prev.length) { out.push({ text: `${e.name} : première fois (${describeSets(ws, { assist: isAssist, time: ex.measure === 'time' })})`, tag: 'Nouveau' }); continue; }
    const pAll = prev.flat();
    const pLoads = pAll.map(s => s.load).filter(v => v !== null && v !== undefined);
    const pTop = pLoads.length ? (isAssist ? Math.min(...pLoads) : Math.max(...pLoads)) : null;
    if (top !== null && pTop !== null && (isAssist ? top < pTop : top > pTop)) out.push({ text: `${e.name} : ${isAssist ? 'assistance ' : ''}${fmtNum(top, 2)} kg, record (avant : ${fmtNum(pTop, 2)} kg)`, tag: 'Record' });
    else if (ex.measure === 'time') { const s1 = best(ws.map(s => s.seconds || 0), Math.max), s0 = best(pAll.map(s => s.seconds || 0), Math.max); if (s1 > s0) out.push({ text: `${e.name} : ${s1} s, record (avant : ${s0} s)`, tag: 'Record' }); }
    else if (top !== null && top === pTop) {
      const r1 = Math.max(...ws.filter(s => s.load === top).map(s => s.reps || 0)), r0 = Math.max(...pAll.filter(s => s.load === top).map(s => s.reps || 0));
      if (r1 > r0) out.push({ text: `${e.name} : ${r1} répétitions à ${fmtNum(top, 2)} kg (avant : ${r0})`, tag: 'Progrès' });
    }
  }
  return out;
}

export function renderBilan(root, id) {
  const sess = S.data.sessions.find(x => x.id === id);
  if (!sess) { root.append(pageHeader('Séance introuvable', { back: '#/accueil' })); return; }
  const p = S.profile;
  const reward = S.lastReward && S.lastReward.sessionId === id ? S.lastReward : null;
  const comp = p.companion && !p.companion.hidden ? p.companion : null;
  const level = p.companion ? companionProgress(p).level : 1;
  const head = h('div', { class: 'bilan-head' });
  if (comp) head.append(h('div', { class: 'confetti-host' }, renderCompanion(comp, { level, reaction: reward && !reward.shown ? 'auto' : null, decor: false })));
  else head.append(h('span', { class: 'ico-wrap', style: { width: '64px', height: '64px' } }, icon('check', { size: 34 })));
  head.append(h('h1', { text: 'Séance enregistrée' }),
    h('p', { class: 'muted', text: [fmtDate(sess.date, { weekday: true }), sess.durationMin ? fmtDuration(sess.durationMin) : 'durée non renseignée'].join(' · ') }));
  if (reward && reward.newEvents && reward.newEvents.length) {
    const pts = reward.newEvents.reduce((a, e) => a + e.points, 0);
    head.append(h('p', { class: 'points-pill', text: `+${pts} points pour ${companionName(p.companion)}` }), h('p', { class: 'fine', text: reward.newEvents.map(e => e.label).join(', ') }));
  } else if (!p.companion) head.append(h('p', { class: 'fine' }, 'Envie d’un compagnon qui évolue avec tes séances ? ', h('a', { href: '#/compagnon', text: 'Choisir un compagnon' })));
  root.append(head);
  if (reward && !reward.shown) {
    reward.shown = true;
    if (comp) confetti(head.querySelector('.confetti-host'), comp);
    if (reward.levelUp) setTimeout(() => celebrate(reward.levelUp, reward.newlyUnlocked), 700);
  }

  const perf = performances(sess);
  root.append(section('Ce que tu as fait', perf.length ? h('ul', { class: 'perf' }, ...perf.slice(0, 5).map(x => h('li', {}, h('span', { class: 'grow', text: x.text }), x.tag ? h('span', { class: `tag ${x.tag === 'Record' ? 'tag-record' : 'tag-accent'}`, text: x.tag }) : null))) :
    h('p', { class: 'muted', text: `${sess.entries.length} exercice(s) enregistré(s), dans la continuité de tes dernières séances.` })));

  // Retour facultatif
  const f = { difficulty: sess.difficulty, energy: sess.energy, fb: sess.feedback || { fatigue: null, liked: [], replace: [], actualTime: null }, pain: sess.pain || { zones: [], text: '' }, notes: sess.notes || '', calories: sess.calories || { value: null, convention: 'inconnue', source: 'montre' } };
  f.fb = { fatigue: null, liked: [], replace: [], actualTime: null, ...f.fb };
  const exOpts = Object.fromEntries(sess.entries.filter(e => e.kind !== 'cardio').map(e => [e.exerciseId, e.name]));
  const form = h('div', { class: 'card' },
    h('h2', { class: 'card-title', text: 'Ton retour (facultatif)' }),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'La séance était…' }), segmented(SESSION_DIFFICULTY, f.difficulty, v => { f.difficulty = v; }, { allowNone: true })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Fatigue générale' }), segmented({ faible: 'Faible', moyenne: 'Moyenne', elevee: 'Élevée' }, f.fb.fatigue, v => { f.fb.fatigue = v; }, { allowNone: true })),
    h('details', { class: 'more' }, h('summary', { text: 'Plus de détails' }),
      !sess.energy ? h('div', { class: 'field' }, h('span', { class: 'label', text: 'Énergie avant la séance' }), segmented(ENERGY, f.energy, v => { f.energy = v; }, { allowNone: true })) : null,
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Gêne ou douleur pendant la séance' }), chips(ZONES, f.pain.zones, v => { f.pain.zones = v; }), textInput(f.pain.text, { placeholder: 'Précision facultative', oninput: v => { f.pain.text = v; } })),
      Object.keys(exOpts).length ? h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices appréciés' }), chips(exOpts, f.fb.liked, v => { f.fb.liked = v; })) : null,
      Object.keys(exOpts).length ? h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices à remplacer la prochaine fois' }), chips(exOpts, f.fb.replace, v => { f.fb.replace = v; })) : null,
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Temps réellement disponible' }), segmented(['30', '45', '60', '75', '90'].map(v => ({ value: v, label: v + ' min' })), f.fb.actualTime ? String(f.fb.actualTime) : null, v => { f.fb.actualTime = v ? Number(v) : null; }, { allowNone: true, cls: 'seg-wrap' })),
      field('Notes', textArea(f.notes, { rows: 2, oninput: v => { f.notes = v; } })),
      h('p', { class: 'fine', text: 'Calories indiquées par une montre pour toute la séance (remplacent les estimations) :' }),
      h('div', { class: 'grid-2' }, field('Valeur (kcal)', numInput(f.calories.value, { decimals: 0, oninput: v => { f.calories.value = v; } })), field('Convention', selectInput(KCAL_CONVENTIONS, f.calories.convention, { oninput: v => { f.calories.convention = v; } })))),
    btn('Enregistrer mon retour', async () => {
      sess.difficulty = f.difficulty; sess.energy = f.energy ?? sess.energy; sess.notes = f.notes;
      sess.pain = (f.pain.zones.length || f.pain.text) ? f.pain : null;
      sess.calories = f.calories.value ? { ...f.calories, source: f.calories.source || 'montre' } : null;
      const hasFb = f.fb.fatigue || f.fb.liked.length || f.fb.replace.length || f.fb.actualTime || f.difficulty;
      sess.feedback = hasFb ? { ...f.fb, difficulty: f.difficulty } : null;
      await saveRecord('sessions', sess);
      if (f.fb.liked.length) p.favorites = [...new Set([...(p.favorites || []), ...f.fb.liked])];
      if (f.fb.replace.length) { p.replaceRequests = [...new Set([...(p.replaceRequests || []), ...f.fb.replace])]; p.slotPins = Object.fromEntries(Object.entries(p.slotPins || {}).filter(([, v]) => !f.fb.replace.includes(v))); }
      await saveProfile(p, { rebuild: true });
      toast('Merci, ton retour affinera les prochaines séances.');
      if (sess.pain) toast('Gêne notée : elle sera rappelée avant la prochaine séance. Si elle persiste, demande un avis adapté.', { timeout: 7000 });
      go('#/accueil');
    }, { kind: 'primary' }));
  root.append(form);
  root.append(h('div', { class: 'row' },
    btn('Corriger la séance', () => go(`#/seance/edition/${sess.id}`), { iconName: 'edit' }),
    btn('Terminé', () => go('#/accueil'), { kind: 'ghost' })));
}

// ---------- Modèles ----------
export function renderTemplates(root) {
  root.append(pageHeader('Modèles de séance', { back: '#/profil' }));
  const tpls = S.data.templates;
  if (!tpls.length) { root.append(h('p', { class: 'muted', text: 'Aucun modèle. Ouvre une séance dans l’historique puis choisis « Enregistrer comme modèle ».' })); return; }
  root.append(h('ul', { class: 'list' }, ...tpls.map(t => h('li', { class: 'list-row' },
    h('span', { class: 'grow' }, h('span', { class: 'block-txt strong', text: t.name }), h('span', { class: 'fine', text: t.entries.map(e => e.name).join(', ') })),
    btn('Utiliser', () => startDraft(newSessionObj({ entries: t.entries.map(instantiate) })), { small: true }),
    iconBtn('edit', 'Renommer', () => { let n = t.name; const sh = sheet({ title: 'Renommer le modèle', content: field('Nom', textInput(n, { oninput: v => { n = v; } })), actions: [btn('Enregistrer', async () => { t.name = n.trim() || t.name; await saveRecord('templates', t); sh.close(); rerender(); }, { kind: 'primary' })] }); }),
    iconBtn('trash', 'Supprimer', async () => { if (await confirmDialog(`Supprimer le modèle « ${t.name} » ?`, { danger: true, confirmLabel: 'Supprimer' })) { await deleteRecord('templates', t.id); rerender(); } })))));
}

export async function saveAsTemplate(sess) {
  let name = sess.suggestion?.title || `Séance du ${fmtDate(sess.date)}`;
  const sh = sheet({ title: 'Enregistrer comme modèle', content: field('Nom du modèle', textInput(name, { oninput: v => { name = v; } })), actions: [btn('Enregistrer', async () => {
    const entries = sess.entries.map(e => {
      const c = JSON.parse(JSON.stringify(e)); delete c.ph; delete c.target;
      if (c.kind !== 'cardio') c.sets = c.sets.map(st => ({ id: uid(), type: st.type, load: st.load, reps: st.reps, seconds: st.seconds, done: false }));
      return c;
    });
    await saveRecord('templates', { id: uid(), name: name.trim() || 'Modèle', entries });
    sh.close(); toast('Modèle enregistré.');
  }, { kind: 'primary' })] });
}

export { startDraft, instantiate };
