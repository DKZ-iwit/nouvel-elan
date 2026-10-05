import { h, clear, fmtDate, fmtNum, fmtDuration, weekStart, addDays } from '../util.js';
import { go } from '../router.js';
import { S, getEx, deleteRecord } from '../state.js';
import { ACTIVITY_TYPES, ZONES, EFFORTS, INTENSITIES } from '../data/exercises.js';
import { doneSessions, summarizeSets, sessionVolume, workSetCount, personalRecords, exKey, sessionMinutes } from '../engine/stats.js';
import { sessionCalories, activityCalories } from '../engine/calories.js';
import { btn, pageHeader, section, segmented, confirmDialog, toast, emptyState, icon, kv } from '../ui/components.js';
import { ENERGY, SESSION_DIFFICULTY, kcalResultText, weightNote } from './common.js';
import { startDraft, newSessionObj, instantiate, saveAsTemplate } from './session.js';

let filter = 'tout';

export function renderHistory(root) {
  root.append(pageHeader('Historique'));
  root.append(segmented({ tout: 'Tout', salle: 'Salle', dehors: 'Hors salle' }, filter, v => { filter = v || 'tout'; draw(); }, { label: 'Filtrer' }));
  const list = h('div', {});
  root.append(list);
  function draw() {
    clear(list);
    const items = [];
    if (filter !== 'dehors') for (const s of doneSessions(S.data.sessions)) items.push({ kind: 'gym', date: s.date, s });
    if (filter !== 'salle') for (const a of S.data.activities) items.push({ kind: 'out', date: a.date, a });
    items.sort((x, y) => y.date.localeCompare(x.date) || (y.s?.createdAt || y.a?.createdAt || '').localeCompare(x.s?.createdAt || x.a?.createdAt || ''));
    if (!items.length) { list.append(emptyState('Rien d’enregistré pour l’instant', 'Tes séances terminées et tes activités apparaîtront ici.', btn('Ajouter une activité', () => { go('#/activite/nouvelle'); }, { iconName: 'plus' }))); return; }
    let cur = null, ul = null;
    for (const it of items) {
      const w = weekStart(it.date);
      if (w !== cur) {
        cur = w;
        list.append(h('h2', { class: 'week-title', text: `Semaine du ${fmtDate(w)} au ${fmtDate(addDays(w, 6))}` }));
        ul = h('ul', { class: 'list' }); list.append(ul);
      }
      if (it.kind === 'gym') {
        const s = it.s;
        const m = sessionMinutes(s);
        ul.append(h('li', {}, h('a', { class: 'list-link', href: `#/historique/s/${s.id}` },
          h('span', { class: 'dot dot-gym', 'aria-hidden': 'true' }),
          h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: s.suggestion?.title || 'Séance en salle' }), h('span', { class: 'fine', text: s.entries.map(e => e.name).slice(0, 4).join(', ') + (s.entries.length > 4 ? '…' : '') })),
          h('span', { class: 'muted right', text: fmtDate(s.date, { weekday: true }) + (s.durationMin ? '\n' + fmtDuration(s.durationMin) : m.min ? '' : '') }))));
      } else {
        const a = it.a;
        ul.append(h('li', {}, h('a', { class: 'list-link', href: `#/activite/${a.id}` },
          h('span', { class: 'dot dot-outdoor', 'aria-hidden': 'true' }),
          h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: a.type === 'autre' ? (a.customLabel || 'Autre activité') : ACTIVITY_TYPES[a.type] }),
            h('span', { class: 'fine', text: [a.durationMin ? fmtDuration(a.durationMin) : 'durée inconnue', a.distanceKm ? fmtNum(a.distanceKm, 1) + ' km' : null, a.intensity ? INTENSITIES[a.intensity].toLowerCase() : null].filter(Boolean).join(', ') })),
          h('span', { class: 'muted right', text: fmtDate(a.date, { weekday: true }) }))));
      }
    }
  }
  draw();
}

