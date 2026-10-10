import { h, clear, uid, fmtNum, parseNum } from '../util.js';
import { go } from '../router.js';
import { S, getEx, allExercises, saveRecord, deleteRecord, saveProfile } from '../state.js';
import { compatibility } from '../engine/suggest.js';
import { usageCounts } from '../engine/program.js';
import { MUSCLES, EQUIPMENT, FAMILIES, PATTERNS, LEVELS, MEASURES, LOADS, ZONES, MOVES, equipmentLabel, checkEquipment } from '../data/exercises.js';
import { sheet, btn, iconBtn, field, textInput, textArea, numInput, selectInput, chips, segmented, pageHeader, section, note, confirmDialog, toast, emptyState, icon } from '../ui/components.js';

function norm(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

// Sélecteur d'exercices.
// mode 'select' : choix libre (réglages du profil), simple ou multiple.
// mode 'add' / 'replace' : filtres du profil et du jour appliqués (exclusions, mouvements et exercices
// gênants, matériel, niveau, douleur du jour, rôle). Une exclusion n'est jamais contournée ;
// les autres conflits demandent une confirmation explicite.
export function openExercisePicker({ title = 'Choisir un exercice', multi = false, selected = [], onPick, filter, cat = null, mode = 'select', pattern = null, current = null, todayAttention = [] }) {
  let q = '';
  let showAll = false;
  const guarded = mode === 'add' || mode === 'replace';
  const sel = new Set(selected);
  const usage = usageCounts(S.data.sessions);
  const listEl = h('div', { class: 'picker-list' });
  const search = h('input', { type: 'search', placeholder: 'Rechercher (nom, muscle, machine)', 'aria-label': 'Rechercher un exercice', oninput: (e) => { q = norm(e.target.value); draw(); } });
  const toggle = h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { showAll = e.target.checked; draw(); } }),
    guarded ? (mode === 'replace' ? ' Afficher aussi les exercices non compatibles ou d’un autre rôle' : ' Afficher aussi les exercices non compatibles') : ' Afficher aussi le matériel non déclaré');
  const compat = (ex) => compatibility(ex, S.profile, { usage, todayAttention, pattern: mode === 'replace' ? pattern : null });
  function textMatch(ex) {
    if (cat && ex.cat !== cat) return false;
    if (filter && !filter(ex)) return false;
    if (current && ex.id === current.id) return false;
    if (!q) return true;
    const hay = norm([ex.name, ex.desc, ...ex.primary.map(m => MUSCLES[m]), PATTERNS[ex.pattern], equipmentLabel(ex)].join(' '));
    return q.split(/\s+/).every(w => hay.includes(w));
  }
  async function choose(ex, c) {
    if (c && c.blocked) { toast('Cet exercice est exclu de ton profil. Retire l’exclusion dans Profil > Matériel et exercices pour le proposer.', { kind: 'error', timeout: 6000 }); return; }
    if (c && (c.reasons.length || !c.sameRole)) {
      const why = [...c.reasons, ...(!c.sameRole ? ['Rôle différent de l’exercice remplacé'] : [])];
      const ok = await confirmDialog(`${ex.name} ne correspond pas à tes réglages : ${why.join(' ; ').toLowerCase()}.`, { title: 'Conflit avec ton profil', confirmLabel: 'Choisir quand même', detail: 'Ton profil n’est pas modifié. L’exercice est ajouté seulement à cette séance.' });
      if (!ok) return;
    }
    sh.close(); onPick(ex);
  }
  function row(ex, c, noteTxt) {
    const b = h('button', { type: 'button', class: `pick-row${c && !c.ok ? ' conflict' : ''}`, 'aria-pressed': multi ? String(sel.has(ex.id)) : null, onclick: () => {
      if (multi) { if (sel.has(ex.id)) sel.delete(ex.id); else sel.add(ex.id); b.setAttribute('aria-pressed', String(sel.has(ex.id))); }
      else if (guarded) choose(ex, c);
      else { sh.close(); onPick(ex); }
    } },
      h('span', { class: 'pick-main' }, h('span', { class: 'pick-name', text: ex.name + (ex.custom ? ' (perso)' : '') }),
        h('span', { class: 'fine', text: c && !c.ok ? (c.blocked ? 'Exclu de ton profil' : [...c.reasons, ...(!c.sameRole ? ['Autre rôle : ' + (PATTERNS[ex.pattern] || '').toLowerCase()] : [])].join(' ; ')) : (noteTxt || `${ex.primary.map(m => MUSCLES[m]).join(', ')} · ${equipmentLabel(ex)}`) })),
      c && c.blocked ? h('span', { class: 'tag tag-alert', text: 'Exclu' }) : c && !c.ok ? h('span', { class: 'tag', text: 'À confirmer' }) : null,
      !guarded && (S.profile?.excluded || []).includes(ex.id) ? h('span', { class: 'tag tag-alert', text: 'Exclu' }) : null,
      multi ? h('span', { class: 'pick-check', 'aria-hidden': 'true' }, icon('check', { size: 18 })) : null);
    return b;
  }
  function draw() {
    clear(listEl);
    const all = allExercises().filter(textMatch);
    if (!guarded) {
      const groups = {};
      for (const ex of all) {
        if (!showAll && S.profile && (S.profile.equipment || []).length && !checkEquipment(ex, S.profile.equipment) && !sel.has(ex.id)) continue;
        (groups[ex.cat === 'cardio' ? 'cardio' : ex.pattern] = groups[ex.cat === 'cardio' ? 'cardio' : ex.pattern] || []).push(ex);
      }
      if (!Object.keys(groups).length) listEl.append(h('p', { class: 'muted', text: 'Aucun exercice ne correspond.' }));
      for (const [k, list] of Object.entries(groups)) listEl.append(h('h3', { class: 'picker-group', text: k === 'cardio' ? 'Cardio' : PATTERNS[k] || k }), ...list.map(ex => row(ex)));
      return;
    }
    const scored = all.map(ex => ({ ex, c: compat(ex) }));
    const altIds = current ? (current.alts || []).map(([id]) => id) : [];
    const good = scored.filter(x => x.c.ok).sort((a, b) => (altIds.includes(b.ex.id) - altIds.includes(a.ex.id)) || ((usage[b.ex.id] || 0) - (usage[a.ex.id] || 0)));
    const noteFor = (ex) => current ? ((current.alts || []).find(([id]) => id === ex.id) || [])[1] : null;
    if (mode === 'replace') {
      listEl.append(h('h3', { class: 'picker-group', text: `Compatibles, même rôle (${PATTERNS[pattern] || 'exercice'})` }));
      if (good.length) listEl.append(...good.map(x => row(x.ex, x.c, noteFor(x.ex))));
      else listEl.append(h('p', { class: 'muted', text: 'Aucune alternative compatible pour ce rôle. Les charges ne sont jamais transférées d’un exercice à l’autre.' }));
    } else {
      const groups = {};
      for (const x of good) (groups[x.ex.pattern] = groups[x.ex.pattern] || []).push(x);
      for (const [k, list] of Object.entries(groups)) listEl.append(h('h3', { class: 'picker-group', text: PATTERNS[k] || k }), ...list.map(x => row(x.ex, x.c)));
      if (!good.length) listEl.append(h('p', { class: 'muted', text: 'Aucun exercice compatible ne correspond.' }));
    }
    const others = scored.filter(x => !x.c.ok);
    if (showAll && others.length) {
      listEl.append(h('h3', { class: 'picker-group', text: 'Non compatibles avec tes réglages' }), ...others.map(x => row(x.ex, x.c)));
    } else if (others.length) listEl.append(h('p', { class: 'fine', text: `${others.length} exercice(s) masqué(s) car non compatibles avec ton profil ou la séance du jour.` }));
  }
  draw();
  const sh = sheet({ title, wide: true, content: h('div', { class: 'stack-sm' }, search, toggle, listEl),
    actions: multi ? [btn('Valider', () => { sh.close(); onPick([...sel]); }, { kind: 'primary' })] : [] });
  return sh;
}

