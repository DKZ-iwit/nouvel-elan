import { h, clear, uid, fmtDate } from '../util.js';
import { go } from '../router.js';
import { S, saveProfile, getEx } from '../state.js';
import { ZONES, MOVES } from '../data/exercises.js';
import { sheet, btn, field, textInput, textArea, chips, segmented, pageHeader, section, note, confirmDialog, toast, icon } from '../ui/components.js';
import { openExercisePicker } from './exercises.js';

export const SIDES = { gauche: 'Gauche', droit: 'Droit', deux: 'Les deux' };
export const NATURES = {
  fragilite_connue: 'Fragilité connue', mobilite_limitee: 'Mobilité limitée', lourdeur: 'Lourdeur',
  gene_occasionnelle: 'Gêne occasionnelle', douleur_actuelle: 'Douleur actuelle', autre: 'Autre',
};

export function movesForZone(zone) {
  return Object.fromEntries(Object.entries(MOVES).filter(([, m]) => zone === 'autre' || m.zones.includes(zone)).map(([k, m]) => [k, m.label]));
}

function summary(a) {
  const bits = [];
  if (a.side) bits.push(SIDES[a.side]); else bits.push('côté non précisé');
  if ((a.nature || []).length) bits.push(a.nature.map(n => n === 'autre' && a.natureOther ? a.natureOther : NATURES[n]).join(', '));
  return bits.join(' — ');
}

// Carte de précision courte lorsqu'une zone est déclarée sans indication de mouvements gênants.
export function clarificationCards(profile, onDone) {
  const out = [];
  for (const a of profile.attention || []) {
    if ((a.problemMoves || []).length || a.problemMovesConfirmed) continue;
    let pick = [];
    const card = h('div', { class: 'card card-soft' },
      h('p', { class: 'card-title', text: `${ZONES[a.zone] || 'Zone'} : certains mouvements te gênent-ils ?` }),
      h('p', { class: 'fine', text: 'Cette précision permet d’écarter seulement ce qui te gêne, sans rien interdire par principe.' }),
      chips(movesForZone(a.zone), [], v => { pick = v; }),
      h('div', { class: 'row' },
        btn('Aucun en particulier', async () => { a.problemMovesConfirmed = true; await saveProfile(profile); toast('Précision enregistrée.'); onDone && onDone(); }, { small: true }),
        btn('Enregistrer', async () => { a.problemMoves = pick; a.problemMovesConfirmed = true; await saveProfile(profile); toast('Précision enregistrée.'); onDone && onDone(); }, { small: true, kind: 'primary' })));
    out.push(card);
  }
  return out;
}

export function openZoneEditor(existing, onSaved) {
  const p = S.profile;
  const a = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), zone: null, side: null, nature: [], natureOther: '', problemMoves: [], problemMovesConfirmed: false, problemExercises: [], tolerated: [], proRestrictions: '', comment: '', lastStatus: null };
  const movesWrap = h('div', {});
  const exLabel = h('p', { class: 'muted' }), tolLabel = h('p', { class: 'muted' });
  const drawLabels = () => {
    exLabel.textContent = a.problemExercises.map(id => getEx(id)?.name).filter(Boolean).join(', ') || 'Aucun';
    tolLabel.textContent = a.tolerated.map(id => getEx(id)?.name).filter(Boolean).join(', ') || 'Aucun';
  };
  const drawMoves = () => { clear(movesWrap); if (a.zone) movesWrap.append(chips(movesForZone(a.zone), a.problemMoves, v => { a.problemMoves = v; a.problemMovesConfirmed = true; })); else movesWrap.append(h('p', { class: 'muted', text: 'Choisis d’abord une zone.' })); };
  drawLabels(); drawMoves();
  const used = new Set((p.attention || []).filter(x => x.id !== a.id).map(x => x.zone));
  const zoneOpts = Object.fromEntries(Object.entries(ZONES).filter(([k]) => !used.has(k) || k === 'autre'));
  const content = h('div', { class: 'form' },
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Zone' }), segmented(zoneOpts, a.zone, v => { a.zone = v; a.problemMoves = []; drawMoves(); }, { cls: 'seg-wrap' })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Côté' }), segmented(SIDES, a.side, v => { a.side = v; }, { allowNone: true })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Nature' }), chips(NATURES, a.nature, v => { a.nature = v; })),
    field('Précision (si « Autre »)', textInput(a.natureOther, { oninput: v => { a.natureOther = v; }, placeholder: 'Facultatif' })),
    h('details', { class: 'more', open: !!existing },
      h('summary', { text: 'Précisions facultatives' }),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Mouvements qui posent problème' }), movesWrap),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices qui posent problème' }), exLabel, btn('Choisir', () => openExercisePicker({ multi: true, selected: a.problemExercises, onPick: ids => { a.problemExercises = ids; drawLabels(); } }), { small: true })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices habituellement bien tolérés' }), tolLabel, btn('Choisir', () => openExercisePicker({ multi: true, selected: a.tolerated, onPick: ids => { a.tolerated = ids; drawLabels(); } }), { small: true })),
      field('Restrictions ou consignes d’un professionnel', textArea(a.proRestrictions, { oninput: v => { a.proRestrictions = v; }, rows: 2, placeholder: 'Saisie libre' }), { help: 'Ces consignes sont affichées telles quelles ; l’application ne les interprète pas automatiquement. Pour qu’un exercice ne soit plus proposé, ajoute-le aux exercices qui posent problème.' }),
      field('Commentaire', textArea(a.comment, { oninput: v => { a.comment = v; }, rows: 2 }))));
  const sh = sheet({ title: existing ? `Modifier : ${ZONES[a.zone]}` : 'Ajouter un point d’attention', content, wide: true, actions: [
    existing ? btn('Supprimer', async () => {
      if (!await confirmDialog('Retirer ce point d’attention de ton profil ?', { danger: true, confirmLabel: 'Retirer' })) return;
      p.attention = p.attention.filter(x => x.id !== a.id); await saveProfile(p); sh.close(); onSaved && onSaved();
    }, { kind: 'danger' }) : null,
    btn('Enregistrer', async () => {
      if (!a.zone) { toast('Choisis une zone.', { kind: 'error' }); return; }
      const i = (p.attention || []).findIndex(x => x.id === a.id);
      p.attention = [...(p.attention || [])];
      if (i >= 0) p.attention[i] = a; else p.attention.push(a);
      await saveProfile(p); sh.close(); toast('Point d’attention enregistré.'); onSaved && onSaved();
    }, { kind: 'primary' }),
  ].filter(Boolean) });
}

