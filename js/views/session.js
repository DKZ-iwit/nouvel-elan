import { h, clear, uid, fmtNum, fmtDate, todayISO, nowISO, debounce, fmtClock, fmtDuration, parseNum } from '../util.js';
import { S, getEx, allExercises, saveRecord, deleteRecord, saveProfile, draftSession } from '../state.js';
import { CARDIO_TYPES, ZONES, EFFORTS, INTENSITIES, LOADS, MUSCLES } from '../data/exercises.js';
import { suggestSession, replacementOptions, comparableEntriesAnyVariant, lastCardio, exerciseConcernsZone } from '../engine/suggest.js';
import { usageCounts, missingForProgram } from '../engine/program.js';
import { workSets, exKey, doneSessions, summarizeSets } from '../engine/stats.js';
import { weightAt, cardioEntryCalories } from '../engine/calories.js';
import { btn, iconBtn, icon, field, textInput, textArea, numInput, dateInput, selectInput, chips, segmented, pageHeader, section, note, confirmDialog, toast, sheet, avatar } from '../ui/components.js';
import { ENERGY, SESSION_DIFFICULTY, KCAL_CONVENTIONS, KCAL_SOURCES, kcalResultText, weightNote } from './common.js';
import { openExercisePicker } from './exercises.js';
import { clarificationCards } from './attention.js';
import { completeProgramCard } from './program.js';
import { rerender, go } from '../router.js';

// ---------- Fabrication des entrées ----------
function newSet(type = 'work', load = null, ph = {}) {
  return { id: uid(), type, load, reps: null, seconds: null, done: false, ph };
}

export function strengthEntry(ex, { n = null, load, repsPh, secondsPh, target = null, variant = '', equipmentNote = '' } = {}) {
  const last = comparableEntriesAnyVariant(S.data.sessions, ex.id)[0];
  let sets = [];
  if (n === null && last) {
    // Préremplissage depuis la dernière séance comparable
    sets = workSets(last.entry).map(st => newSet('work', st.load, { reps: st.reps, seconds: st.seconds }));
    variant = variant || last.entry.variant || '';
    equipmentNote = equipmentNote || last.entry.equipmentNote || '';
  } else {
    const k = n ?? 3;
    for (let i = 0; i < k; i++) sets.push(newSet('work', load ?? null, { reps: repsPh ?? null, seconds: secondsPh ?? null }));
  }
  if (!sets.length) sets = [newSet('work', null, {})];
  return { id: uid(), kind: 'strength', exerciseId: ex.id, name: ex.name, variant, equipmentNote, sets, setsCountKnown: true, effort: null, notes: '', target, lastRef: last ? `${fmtDate(last.session.date)} : ${summarizeSets(last.entry, ex, { fmt: fmtNum })}` : null };
}

export function cardioEntry(type, { minutesPh = null, target = null } = {}) {
  const ct = CARDIO_TYPES[type] || CARDIO_TYPES.autre;
  const lc = lastCardio(S.data.sessions, type);
  const ph = lc ? { durationMin: lc.entry.durationMin, speedKmh: lc.entry.speedKmh, inclinePct: lc.entry.inclinePct } : {};
  if (minutesPh) ph.durationMin = minutesPh;
  return { id: uid(), kind: 'cardio', exerciseId: ct.exerciseId, cardioType: type, name: ct.label, durationMin: null, durationIsMinimum: false, distanceKm: null, speedKmh: null, inclinePct: null, intensity: null, notes: '', calories: null, ph, target };
}

export function newSessionObj(fields = {}) {
  return {
    id: uid(), profileId: S.profile.id, date: todayISO(), status: 'draft', startedAt: nowISO(), endedAt: null,
    durationMin: null, durationSource: null, energy: null, difficulty: null, notes: '', pain: null,
    programDayId: null, suggestion: null, feedback: null, calories: null, todayCheck: null, entries: [], ...fields,
  };
}

async function startDraft(sess) {
  const existing = draftSession();
  if (existing) { toast('Une séance est déjà en cours : reprends-la ou termine-la d’abord.', { kind: 'error' }); go('#/seance'); return; }
  await saveRecord('sessions', sess);
  go('#/seance');
}

// ---------- Hub Séance ----------
export function renderSessionHub(root) {
  const draft = draftSession();
  if (draft) return renderEditor(root, draft, { mode: 'live' });
  const p = S.profile;
  root.append(pageHeader('Séance'));
  if (missingForProgram(p).length) root.append(completeProgramCard(p));
  else root.append(h('div', { class: 'card card-accent' },
    h('p', { class: 'card-title', text: 'Séance proposée' }),
    h('p', { class: 'muted', text: 'Réponds à trois questions rapides (temps, forme, points d’attention) pour adapter la séance du jour.' }),
    btn('Préparer la séance', () => { go('#/seance/preparer'); }, { kind: 'primary', iconName: 'seance' })));
  root.append(section('Autres façons de commencer', h('div', { class: 'stack' },
    btn('Séance libre', () => startDraft(newSessionObj()), { iconName: 'plus' }),
    btn('À partir d’un modèle', () => pickTemplate(), { iconName: 'copy' }),
    btn('Dupliquer une séance passée', () => pickPastSession(), { iconName: 'historique' }),
    btn('Enregistrer une séance passée', () => pastSessionDialog(), { iconName: 'calendar' }))));
}

function pickTemplate() {
  const tpls = S.data.templates;
  const sh = sheet({ title: 'Modèles de séance', content: tpls.length ? h('ul', { class: 'list' }, ...tpls.map(t => h('li', {}, h('button', { type: 'button', class: 'list-link', onclick: () => {
    sh.close();
    const s = newSessionObj({ entries: t.entries.map(e => instantiate(e)) });
    startDraft(s);
  } }, h('span', { class: 'grow', text: t.name }), h('span', { class: 'muted', text: `${t.entries.length} exercice(s)` }))))) :
    h('p', { class: 'muted', text: 'Aucun modèle. Depuis l’historique, ouvre une séance puis « Enregistrer comme modèle ».' }) });
}

