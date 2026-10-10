import { h, fmtDate, fmtNum } from '../util.js';
import { S, saveProfile, getEx, allExercises } from '../state.js';
import { PATTERNS, CARDIO_TYPES } from '../data/exercises.js';
import { LEVEL_OPTIONS, GOALS } from '../data/programs.js';
import { missingForProgram, candidatesFor, usageCounts } from '../engine/program.js';
import { btn, segmented, pageHeader, section, note, toast, sheet } from '../ui/components.js';
import { GOAL_OPTIONS } from './common.js';
import { clarificationCards } from './attention.js';
import { rerender , go } from '../router.js';

const PRIO = { 1: 'Essentiel', 2: 'Important', 3: 'Facultatif' };

export function completeProgramCard(p) {
  const missing = missingForProgram(p);
  const draft = { goal: p.goal, gymPerWeek: p.gymPerWeek, level: p.level, durationMin: p.durationMin };
  const card = h('div', { class: 'card' },
    h('p', { class: 'card-title', text: 'Complète ton programme' }),
    h('p', { class: 'muted', text: `Il manque ${missing.length > 1 ? 'quelques informations' : 'une information'} pour proposer des séances adaptées.` }));
  for (const m of missing) {
    if (m.field === 'goal') card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Objectif principal' }), segmented(GOAL_OPTIONS, null, v => { draft.goal = v; }, { cls: 'seg-wrap' })));
    if (m.field === 'gymPerWeek') card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Combien de séances en salle par semaine ?' }), segmented(['1', '2', '3', '4', '5', '6'].map(v => ({ value: v, label: v })), null, v => { draft.gymPerWeek = v ? Number(v) : null; })));
    if (m.field === 'level') card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Ton niveau' }), segmented(Object.fromEntries(Object.entries(LEVEL_OPTIONS).map(([k, v]) => [k, v.label])), null, v => { draft.level = v; }, { cls: 'seg-wrap' })));
    if (m.field === 'durationMin') card.append(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Durée habituelle d’une séance' }), segmented(['30', '45', '60', '75', '90'].map(v => ({ value: v, label: v + ' min' })), null, v => { draft.durationMin = v ? Number(v) : null; }, { cls: 'seg-wrap' })));
  }
  card.append(btn('Créer mon programme', async () => {
    Object.assign(p, Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== null && v !== undefined)));
    const still = missingForProgram(p);
    if (still.length) { toast('Il manque encore : ' + still.map(x => x.label.toLowerCase()).join(', ') + '.', { kind: 'error' }); return; }
    await saveProfile(p);
    toast('Programme créé.');
    rerender();
  }, { kind: 'primary' }));
  return card;
}

function openSlotPicker(p, slot) {
  const cands = candidatesFor(slot.pattern, p, allExercises(), { usage: usageCounts(S.data.sessions) });
  const content = h('div', {},
    h('p', { class: 'muted', text: `Exercices compatibles avec ton matériel, ton niveau et tes exclusions pour le rôle « ${PATTERNS[slot.pattern]} ».` }),
    h('ul', { class: 'list' }, ...cands.map(c => h('li', {}, h('button', { type: 'button', class: 'list-link', 'aria-current': c.ex.id === slot.exerciseId ? 'true' : null, onclick: async () => {
      p.slotPins = { ...(p.slotPins || {}), [slot.key]: c.ex.id };
      await saveProfile(p); sh.close(); toast(`${c.ex.name} retenu pour ce créneau.`); rerender();
    } }, h('span', { class: 'grow', text: c.ex.name }), h('span', { class: 'fine', text: c.why.join(', ') }))))),
    (p.slotPins || {})[slot.key] ? btn('Revenir au choix automatique', async () => { const pins = { ...p.slotPins }; delete pins[slot.key]; p.slotPins = pins; await saveProfile(p); sh.close(); rerender(); }, { small: true }) : null);
  const sh = sheet({ title: 'Changer l’exercice', content, wide: true });
}