export function renderAttention(root, params) {
  const p = S.profile;
  const isNew = params.get('nouveau');
  root.append(pageHeader('Confort et points d’attention', { back: isNew ? null : '#/profil',
    sub: 'Facultatif. Ces informations orientent les propositions avec prudence ; elles ne remplacent pas un avis médical.' }));
  const list = h('div', {});
  const draw = () => {
    clear(list);
    if (!(p.attention || []).length) list.append(h('p', { class: 'muted', text: 'Aucun point d’attention renseigné.' }));
    for (const a of p.attention || []) {
      list.append(h('div', { class: 'card' },
        h('div', { class: 'row-between' }, h('p', { class: 'card-title', text: ZONES[a.zone] || a.zone }), btn('Modifier', () => openZoneEditor(a, draw), { small: true, iconName: 'edit' })),
        h('p', { class: 'muted', text: summary(a) }),
        (a.problemMoves || []).length ? h('p', { class: 'fine', text: 'Mouvements gênants : ' + a.problemMoves.map(m => MOVES[m]?.label).join(', ') }) : h('p', { class: 'fine', text: a.problemMovesConfirmed ? 'Aucun mouvement gênant indiqué.' : 'Mouvements gênants : non précisés.' }),
        (a.problemExercises || []).length ? h('p', { class: 'fine', text: 'Exercices gênants : ' + a.problemExercises.map(id => getEx(id)?.name).join(', ') }) : null,
        (a.tolerated || []).length ? h('p', { class: 'fine', text: 'Bien tolérés : ' + a.tolerated.map(id => getEx(id)?.name).join(', ') }) : null,
        a.proRestrictions ? h('p', { class: 'fine', text: 'Consignes d’un professionnel : ' + a.proRestrictions }) : null,
        a.comment ? h('p', { class: 'fine', text: a.comment }) : null,
        a.lastStatus ? h('p', { class: 'fine', text: `Dernier état indiqué : ${a.lastStatus.painFree ? 'sans douleur' : a.lastStatus.level === 'gene' ? 'gêne' : 'douleur'}${a.lastStatus.date ? ' (' + fmtDate(a.lastStatus.date) + ')' : ''}${a.lastStatus.note ? '. ' + a.lastStatus.note : ''}` }) : null));
    }
    for (const c of clarificationCards(p, draw)) list.append(c);
  };
  draw();
  root.append(list);
  root.append(h('div', { class: 'row' },
    btn('Ajouter une zone', () => openZoneEditor(null, draw), { iconName: 'plus', kind: isNew ? 'secondary' : 'primary' }),
    isNew ? btn('Continuer', () => { go('#/accueil'); }, { kind: 'primary' }) : null));
  root.append(note('Avant chaque séance, l’application te demande s’il y a un point d’attention aujourd’hui. Une absence de douleur passée n’est jamais considérée comme valable pour le jour même sans ta confirmation.'));
}