// Copie d'une entrée : charges conservées, répétitions en suggestion, rien de validé.
function instantiate(e) {
  if (e.kind === 'cardio') return { ...JSON.parse(JSON.stringify(e)), id: uid(), ph: { durationMin: e.durationMin, speedKmh: e.speedKmh, inclinePct: e.inclinePct }, durationMin: null, durationIsMinimum: false, distanceKm: null, speedKmh: null, inclinePct: null, calories: null };
  return { ...JSON.parse(JSON.stringify(e)), id: uid(), effort: null, notes: '', setsCountKnown: true,
    sets: (e.sets || []).map(st => ({ id: uid(), type: st.type, load: st.load ?? null, reps: null, seconds: null, done: false, ph: { reps: st.reps, seconds: st.seconds } })) };
}

function pickPastSession() {
  const list = doneSessions(S.data.sessions).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  const sh = sheet({ title: 'Dupliquer une séance', content: list.length ? h('ul', { class: 'list' }, ...list.map(s => h('li', {}, h('button', { type: 'button', class: 'list-link', onclick: () => {
    sh.close(); startDraft(newSessionObj({ entries: s.entries.map(instantiate) }));
  } }, h('span', { class: 'grow', text: fmtDate(s.date, { weekday: true }) }), h('span', { class: 'muted', text: s.entries.map(e => e.name).slice(0, 3).join(', ') }))))) :
    h('p', { class: 'muted', text: 'Aucune séance terminée pour l’instant.' }) });
}

function pastSessionDialog() {
  let date = todayISO();
  const sh = sheet({ title: 'Séance passée', content: h('div', {}, field('Date de la séance', dateInput(date, { max: todayISO(), oninput: v => { date = v; } })),
    h('p', { class: 'fine', text: 'La durée ne sera pas mesurée : tu pourras la saisir si tu la connais.' })),
  actions: [btn('Commencer la saisie', () => { sh.close(); startDraft(newSessionObj({ date, startedAt: null })); }, { kind: 'primary' })] });
}