export function renderProgram(root) {
  const p = S.profile;
  root.append(pageHeader('Mon programme', { back: '#/profil' }));
  for (const c of clarificationCards(p, () => rerender())) root.append(c);
  if (missingForProgram(p).length || !p.program || p.program.status !== 'ok') {
    root.append(completeProgramCard(p));
    return;
  }
  const pr = p.program;
  const g = GOALS[pr.goal];
  root.append(section('Lien avec tes objectifs',
    h('p', { class: 'lead-sm', text: `${pr.goalLabel}${pr.secondaryGoals.length ? ', avec ' + pr.secondaryGoals.map(x => GOAL_OPTIONS[x].toLowerCase()).join(', ') : ''}` }),
    p.goalNote ? h('p', { class: 'muted', text: p.goalNote }) : null,
    h('ul', { class: 'bullets' }, ...pr.explanation.map(t => h('li', { text: t }))),
    h('div', { class: 'row' }, btn('Modifier l’objectif', () => { go('#/profil/edition'); }, { small: true, iconName: 'edit' }),
      btn('Recalculer', async () => { await saveProfile(p); toast('Programme recalculé. Ton historique est conservé.'); rerender(); }, { small: true }))));

  root.append(section('Trame de la semaine',
    h('ul', { class: 'week-plan' }, ...pr.weekPlan.map(w => h('li', {}, h('span', { class: 'wp-day', text: w.weekday }), h('span', { text: pr.days.find(d => d.id === w.dayId).label })))),
    h('p', { class: 'fine', text: 'Jours indicatifs : en cas de séance manquée, la suivante reprend dans l’ordre, sans cumuler.' })));

  for (const d of pr.days) {
    root.append(section(d.label, h('ul', { class: 'slots' }, ...d.slots.map(sl => {
      const ex = sl.exerciseId ? getEx(sl.exerciseId) : null;
      return h('li', { class: `slot prio-${sl.prio}` },
        h('div', { class: 'grow' },
          h('p', { class: 'slot-name', text: ex ? ex.name : 'Aucun exercice compatible' }),
          h('p', { class: 'fine', text: `${PATTERNS[sl.pattern]}${sl.reason ? ' — ' + sl.reason : ''}` })),
        h('span', { class: `tag prio-tag-${sl.prio}`, text: PRIO[sl.prio] }),
        btn('', () => openSlotPicker(p, sl), { small: true, iconName: 'swap', ariaLabel: 'Changer l’exercice de ce créneau' }));
    }))));
  }

  const pa = pr.params;
  root.append(section('Séries, répétitions et repos',
    h('div', { class: 'kvs' },
      h('div', { class: 'kv' }, h('span', { class: 'kv-l', text: 'Exercices principaux' }), h('span', { class: 'kv-v', text: `${pa.sets[1]} séries de ${pa.reps[0]} à ${pa.reps[1]} rép., repos ${pa.rest[1]} s` })),
      h('div', { class: 'kv' }, h('span', { class: 'kv-l', text: 'Exercices secondaires' }), h('span', { class: 'kv-v', text: `${pa.sets[0]} à ${pa.sets[1]} séries de ${(pr.goal === 'force' ? pa.accessoryReps : pa.reps).join(' à ')} rép., repos ${pa.rest[0]} s` })),
      h('div', { class: 'kv' }, h('span', { class: 'kv-l', text: 'Exercices facultatifs' }), h('span', { class: 'kv-v', text: `${pa.sets[0]} séries de ${pa.accessoryReps.join(' à ')} rép.` })),
      pa.weeklySets ? h('div', { class: 'kv' }, h('span', { class: 'kv-l', text: 'Volume visé' }), h('span', { class: 'kv-v', text: `${pa.weeklySets[0]} à ${pa.weeklySets[1]} séries par muscle et par semaine` })) : null)));

  root.append(section('Cardio',
    h('p', { text: `${pr.cardio.minutes} min par séance, intensité ${pr.cardio.intensity}, en ${pr.cardio.types.map(t => CARDIO_TYPES[t]?.label.toLowerCase()).join(' ou ')}.` }),
    h('p', { class: 'muted', text: g.cardioWhy }),
    pr.cardio.progressive.length ? h('p', { class: 'fine', text: `À intégrer progressivement : ${pr.cardio.progressive.join(', ')}. Des intervalles courts sont proposés en option quand la forme du jour le permet.` }) : null,
    h('p', { class: 'fine', text: 'Les activités hors salle comptent dans l’objectif cardio de la semaine, pondérées par leur intensité (une sortie à vélo électrique peu soutenue compte pour moitié).' })));

  root.append(section('Priorités', h('ul', { class: 'bullets' }, ...pr.priorities.map(t => h('li', { text: t })))));
  root.append(section('Règles de progression', h('ul', { class: 'bullets' }, ...pr.rules.map(t => h('li', { text: t })))));
  root.append(section('Critères d’adaptation', h('ul', { class: 'bullets' }, ...pr.adaptationCriteria.map(t => h('li', { text: t })))));

  const adapt = S.data.sessions.filter(s => s.status === 'done' && s.suggestion && s.suggestion.reasons && s.suggestion.reasons.length > 1)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  root.append(section('Adaptations récentes',
    adapt.length ? h('ul', { class: 'list' }, ...adapt.map(s => h('li', { class: 'list-col' }, h('span', { class: 'fine', text: fmtDate(s.date) + ' — ' + s.suggestion.title }), ...s.suggestion.reasons.slice(1).map(r => h('span', { text: r }))))) :
      h('p', { class: 'muted', text: 'Aucune adaptation particulière pour l’instant.' }),
    (p.replaceRequests || []).length ? h('p', { class: 'fine', text: 'Exercices que tu as demandé à remplacer : ' + p.replaceRequests.map(id => getEx(id)?.name).filter(Boolean).join(', ') }) : null,
    (p.replaceRequests || []).length ? btn('Réinitialiser ces demandes', async () => { p.replaceRequests = []; await saveProfile(p); rerender(); }, { small: true }) : null));
}