export function renderSessionDetail(root, id) {
  const s = S.data.sessions.find(x => x.id === id);
  if (!s) { root.append(pageHeader('Séance introuvable', { back: '#/historique' })); return; }
  root.append(pageHeader(s.suggestion?.title || 'Séance en salle', { back: '#/historique', sub: fmtDate(s.date, { weekday: true, year: true }) }));
  const vol = sessionVolume(s, getEx);
  const wc = workSetCount(s);
  const cal = sessionCalories(s, S.data.measurements);
  const m = sessionMinutes(s);
  root.append(h('div', { class: 'kvs card' },
    kv('Durée', s.durationMin ? `${fmtDuration(s.durationMin)}${s.durationSource === 'mesuree' ? ' (mesurée)' : ''}` : m.min ? `au moins ${fmtDuration(m.min)} (cardio connu)` : 'Inconnue'),
    kv('Séries de travail', `${wc.n}${wc.unknown ? ` + ${wc.unknown} exercice(s) au nombre de séries non précisé` : ''}`),
    kv('Volume', vol.volume !== null ? `${fmtNum(vol.volume, 0)} kg${vol.partial ? ' (partiel)' : ''}` : 'Non calculable'),
    kv('Énergie avant', s.energy ? ENERGY[s.energy] : '—'),
    kv('Difficulté globale', s.difficulty ? SESSION_DIFFICULTY[s.difficulty] : '—'),
    kv('Calories d’activité', kcalResultText(cal))));
  if (cal.kind !== 'saisie' && cal.parts && cal.parts.length) {
    root.append(h('details', { class: 'more' }, h('summary', { text: 'Détail du calcul des calories' }),
      h('ul', { class: 'bullets' }, ...cal.parts.map(pt => h('li', { text: `${pt.label} : ${kcalResultText(pt)}` }))),
      h('p', { class: 'fine', text: weightNote(cal.weight, s.date) + ' Les calories de musculation ne sont estimées que si la durée et la difficulté globale sont renseignées ; elles ne dépendent jamais du tonnage.' })));
  }
  if (s.pain) root.append(h('p', { class: 'flag', text: `Gêne ou douleur notée : ${(s.pain.zones || []).map(z => ZONES[z]).join(', ')}${s.pain.text ? ' — ' + s.pain.text : ''}` }));
  if (s.notes) root.append(h('p', { class: 'note-text', text: s.notes }));

  // Records établis lors de cette séance
  const recs = personalRecords(S.data.sessions, getEx);
  const recKeys = new Set(recs.filter(r => ['load', 'assist', 'time', 'reps'].some(k => r[k] && r[k].date === s.date)).map(r => r.key));
  const firstDates = {};
  for (const x of doneSessions(S.data.sessions)) for (const e of x.entries) { const k = exKey(e); if (!firstDates[k] || x.date < firstDates[k]) firstDates[k] = x.date; }

  root.append(section('Exercices', h('ul', { class: 'detail-list' }, ...s.entries.map(e => {
    if (e.kind === 'cardio') {
      const bits = [e.durationMin ? `${e.durationIsMinimum ? 'au moins ' : ''}${fmtNum(e.durationMin, 1)} min` : 'durée inconnue', e.distanceKm ? fmtNum(e.distanceKm, 2) + ' km' : null, e.speedKmh ? fmtNum(e.speedKmh, 1) + ' km/h' : null, e.inclinePct !== null && e.inclinePct !== undefined ? fmtNum(e.inclinePct, 1) + ' %' : null, e.intensity ? INTENSITIES[e.intensity].toLowerCase() : null].filter(Boolean);
      return h('li', {}, h('p', { class: 'slot-name', text: e.name }), h('p', { class: 'muted', text: bits.join(', ') }), e.notes ? h('p', { class: 'fine', text: e.notes }) : null);
    }
    const ex = getEx(e.exerciseId);
    const isRec = recKeys.has(exKey(e)) && firstDates[exKey(e)] < s.date;
    const warm = (e.sets || []).filter(st => st.type === 'warmup').length;
    return h('li', {},
      h('div', { class: 'row-between' }, h('p', { class: 'slot-name', text: e.name + ([e.variant, e.equipmentNote].filter(Boolean).length ? ` (${[e.variant, e.equipmentNote].filter(Boolean).join(' / ')})` : '') }), isRec ? h('span', { class: 'tag tag-record', text: 'Record' }) : null),
      h('p', { class: 'muted', text: summarizeSets(e, ex, { fmt: fmtNum }) + (warm ? ` + ${warm} série(s) d’échauffement` : '') }),
      e.effort ? h('p', { class: 'fine', text: 'Ressenti : ' + EFFORTS[e.effort].label }) : null,
      e.notes ? h('p', { class: 'fine', text: e.notes }) : null);
  }))));
  if (s.feedback && (s.feedback.fatigue || (s.feedback.liked || []).length || (s.feedback.replace || []).length || s.feedback.actualTime)) {
    const f = s.feedback;
    root.append(section('Retour', h('ul', { class: 'bullets' },
      f.fatigue ? h('li', { text: 'Fatigue générale : ' + f.fatigue }) : null,
      (f.liked || []).length ? h('li', { text: 'Apprécié : ' + f.liked.map(id => getEx(id)?.name || id).join(', ') }) : null,
      (f.replace || []).length ? h('li', { text: 'À remplacer : ' + f.replace.map(id => getEx(id)?.name || id).join(', ') }) : null,
      f.actualTime ? h('li', { text: `Temps réellement disponible : ${f.actualTime} min` }) : null)));
  }
  root.append(h('div', { class: 'row wrap' },
    btn('Modifier', () => { go(`#/seance/edition/${s.id}`); }, { iconName: 'edit' }),
    btn('Dupliquer', () => startDraft(newSessionObj({ entries: s.entries.map(instantiate) })), { iconName: 'copy' }),
    btn('Enregistrer comme modèle', () => saveAsTemplate(s), { iconName: 'download' }),
    btn('Supprimer', async () => {
      if (!await confirmDialog('Supprimer définitivement cette séance ?', { danger: true, confirmLabel: 'Supprimer' })) return;
      await deleteRecord('sessions', s.id); toast('Séance supprimée.'); go('#/historique');
    }, { kind: 'danger', iconName: 'trash' })));
}