// ---------- Préparation (questions du jour + proposition) ----------
export function renderPrepare(root) {
  const p = S.profile;
  if (draftSession()) { go('#/seance'); return; }
  if (missingForProgram(p).length) { root.append(pageHeader('Préparer la séance', { back: '#/seance' }), completeProgramCard(p)); return; }
  const opts = { minutes: p.durationMin || 60, energy: null, attention: [], attentionChecked: false, focus: null, dayId: null };
  const attState = {}; // zone -> 'rien' | 'gene' | 'douleur'
  root.append(pageHeader('Préparer la séance', { back: '#/seance' }));
  root.append(h('p', { class: 'owner' }, avatar(p, 26), h('span', { text: `Séance de ${p.name}` })));

  const preview = h('div', { class: 'preview', 'aria-live': 'polite' });
  const update = () => { opts.attention = Object.entries(attState).filter(([, v]) => v === 'gene' || v === 'douleur').map(([zone, level]) => ({ zone, level })); drawPreview(); };

  root.append(section('Aujourd’hui, j’ai…',
    segmented(['30', '45', '60', '90'].map(v => ({ value: v, label: v + ' min' })), String(opts.minutes), v => { opts.minutes = Number(v) || p.durationMin || 60; update(); }, { label: 'Temps disponible' })));
  root.append(section('Je suis…', segmented(ENERGY, null, v => { opts.energy = v; update(); }, { label: 'Forme du jour', allowNone: true })));

  const attWrap = h('div', { class: 'att-wrap' });
  const zonesKnown = (p.attention || []).map(a => a.zone);
  const drawAtt = (open) => {
    clear(attWrap);
    if (!open) return;
    const zoneRow = (z, known) => h('div', { class: 'att-row' }, h('span', { class: 'att-zone', text: ZONES[z] + (known ? '' : '') }),
      segmented({ rien: 'Rien', gene: 'Gêne', douleur: 'Douleur' }, attState[z] || 'rien', v => { attState[z] = v; update(); }, { label: ZONES[z] }));
    for (const z of zonesKnown) attWrap.append(zoneRow(z, true));
    const others = Object.keys(ZONES).filter(z => !zonesKnown.includes(z));
    const det = h('details', { class: 'more' }, h('summary', { text: zonesKnown.length ? 'Une autre zone' : 'Choisir la zone' }), ...others.map(z => zoneRow(z, false)));
    if (!zonesKnown.length) det.open = true;
    attWrap.append(det);
  };
  root.append(section('Un point d’attention aujourd’hui ?',
    segmented({ non: 'Non', oui: 'Oui' }, null, v => { opts.attentionChecked = !!v; if (v === 'non') { for (const k of Object.keys(attState)) delete attState[k]; } drawAtt(v === 'oui'); update(); }, { allowNone: true, label: 'Point d’attention aujourd’hui' }),
    attWrap,
    zonesKnown.length ? h('p', { class: 'fine', text: `Zones de ton profil : ${zonesKnown.map(z => ZONES[z]).join(', ')}. Une absence de douleur passée n’est pas considérée comme valable aujourd’hui sans ta réponse.` }) : null));
  root.append(section('Je veux davantage de…', segmented({ haut: 'Haut du corps', bas: 'Bas du corps', cardio: 'Cardio' }, null, v => { opts.focus = v; update(); }, { allowNone: true, cls: 'seg-wrap', label: 'Orientation' })));
  for (const c of clarificationCards(p, () => rerender())) root.append(c);
  root.append(preview);

  function drawPreview() {
    clear(preview);
    const sg = suggestSession({ profile: p, program: p.program, sessions: S.data.sessions, activities: S.data.activities, today: todayISO(), options: opts, library: allExercises(), getEx });
    if (sg.needsProgram) { preview.append(note('Programme à recalculer depuis « Mon programme ».', 'warning')); return; }
    preview.append(h('div', { class: 'card card-accent' },
      h('div', { class: 'row-between' }, h('h2', { class: 'card-title', text: sg.title }), h('span', { class: 'tag', text: `≈ ${sg.estMinutes} min` })),
      h('label', { class: 'inline-select' }, 'Journée : ', selectInput(Object.fromEntries(p.program.days.map(d => [d.id, d.label])), sg.dayId, { oninput: v => { opts.dayId = v; drawPreview(); } })),
      h('h3', { class: 'h3', text: 'Pourquoi cette séance' }),
      h('ul', { class: 'bullets' }, ...sg.reasons.map(r => h('li', { text: r }))),
      h('p', { class: 'fine' }, 'Données utilisées : ', sg.dataUsed.join(' ; '), '. ',
        h('a', { href: '#/attention', text: 'Modifier mes points d’attention' }), ' · ', h('a', { href: '#/programme', text: 'Voir mon programme' })),
      sg.conflicts.length ? h('div', {}, ...sg.conflicts.map(c => note(c, 'warning'))) : null));
    preview.append(section('Échauffement', h('ul', { class: 'bullets' }, ...sg.warmup.map(w => h('li', { text: w })))));
    preview.append(section('Exercices', h('ol', { class: 'plan' }, ...sg.items.map(it => h('li', { class: 'plan-item' },
      h('div', { class: 'row-between' }, h('strong', { text: it.name }), h('span', { class: 'tag', text: it.measure === 'time' ? `${it.sets} × ${it.targetSeconds ? it.targetSeconds + ' s' : 'durée libre'}` : `${it.sets} × ${it.range[0]}–${it.range[1]}` })),
      h('p', { class: 'fine', text: `Repos ≈ ${it.rest} s. ${it.advice.text}` }),
      it.advice.basis && it.advice.kind !== 'start' ? h('p', { class: 'fine muted', text: 'Référence : ' + it.advice.basis }) : null,
      ...it.flags.map(f => h('p', { class: 'flag', text: f })),
      it.replacement ? h('p', { class: 'fine', text: `Alternative possible : ${it.replacement.name} (${it.replacement.why.toLowerCase()}).` }) : null)))));
    if (sg.cardio) preview.append(section('Cardio', h('div', { class: 'plan-item' },
      h('div', { class: 'row-between' }, h('strong', { text: sg.cardio.label }), h('span', { class: 'tag', text: `${sg.cardio.minutes} min${sg.cardio.optional ? ', facultatif' : ''}` })),
      h('p', { class: 'fine', text: `Intensité ${sg.cardio.intensity}. ${sg.cardio.detail}` }),
      ...sg.cardio.why.map(w => h('p', { class: 'fine muted', text: w })),
      sg.cardio.runOption ? h('p', { class: 'fine', text: sg.cardio.runOption }) : null)));
    preview.append(h('div', { class: 'sticky-actions' },
      !opts.attentionChecked ? h('p', { class: 'fine', text: 'Point d’attention du jour non renseigné.' }) : null,
      btn('Commencer cette séance', () => start(sg), { kind: 'primary', iconName: 'seance' })));
  }

  async function start(sg) {
    // Mémorise le ressenti du jour dans les zones du profil
    if (opts.attentionChecked) {
      let changed = false;
      for (const a of p.attention || []) {
        const v = attState[a.zone] || 'rien';
        a.lastStatus = { painFree: v === 'rien', level: v === 'rien' ? null : v, date: todayISO(), note: '' };
        changed = true;
      }
      if (changed) await saveProfile(p, { rebuild: false });
    }
    const entries = sg.items.map(it => {
      const ex = getEx(it.exerciseId);
      const load = it.advice.load ?? null;
      const repsPh = it.advice.reps ?? (it.advice.kind === 'increase' ? it.range[0] : Math.min(it.range[1], Math.max(it.range[0], lastRepsAt(ex.id, load) ?? it.range[0])));
      return strengthEntry(ex, { n: it.sets, load, repsPh: ex.measure === 'time' ? null : repsPh, secondsPh: it.advice.seconds ?? null, variant: it.variant, equipmentNote: it.equipmentNote,
        target: { range: it.range, rest: it.rest, advice: it.advice.text, flags: it.flags, replacement: it.replacement, prio: it.prio, sets: it.sets } });
    });
    if (sg.cardio) entries.push(cardioEntry(sg.cardio.cardioType, { minutesPh: sg.cardio.minutes, target: { advice: `${sg.cardio.minutes} min, intensité ${sg.cardio.intensity}. ${sg.cardio.detail}`, flags: sg.cardio.runOption ? [sg.cardio.runOption] : [] } }));
    const sess = newSessionObj({
      entries, energy: opts.energy, programDayId: sg.dayId,
      suggestion: { title: sg.title, reasons: sg.reasons, warmup: sg.warmup, estMinutes: sg.estMinutes, budget: sg.budget },
      todayCheck: { minutes: opts.minutes, energy: opts.energy, attentionChecked: opts.attentionChecked, attention: opts.attention, focus: opts.focus },
    });
    await startDraft(sess);
  }
  drawPreview();
}

function lastRepsAt(exId, load) {
  const c = comparableEntriesAnyVariant(S.data.sessions, exId)[0];
  if (!c) return null;
  const ws = workSets(c.entry).filter(s => load === null || s.load === load);
  return ws.length ? Math.max(...ws.map(s => s.reps || 0)) || null : null;
}