// Fiche d'un exercice
export function openExerciseDetail(ex) {
  const p = S.profile;
  const fav = (p.favorites || []).includes(ex.id);
  const exc = (p.excluded || []).includes(ex.id);
  const inc = (p.increments || {})[ex.id];
  let incVal = inc ?? null;
  const content = h('div', { class: 'ex-detail' },
    h('p', { text: ex.desc }),
    ex.cues ? h('p', {}, h('strong', { text: 'Consignes : ' }), ex.cues) : null,
    ex.caution ? note(ex.caution) : null,
    h('dl', { class: 'dl' },
      h('dt', { text: 'Muscles principaux' }), h('dd', { text: ex.primary.map(m => MUSCLES[m]).join(', ') || '—' }),
      h('dt', { text: 'Muscles secondaires' }), h('dd', { text: ex.secondary.map(m => MUSCLES[m]).join(', ') || '—' }),
      h('dt', { text: 'Famille' }), h('dd', { text: FAMILIES[ex.family] || '—' }),
      h('dt', { text: 'Matériel' }), h('dd', { text: equipmentLabel(ex) }),
      h('dt', { text: 'Maîtrise' }), h('dd', { text: LEVELS[ex.level] }),
      h('dt', { text: 'Type' }), h('dd', { text: `${ex.compound ? 'Polyarticulaire' : 'Isolation'}, ${ex.unilateral ? 'unilatéral' : 'bilatéral'}` }),
      h('dt', { text: 'Mesure' }), h('dd', { text: `${MEASURES[ex.measure]} — ${LOADS[ex.load]}` }),
      ex.zones.length ? h('dt', { text: 'Articulations sollicitées' }) : null, ex.zones.length ? h('dd', { text: ex.zones.map(z => ZONES[z]).join(', ') }) : null),
    ex.alts.length ? h('div', {}, h('h3', { class: 'h3', text: 'Alternatives proches' }),
      h('ul', { class: 'list' }, ...ex.alts.map(([id, d]) => { const a = getEx(id); return a ? h('li', {}, h('button', { type: 'button', class: 'link-btn', onclick: () => { sh.close(); openExerciseDetail(a); } }, a.name), h('span', { class: 'muted', text: ' — ' + d })) : null; }))) : null,
    ex.measure === 'load_reps' || ex.measure === 'assist_reps' || ex.measure === 'time' ? field(`Incrément pour toi (${ex.measure === 'time' ? 's' : 'kg'})`, numInput(incVal, { placeholder: fmtNum(ex.inc, 2), oninput: (v) => { incVal = v; } }), { help: 'Plus petit écart disponible sur ta machine ou tes haltères. Vide = valeur par défaut.' }) : null,
  );
  const sh = sheet({ title: ex.name, content, wide: true, actions: [
    btn(fav ? 'Retirer des préférés' : 'Préféré', async () => { toggle('favorites', ex.id); }, { small: true }),
    btn(exc ? 'Ne plus exclure' : 'Exclure', async () => { toggle('excluded', ex.id); }, { small: true, kind: exc ? 'secondary' : 'danger' }),
    btn('Enregistrer', async () => {
      p.increments = { ...(p.increments || {}) };
      if (incVal) p.increments[ex.id] = incVal; else delete p.increments[ex.id];
      await saveProfile(p, { rebuild: false }); sh.close(); toast('Exercice mis à jour.');
    }, { kind: 'primary', small: true }),
  ] });
  async function toggle(listName, id) {
    const set = new Set(p[listName] || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    p[listName] = [...set];
    await saveProfile(p);
    sh.close();
    toast(listName === 'excluded' ? (set.has(id) ? 'Exercice exclu de tes propositions.' : 'Exercice de nouveau proposé.') : (set.has(id) ? 'Ajouté aux préférés.' : 'Retiré des préférés.'));
  }
}

// Vue Profil > Exercices
export function renderExercises(root) {
  root.append(pageHeader('Exercices', { back: '#/profil', actions: [btn('Créer', () => { go('#/exercices/nouveau'); }, { iconName: 'plus', small: true })] }));
  const custom = S.data.customExercises;
  root.append(section('Mes exercices personnalisés',
    custom.length ? h('ul', { class: 'list' }, ...custom.map(ex => h('li', {}, h('a', { class: 'list-link', href: `#/exercices/${ex.id}` }, h('span', { class: 'grow', text: ex.name }), h('span', { class: 'muted', text: PATTERNS[ex.pattern] || '' }))))) :
      h('p', { class: 'muted', text: 'Aucun pour l’instant. Crée un exercice si une machine de ta salle n’est pas dans la bibliothèque.' })));
  let q = '';
  const list = h('div', {});
  const draw = () => {
    clear(list);
    const items = allExercises().filter(ex => !q || norm(ex.name + ' ' + ex.primary.map(m => MUSCLES[m]).join(' ')).includes(q));
    list.append(h('ul', { class: 'list' }, ...items.map(ex => h('li', {}, h('button', { type: 'button', class: 'list-link', onclick: () => openExerciseDetail(ex) },
      h('span', { class: 'grow', text: ex.name }),
      (S.profile.favorites || []).includes(ex.id) ? h('span', { class: 'tag', text: 'Préféré' }) : null,
      (S.profile.excluded || []).includes(ex.id) ? h('span', { class: 'tag tag-alert', text: 'Exclu' }) : null,
      h('span', { class: 'muted', text: ex.primary.map(m => MUSCLES[m])[0] || '' }))))));
  };
  root.append(section(`Bibliothèque (${allExercises().length} exercices)`,
    h('input', { type: 'search', placeholder: 'Rechercher', 'aria-label': 'Rechercher dans la bibliothèque', oninput: (e) => { q = norm(e.target.value); draw(); } }), list));
  draw();
}

// Formulaire d'exercice personnalisé
export function renderCustomExerciseForm(root, id) {
  const existing = id && id !== 'nouveau' ? S.data.customExercises.find(e => e.id === id) : null;
  const ex = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: 'perso-' + uid(), custom: true, name: '', desc: '', cues: '', caution: '', cat: 'muscu', family: 'poussee', pattern: 'poussee_horizontale',
    primary: [], secondary: [], eq: [], level: 1, compound: false, unilateral: false, measure: 'load_reps', load: 'total', inc: 2.5, zones: [], moves: [], alts: [],
  };
  root.append(pageHeader(existing ? 'Modifier l’exercice' : 'Nouvel exercice', { back: '#/exercices' }));
  const eqFlat = ex.eq.flat();
  const altIds = ex.alts.map(([a]) => a);
  const altLabel = h('p', { class: 'muted', text: altIds.length ? altIds.map(a => getEx(a)?.name).filter(Boolean).join(', ') : 'Aucune' });
  root.append(h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    if (!ex.name.trim()) { toast('Donne un nom à l’exercice.', { kind: 'error' }); return; }
    if (!ex.primary.length) { toast('Choisis au moins un muscle principal.', { kind: 'error' }); return; }
    if (ex.measure === 'cardio') { ex.cat = 'cardio'; ex.pattern = 'cardio'; ex.family = 'locomotion'; ex.load = 'none'; }
    if (ex.measure === 'assist_reps') ex.load = 'assist';
    await saveRecord('customExercises', ex);
    toast('Exercice enregistré.');
    go('#/exercices');
  } },
    field('Nom', textInput(ex.name, { oninput: v => { ex.name = v; } })),
    field('Description', textArea(ex.desc, { oninput: v => { ex.desc = v; }, rows: 2 })),
    field('Consignes', textArea(ex.cues, { oninput: v => { ex.cues = v; }, rows: 2 })),
    field('Points d’attention', textArea(ex.caution, { oninput: v => { ex.caution = v; }, rows: 2 })),
    field('Rôle dans un programme', selectInput(PATTERNS, ex.pattern, { oninput: v => { ex.pattern = v; } })),
    field('Famille de mouvement', selectInput(FAMILIES, ex.family, { oninput: v => { ex.family = v; } })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Muscles principaux' }), chips(MUSCLES, ex.primary, v => { ex.primary = v; })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Muscles secondaires' }), chips(MUSCLES, ex.secondary, v => { ex.secondary = v; })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Matériel nécessaire' }), chips(EQUIPMENT, eqFlat, v => { ex.eq = v; })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Niveau de maîtrise' }), segmented(LEVELS, String(ex.level), v => { ex.level = Number(v); })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Type' }), segmented({ true: 'Polyarticulaire', false: 'Isolation' }, String(ex.compound), v => { ex.compound = v === 'true'; })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Côtés' }), segmented({ false: 'Bilatéral', true: 'Unilatéral' }, String(ex.unilateral), v => { ex.unilateral = v === 'true'; })),
    field('Type de mesure', selectInput(MEASURES, ex.measure, { oninput: v => { ex.measure = v; } })),
    field('Convention de charge', selectInput(LOADS, ex.load, { oninput: v => { ex.load = v; } })),
    field('Incrément par défaut', numInput(ex.inc, { oninput: v => { ex.inc = v ?? 0; } }), { help: 'En kg, en secondes pour un exercice chronométré, en répétitions au poids du corps.' }),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Articulations sollicitées' }), chips(Object.fromEntries(Object.entries(ZONES).filter(([k]) => k !== 'autre')), ex.zones, v => { ex.zones = v; })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Caractéristiques du mouvement' }), chips(Object.fromEntries(Object.entries(MOVES).map(([k, m]) => [k, m.label])), ex.moves, v => { ex.moves = v; })),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Alternatives proches' }), altLabel,
      btn('Choisir', () => openExercisePicker({ multi: true, selected: altIds, onPick: (ids) => { ex.alts = ids.map(a => [a, '']); altLabel.textContent = ids.map(a => getEx(a)?.name).join(', ') || 'Aucune'; } }), { small: true })),
    h('div', { class: 'row' },
      h('button', { type: 'submit', class: 'btn btn-primary', text: 'Enregistrer' }),
      existing ? btn('Supprimer', async () => {
        const used = S.data.sessions.some(s => (s.entries || []).some(e => e.exerciseId === ex.id));
        if (!await confirmDialog(used ? 'Cet exercice figure dans ton historique. Les séances garderont son nom, mais il ne sera plus proposé.' : 'Supprimer cet exercice ?', { danger: true, confirmLabel: 'Supprimer' })) return;
        await deleteRecord('customExercises', ex.id); go('#/exercices');
      }, { kind: 'danger' }) : null)));
}