// ---------- Minuteur de repos (ne bloque pas la saisie) ----------
const rest = { endAt: 0, total: 0, timer: null };
function restBar() { return document.getElementById('restbar'); }
export function startRest(sec) {
  rest.total = sec; rest.endAt = Date.now() + sec * 1000;
  drawRest();
  clearInterval(rest.timer);
  rest.timer = setInterval(drawRest, 250);
}
function stopRest() { clearInterval(rest.timer); rest.timer = null; rest.endAt = 0; const b = restBar(); if (b) { b.hidden = true; clear(b); } }
function drawRest() {
  const b = restBar(); if (!b) return;
  const left = (rest.endAt - Date.now()) / 1000;
  if (left <= 0) {
    if (rest.timer) { navigator.vibrate?.([200, 100, 200]); }
    clearInterval(rest.timer); rest.timer = null;
    b.hidden = false; clear(b);
    b.append(h('span', { class: 'rest-txt', text: 'Repos terminé' }), btn('OK', stopRest, { small: true }));
    b.classList.add('rest-done');
    setTimeout(() => { if (!rest.timer) stopRest(); }, 6000);
    return;
  }
  b.classList.remove('rest-done');
  b.hidden = false; clear(b);
  b.append(icon('timer', { size: 18 }), h('span', { class: 'rest-txt', text: `Repos ${fmtClock(left)}` }),
    btn('−15 s', () => { rest.endAt -= 15000; drawRest(); }, { small: true }),
    btn('+15 s', () => { rest.endAt += 15000; drawRest(); }, { small: true }),
    iconBtn('close', 'Arrêter le minuteur', stopRest));
}

// ---------- Éditeur de séance ----------
export function renderEditSession(root, id) {
  const s = S.data.sessions.find(x => x.id === id);
  if (!s) { root.append(pageHeader('Séance introuvable', { back: '#/historique' })); return; }
  if (s.status === 'draft') { go('#/seance'); return; }
  renderEditor(root, s, { mode: 'edit' });
}

export function renderEditor(root, sess, { mode }) {
  const p = S.profile;
  const live = mode === 'live';
  const save = debounce(() => saveRecord('sessions', sess).catch(() => {}), 350);
  window.__elanFlush = () => save.flush();
  const ownerName = S.profiles.find(x => x.id === sess.profileId)?.name || p.name;
  let tick = null;
  const elapsedEl = h('span', { class: 'elapsed', 'aria-live': 'off' });
  const drawElapsed = () => { if (sess.startedAt && live) elapsedEl.textContent = fmtClock((Date.now() - new Date(sess.startedAt)) / 1000); };
  if (sess.startedAt && live) { drawElapsed(); tick = setInterval(() => { if (!document.body.contains(elapsedEl)) { clearInterval(tick); return; } drawElapsed(); }, 1000); }

  root.append(pageHeader(live ? (sess.suggestion ? sess.suggestion.title : 'Séance libre') : 'Modifier la séance', { back: live ? '#/accueil' : `#/historique/s/${sess.id}` }));
  root.append(h('div', { class: 'owner-bar' }, avatar(p, 26), h('span', { class: 'grow', text: `Séance de ${ownerName}` }),
    live && sess.startedAt ? elapsedEl : null,
    h('label', { class: 'date-mini' }, h('span', { class: 'sr-only', text: 'Date de la séance' }), dateInput(sess.date, { max: todayISO(), oninput: v => { if (v) { sess.date = v; save(); } } }))));
  if (sess.suggestion) root.append(h('details', { class: 'why' }, h('summary', { text: 'Pourquoi cette séance' }), h('ul', { class: 'bullets' }, ...sess.suggestion.reasons.map(r => h('li', { text: r }))),
    sess.suggestion.warmup ? h('div', {}, h('h3', { class: 'h3', text: 'Échauffement' }), h('ul', { class: 'bullets' }, ...sess.suggestion.warmup.map(w => h('li', { text: w })))) : null));

  const list = h('div', { class: 'entries' });
  root.append(list);
  const drawAll = () => { clear(list); sess.entries.forEach((e, i) => list.append(e.kind === 'cardio' ? cardioCard(e, i) : strengthCard(e, i))); if (!sess.entries.length) list.append(h('p', { class: 'muted empty-inline', text: 'Ajoute un premier exercice pour commencer.' })); };

  function move(i, d) { const j = i + d; if (j < 0 || j >= sess.entries.length) return; [sess.entries[i], sess.entries[j]] = [sess.entries[j], sess.entries[i]]; save(); drawAll(); }
  async function remove(i) { if (!await confirmDialog(`Retirer « ${sess.entries[i].name} » de la séance ?`, { confirmLabel: 'Retirer', danger: true })) return; sess.entries.splice(i, 1); save(); drawAll(); }

  function headRow(e, i, title) {
    return h('div', { class: 'entry-head' }, h('h3', { class: 'entry-title', text: title }),
      h('div', { class: 'entry-tools' },
        iconBtn('up', 'Monter', () => move(i, -1)), iconBtn('down', 'Descendre', () => move(i, 1)),
        e.kind !== 'cardio' ? iconBtn('swap', 'Remplacer cet exercice', () => replaceEntry(i)) : null,
        iconBtn('trash', 'Retirer', () => remove(i))));
  }

  function replaceEntry(i) {
    const e = sess.entries[i];
    const ex = getEx(e.exerciseId);
    const zone = (sess.todayCheck?.attention || []).find(a => a.level === 'douleur' && exerciseConcernsZone(ex, a.zone))?.zone || null;
    const sugg = ex ? replacementOptions(ex, p, allExercises(), { usage: usageCounts(S.data.sessions), zone }) : [];
    openExercisePicker({ title: 'Remplacer l’exercice', suggested: sugg.slice(0, 6), cat: 'muscu', filter: (x) => !(p.excluded || []).includes(x.id), onPick: (nex) => {
      // Rôle conservé, charge jamais transférée : préremplissage depuis l'historique du nouvel exercice uniquement
      const ne = strengthEntry(nex, { n: Math.max(1, e.sets.filter(st => st.type !== 'warmup').length) });
      const last = comparableEntriesAnyVariant(S.data.sessions, nex.id)[0];
      if (last) { const ws = workSets(last.entry); ne.sets.forEach((st, k) => { const ref = ws[Math.min(k, ws.length - 1)]; st.load = ref ? ref.load : null; st.ph = { reps: ref?.reps ?? null, seconds: ref?.seconds ?? null }; }); }
      else ne.sets.forEach(st => { st.load = null; });
      ne.target = e.target ? { ...e.target, advice: last ? 'Charges reprises de ta dernière séance sur cet exercice.' : 'Nouvel exercice : détermine une charge de départ confortable sur une première série.', flags: [`Remplace ${e.name} (charge non transférée)`] } : { advice: last ? 'Charges reprises de ta dernière séance sur cet exercice.' : 'Nouvel exercice : détermine une charge de départ confortable.', flags: [] };
      sess.entries[i] = ne; save(); drawAll();
      toast(`${e.name} remplacé par ${nex.name}.`);
    } });
  }

  function strengthCard(e, i) {
    const ex = getEx(e.exerciseId) || { measure: 'load_reps', load: 'total', name: e.name, inc: 2.5 };
    const card = h('article', { class: 'entry' });
    card.append(headRow(e, i, e.name));
    if (e.target) {
      card.append(h('p', { class: 'target' }, e.target.range ? h('strong', { text: ex.measure === 'time' ? `${e.target.sets || e.sets.length} séries` : `${e.target.sets || e.sets.length} × ${e.target.range[0]}–${e.target.range[1]}` }) : null,
        e.target.rest ? ` · repos ${e.target.rest} s` : '', e.target.advice ? h('span', { class: 'target-adv', text: ' ' + e.target.advice }) : null));
      for (const f of e.target.flags || []) card.append(h('p', { class: 'flag', text: f }));
      if (e.target.replacement) card.append(btn(`Remplacer par ${e.target.replacement.name}`, () => {
        const nex = getEx(e.target.replacement.exerciseId);
        const ne = strengthEntry(nex, { n: e.target.sets || 3 });
        ne.target = { ...e.target, replacement: null, advice: 'Alternative proposée pour épargner la zone douloureuse ; charge non transférée.', flags: [] };
        if (!comparableEntriesAnyVariant(S.data.sessions, nex.id).length) ne.sets.forEach(st => { st.load = null; });
        sess.entries[i] = ne; save(); drawAll();
      }, { small: true, iconName: 'swap' }));
    } else if (e.lastRef) card.append(h('p', { class: 'fine muted', text: 'Dernière fois : ' + e.lastRef }));
    const det = h('details', { class: 'variant' }, h('summary', { text: [e.variant, e.equipmentNote].filter(Boolean).join(' / ') || 'Machine ou variante (facultatif)' }),
      field('Variante', textInput(e.variant, { placeholder: 'ex. prise neutre, siège cran 4', oninput: v => { e.variant = v; save(); } })),
      field('Machine / équipement', textInput(e.equipmentNote, { placeholder: 'ex. marque, modèle', oninput: v => { e.equipmentNote = v; save(); } }), { help: 'Les performances ne sont comparées qu’avec la même variante et le même équipement.' }));
    card.append(det);
    const unitLabel = ex.load === 'assist' ? 'Assistance (kg)' : ex.load === 'per_dumbbell' ? 'Kg par haltère' : ex.load === 'bodyweight' ? 'Lest (kg)' : 'Charge (kg)';
    if (ex.load === 'assist') card.append(h('p', { class: 'fine', text: LOADS.assist + '.' }));
    const table = h('div', { class: 'sets', role: 'table', 'aria-label': `Séries de ${e.name}` });
    const isTime = ex.measure === 'time';
    table.append(h('div', { class: 'set-row set-head', role: 'row' }, h('span', { role: 'columnheader', text: 'Série' }), h('span', { role: 'columnheader', text: unitLabel }), h('span', { role: 'columnheader', text: isTime ? 'Secondes' : 'Rép.' }), h('span', { role: 'columnheader', class: 'sr-only', text: 'Actions' })));
    let workN = 0;
    e.sets.forEach((st, k) => {
      const isW = st.type === 'warmup';
      if (!isW) workN++;
      const row = h('div', { class: `set-row${st.done ? ' done' : ''}${isW ? ' warm' : ''}`, role: 'row' });
      const typeBtn = h('button', { type: 'button', class: 'set-type', 'aria-label': isW ? 'Série d’échauffement, toucher pour en faire une série de travail' : `Série de travail ${workN}, toucher pour la marquer en échauffement`, onclick: () => { st.type = isW ? 'work' : 'warmup'; save(); drawAll(); } }, isW ? 'É' : String(workN));
      const loadIn = ex.load === 'none' ? h('span', { class: 'muted', text: '—' }) : numInput(st.load, { placeholder: st.ph?.load ?? '', ariaLabel: `${unitLabel}, série ${k + 1}`, oninput: v => { st.load = v; save(); } });
      const repIn = numInput(isTime ? st.seconds : st.reps, { decimals: 0, placeholder: isTime ? (st.ph?.seconds ?? '') : (st.ph?.reps ?? ''), ariaLabel: `${isTime ? 'Secondes' : 'Répétitions'}, série ${k + 1}`, oninput: v => { if (isTime) st.seconds = v; else st.reps = v; save(); } });
      const ok = h('button', { type: 'button', class: 'set-ok', 'aria-pressed': String(!!st.done), 'aria-label': st.done ? 'Série validée, toucher pour annuler' : 'Valider la série', onclick: () => {
        if (!st.done) {
          if (isTime) { if (st.seconds === null && st.ph?.seconds) st.seconds = st.ph.seconds; }
          else if (st.reps === null && st.ph?.reps) st.reps = st.ph.reps;
          if ((isTime ? st.seconds : st.reps) === null) { toast(isTime ? 'Indique la durée tenue.' : 'Indique le nombre de répétitions.', { kind: 'error' }); repIn.focus(); return; }
          if (['total', 'per_dumbbell', 'assist'].includes(ex.load) && (st.load === null || st.load === undefined)) { toast(ex.load === 'assist' ? 'Indique l’assistance utilisée.' : 'Indique la charge utilisée.', { kind: 'error' }); loadIn.focus && loadIn.focus(); return; }
          st.done = true; save(); drawAll();
          if (live) startRest(e.target?.rest || S.settings.restSeconds || 90);
        } else { st.done = false; save(); drawAll(); }
      } }, icon('check', { size: 20 }));
      const del = iconBtn('trash', `Supprimer la série ${k + 1}`, () => { e.sets.splice(k, 1); save(); drawAll(); }, { cls: 'set-del' });
      row.append(typeBtn, loadIn, repIn, h('span', { class: 'set-actions' }, ok, del));
      table.append(row);
    });
    card.append(table);
    card.append(h('div', { class: 'row' },
      btn('Série', () => { const last = e.sets[e.sets.length - 1]; e.sets.push(newSet('work', last ? last.load : null, { reps: last ? (last.reps ?? last.ph?.reps) : null, seconds: last ? (last.seconds ?? last.ph?.seconds) : null })); save(); drawAll(); }, { small: true, iconName: 'plus' }),
      btn('Dupliquer la dernière', () => { const last = e.sets[e.sets.length - 1]; if (!last) return; e.sets.push({ ...JSON.parse(JSON.stringify(last)), id: uid(), done: false }); save(); drawAll(); }, { small: true, iconName: 'copy' }),
      btn('Échauffement', () => { e.sets.unshift(newSet('warmup', null, {})); save(); drawAll(); }, { small: true, iconName: 'plus' })));
    if (e.setsCountKnown === false) card.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (ev) => { e.setsCountKnown = ev.target.checked ? true : false; save(); } }), ' Le nombre de séries est connu (actuellement non précisé)'));
    const effHelp = h('p', { class: 'fine', hidden: true, text: Object.values(EFFORTS).map(x => `${x.label} : ${x.help}`).join(' ') });
    card.append(h('div', { class: 'field' }, h('div', { class: 'row-between' }, h('span', { class: 'label', text: 'Ressenti (facultatif)' }), h('button', { type: 'button', class: 'link-btn', 'aria-expanded': 'false', onclick: (ev) => { effHelp.hidden = !effHelp.hidden; ev.currentTarget.setAttribute('aria-expanded', String(!effHelp.hidden)); } }, 'Explication')),
      segmented(Object.fromEntries(Object.entries(EFFORTS).map(([k, v]) => [k, v.label])), e.effort, v => { e.effort = v; save(); }, { allowNone: true, cls: 'seg-wrap', label: 'Ressenti' }), effHelp));
    card.append(h('details', { class: 'variant' }, h('summary', { text: e.notes ? 'Note : ' + e.notes.slice(0, 40) : 'Ajouter une note' }), textArea(e.notes, { rows: 2, oninput: v => { e.notes = v; save(); } })));
    return card;
  }

  function cardioCard(e, i) {
    const card = h('article', { class: 'entry entry-cardio' });
    card.append(headRow(e, i, e.name));
    if (e.target) { card.append(h('p', { class: 'target', text: e.target.advice })); for (const f of e.target.flags || []) card.append(h('p', { class: 'fine', text: f })); }
    const kcal = h('p', { class: 'fine kcal-line' });
    const drawKcal = () => { const w = weightAt(S.data.measurements, sess.date); const r = cardioEntryCalories(e, w); kcal.textContent = 'Calories : ' + kcalResultText(r) + (r.kind === 'estimation' ? ' ' + weightNote(w, sess.date) : ''); };
    const upd = () => { save(); drawKcal(); };
    card.append(field('Type', selectInput(Object.fromEntries(Object.entries(CARDIO_TYPES).map(([k, v]) => [k, v.label])), e.cardioType, { oninput: v => { e.cardioType = v; e.exerciseId = CARDIO_TYPES[v].exerciseId; e.name = CARDIO_TYPES[v].label; save(); drawAll(); } })));
    card.append(h('div', { class: 'grid-3' },
      field('Durée (min)', numInput(e.durationMin, { decimals: 1, placeholder: e.ph?.durationMin ?? '', oninput: v => { e.durationMin = v; upd(); } })),
      field('Distance (km)', numInput(e.distanceKm, { oninput: v => { e.distanceKm = v; upd(); } })),
      field('Vitesse (km/h)', numInput(e.speedKmh, { decimals: 1, placeholder: e.ph?.speedKmh ?? '', oninput: v => { e.speedKmh = v; upd(); } })),
      field('Inclinaison (%)', numInput(e.inclinePct, { decimals: 1, placeholder: e.ph?.inclinePct ?? '', oninput: v => { e.inclinePct = v; upd(); } }))));
    card.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!e.durationIsMinimum, onchange: (ev) => { e.durationIsMinimum = ev.target.checked; upd(); } }), ' Durée minimale (au moins)'));
    if (e.ph && (e.ph.durationMin || e.ph.speedKmh)) card.append(btn('Reprendre les valeurs proposées', () => { e.durationMin = e.durationMin ?? e.ph.durationMin ?? null; e.speedKmh = e.speedKmh ?? e.ph.speedKmh ?? null; e.inclinePct = e.inclinePct ?? e.ph.inclinePct ?? null; save(); drawAll(); }, { small: true }));
    card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Intensité ressentie' }), segmented(INTENSITIES, e.intensity, v => { e.intensity = v; upd(); }, { allowNone: true })));
    const calDet = h('details', { class: 'variant' }, h('summary', { text: e.calories?.value ? `Calories saisies : ${fmtNum(e.calories.value, 0)} kcal` : 'Calories d’une montre ou d’un appareil (facultatif)' }));
    e.calories = e.calories || null;
    const c = e.calories || { value: null, convention: 'inconnue', source: 'appareil' };
    calDet.append(field('Valeur (kcal)', numInput(c.value, { decimals: 0, oninput: v => { c.value = v; e.calories = v ? c : null; upd(); } })),
      field('Convention', selectInput(KCAL_CONVENTIONS, c.convention, { oninput: v => { c.convention = v; if (e.calories) upd(); } })),
      field('Source', selectInput(KCAL_SOURCES, c.source, { oninput: v => { c.source = v; if (e.calories) upd(); } })));
    card.append(calDet, kcal);
    card.append(h('details', { class: 'variant' }, h('summary', { text: e.notes ? 'Note : ' + e.notes.slice(0, 40) : 'Ajouter une note' }), textArea(e.notes, { rows: 2, oninput: v => { e.notes = v; save(); } })));
    drawKcal();
    return card;
  }

  drawAll();
  root.append(h('div', { class: 'row add-row' },
    btn('Ajouter un exercice', () => openExercisePicker({ cat: 'muscu', filter: (x) => !(p.excluded || []).includes(x.id), onPick: (ex) => { sess.entries.push(strengthEntry(ex)); save(); drawAll(); } }), { iconName: 'plus' }),
    btn('Ajouter du cardio', () => {
      const sh = sheet({ title: 'Type de cardio', content: h('div', { class: 'stack' }, ...Object.entries(CARDIO_TYPES).map(([k, v]) => btn(v.label, () => { sh.close(); sess.entries.push(cardioEntry(k)); save(); drawAll(); }))) });
    }, { iconName: 'plus' })));
  root.append(h('div', { class: 'sticky-actions' },
    live ? btn('Abandonner', async () => {
      if (!await confirmDialog('Abandonner cette séance ? Les séries saisies seront supprimées.', { danger: true, confirmLabel: 'Abandonner' })) return;
      stopRest(); await deleteRecord('sessions', sess.id); go('#/accueil');
    }, { kind: 'ghost' }) : btn('Annuler', () => { go(`#/historique/s/${sess.id}`); }, { kind: 'ghost' }),
    btn(live ? 'Terminer la séance' : 'Enregistrer', () => finishDialog(sess, { live, save }), { kind: 'primary', iconName: 'check' })));
}

// ---------- Fin de séance et retour rapide ----------
function finishDialog(sess, { live, save }) {
  const p = S.profile;
  save.flush();
  const unvalidated = sess.entries.filter(e => e.kind !== 'cardio').flatMap(e => e.sets.filter(st => !st.done && ((st.reps !== null && st.reps !== undefined) || (st.seconds !== null && st.seconds !== undefined))));
  const measuredRaw = sess.startedAt && live ? Math.round((Date.now() - new Date(sess.startedAt)) / 60000) : null;
  const measured = measuredRaw && measuredRaw >= 1 ? measuredRaw : null;
  const f = {
    durationMin: sess.durationMin ?? measured, durationSource: sess.durationSource || (measured ? 'mesuree' : null), energy: sess.energy, difficulty: sess.difficulty,
    notes: sess.notes || '', pain: sess.pain || { zones: [], text: '' }, calories: sess.calories || { value: null, convention: 'inconnue', source: 'montre' },
    keepUnvalidated: true,
    fb: sess.feedback || { fatigue: null, liked: [], replace: [], actualTime: null },
  };
  const strengthEntries = sess.entries.filter(e => e.kind !== 'cardio');
  const exOpts = Object.fromEntries(strengthEntries.map(e => [e.exerciseId, e.name]));
  const content = h('div', { class: 'form' },
    unvalidated.length ? h('div', { class: 'card card-soft' }, h('p', { text: `${unvalidated.length} série(s) remplie(s) mais non validée(s).` }),
      segmented({ oui: 'Les compter comme faites', non: 'Les retirer' }, 'oui', v => { f.keepUnvalidated = v !== 'non'; })) : null,
    field('Date', dateInput(sess.date, { max: todayISO(), oninput: v => { if (v) sess.date = v; } })),
    field('Durée (min)', numInput(f.durationMin, { decimals: 0, placeholder: 'Inconnue', oninput: v => { f.durationMin = v; f.durationSource = v === measured ? 'mesuree' : (v ? 'saisie' : null); } }), { help: measured ? `Durée mesurée : ${fmtDuration(measured)}. Modifiable.` : 'Laisse vide si tu ne la connais pas.' }),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Énergie avant la séance' }), segmented(ENERGY, f.energy, v => { f.energy = v; }, { allowNone: true })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Difficulté globale' }), segmented(SESSION_DIFFICULTY, f.difficulty, v => { f.difficulty = v; }, { allowNone: true })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Gêne ou douleur pendant la séance' }), chips(ZONES, f.pain.zones, v => { f.pain.zones = v; }),
      textInput(f.pain.text, { placeholder: 'Précision facultative', oninput: v => { f.pain.text = v; } })),
    field('Notes', textArea(f.notes, { rows: 2, oninput: v => { f.notes = v; } })),
    h('details', { class: 'more' }, h('summary', { text: 'Calories de la séance indiquées par une montre (facultatif)' }),
      h('p', { class: 'fine', text: 'Une valeur globale remplace les estimations de la séance et de ses segments cardio : rien n’est additionné en double.' }),
      field('Valeur (kcal)', numInput(f.calories.value, { decimals: 0, oninput: v => { f.calories.value = v; } })),
      field('Convention', selectInput(KCAL_CONVENTIONS, f.calories.convention, { oninput: v => { f.calories.convention = v; } })),
      field('Source', selectInput(KCAL_SOURCES, f.calories.source, { oninput: v => { f.calories.source = v; } }))),
    h('details', { class: 'more', open: live },
      h('summary', { text: 'Retour rapide (facultatif)' }),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Fatigue générale' }), segmented({ faible: 'Faible', moyenne: 'Moyenne', elevee: 'Élevée' }, f.fb.fatigue, v => { f.fb.fatigue = v; }, { allowNone: true })),
      strengthEntries.length ? h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices appréciés' }), chips(exOpts, f.fb.liked, v => { f.fb.liked = v; })) : null,
      strengthEntries.length ? h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices à remplacer' }), chips(exOpts, f.fb.replace, v => { f.fb.replace = v; })) : null,
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Temps réellement disponible' }), segmented(['30', '45', '60', '75', '90'].map(v => ({ value: v, label: v + ' min' })), f.fb.actualTime ? String(f.fb.actualTime) : null, v => { f.fb.actualTime = v ? Number(v) : null; }, { allowNone: true, cls: 'seg-wrap' }))));
  const sh = sheet({ title: live ? 'Terminer la séance' : 'Enregistrer les modifications', content, wide: true, actions: [
    btn('Retour', () => sh.close()),
    btn('Enregistrer la séance', async () => {
      for (const e of sess.entries) if (e.kind !== 'cardio') {
        e.sets = e.sets.filter(st => {
          const has = (st.reps !== null && st.reps !== undefined) || (st.seconds !== null && st.seconds !== undefined);
          if (!has) return false;
          if (!st.done && !f.keepUnvalidated) return false;
          st.done = true; delete st.ph; return true;
        });
      }
      sess.entries = sess.entries.filter(e => e.kind === 'cardio' ? (e.durationMin || e.distanceKm) : e.sets.length);
      for (const e of sess.entries) { delete e.ph; }
      sess.durationMin = f.durationMin; sess.durationSource = f.durationSource; sess.energy = f.energy; sess.difficulty = f.difficulty; sess.notes = f.notes;
      sess.pain = (f.pain.zones.length || f.pain.text) ? f.pain : null;
      sess.calories = f.calories.value ? f.calories : null;
      const hasFb = f.fb.fatigue || f.fb.liked.length || f.fb.replace.length || f.fb.actualTime || f.difficulty;
      sess.feedback = hasFb ? { ...f.fb, difficulty: f.difficulty } : null;
      if (live) { sess.status = 'done'; sess.endedAt = nowISO(); }
      await saveRecord('sessions', sess);
      // Retours appliqués au profil
      let rebuild = false;
      if (f.fb.liked.length) p.favorites = [...new Set([...(p.favorites || []), ...f.fb.liked])];
      if (f.fb.replace.length) { p.replaceRequests = [...new Set([...(p.replaceRequests || []), ...f.fb.replace])]; rebuild = true; p.slotPins = Object.fromEntries(Object.entries(p.slotPins || {}).filter(([, v]) => !f.fb.replace.includes(v))); }
      await saveProfile(p, { rebuild: true });
      stopRest();
      sh.close();
      toast(live ? 'Séance enregistrée.' : 'Modifications enregistrées.');
      if (sess.pain) toast('Gêne ou douleur notée : elle sera rappelée avant la prochaine séance. Si elle persiste, demande un avis adapté.', { timeout: 7000 });
      go(`#/historique/s/${sess.id}`);
    }, { kind: 'primary' }),
  ] });
}

// ---------- Modèles ----------
export function renderTemplates(root) {
  root.append(pageHeader('Modèles de séance', { back: '#/profil' }));
  const tpls = S.data.templates;
  if (!tpls.length) { root.append(h('p', { class: 'muted', text: 'Aucun modèle. Ouvre une séance dans l’historique puis choisis « Enregistrer comme modèle ».' })); return; }
  root.append(h('ul', { class: 'list' }, ...tpls.map(t => h('li', { class: 'list-row' },
    h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: t.name }), h('span', { class: 'fine', text: t.entries.map(e => e.name).join(', ') })),
    btn('Utiliser', () => startDraft(newSessionObj({ entries: t.entries.map(instantiate) })), { small: true }),
    iconBtn('edit', 'Renommer', () => { let n = t.name; const sh = sheet({ title: 'Renommer le modèle', content: field('Nom', textInput(n, { oninput: v => { n = v; } })), actions: [btn('Enregistrer', async () => { t.name = n.trim() || t.name; await saveRecord('templates', t); sh.close(); rerender(); }, { kind: 'primary' })] }); }),
    iconBtn('trash', 'Supprimer', async () => { if (await confirmDialog(`Supprimer le modèle « ${t.name} » ?`, { danger: true, confirmLabel: 'Supprimer' })) { await deleteRecord('templates', t.id); rerender(); } })))));
}

export async function saveAsTemplate(sess) {
  let name = sess.suggestion?.title || `Séance du ${fmtDate(sess.date)}`;
  const sh = sheet({ title: 'Enregistrer comme modèle', content: field('Nom du modèle', textInput(name, { oninput: v => { name = v; } })), actions: [btn('Enregistrer', async () => {
    const entries = sess.entries.map(e => {
      const c = JSON.parse(JSON.stringify(e)); delete c.ph; delete c.target; delete c.lastRef;
      if (c.kind !== 'cardio') c.sets = c.sets.map(st => ({ id: uid(), type: st.type, load: st.load, reps: st.reps, seconds: st.seconds, done: false }));
      return c;
    });
    await saveRecord('templates', { id: uid(), name: name.trim() || 'Modèle', entries });
    sh.close(); toast('Modèle enregistré.');
  }, { kind: 'primary' })] });
}

export { startDraft, instantiate };
