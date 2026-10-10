import { h, uid, todayISO, fmtDate, fmtNum } from '../util.js';
import { go } from '../router.js';
import { S, saveRecord, deleteRecord, companionSync } from '../state.js';
import { rewardToast } from './companion.js';
import { ACTIVITY_TYPES, INTENSITIES } from '../data/exercises.js';
import { activityCalories, weightAt } from '../engine/calories.js';
import { doneSessions } from '../engine/stats.js';
import { btn, field, textInput, textArea, numInput, dateInput, selectInput, segmented, pageHeader, section, note, confirmDialog, toast } from '../ui/components.js';
import { KCAL_CONVENTIONS, KCAL_SOURCES, ASSIST_LEVELS, kcalResultText, weightNote } from './common.js';

const SESSION_CARDIO_MATCH = { marche: ['marche', 'marche_tapis', 'tapis_incline'], course: ['course'], velo: ['velo'], velo_electrique: ['velo'] };

export function renderActivity(root, id) {
  const existing = id && id !== 'nouvelle' ? S.data.activities.find(a => a.id === id) : null;
  if (id && id !== 'nouvelle' && !existing) { root.append(pageHeader('Activité introuvable', { back: '#/historique' })); return; }
  const a = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: uid(), date: todayISO(), startTime: null, type: null, customLabel: '', durationMin: null, distanceKm: null, elevationM: null,
    intensity: null, assistLevel: null, calories: null, notes: '',
  };
  const cal = a.calories || { value: null, convention: 'inconnue', source: 'montre' };
  root.append(pageHeader(existing ? 'Activité' : 'Ajouter une activité', { back: existing ? '#/historique' : '#/accueil', sub: existing ? null : 'Marche, vélo, natation… en dehors de la salle.' }));

  const kcalOut = h('p', { class: 'kcal-line' });
  const dupWarn = h('div', {});
  const assistWrap = h('div', { class: 'field', hidden: a.type !== 'velo_electrique' },
    h('span', { class: 'label', text: 'Niveau d’assistance (facultatif)' }), segmented(ASSIST_LEVELS, a.assistLevel, v => { a.assistLevel = v; refresh(); }, { allowNone: true }));
  const customWrap = field('Nom de l’activité', textInput(a.customLabel, { placeholder: 'ex. tennis, danse', oninput: v => { a.customLabel = v; } }));
  customWrap.hidden = a.type !== 'autre';

  function refresh() {
    const r = activityCalories({ ...a, calories: cal.value ? cal : null }, S.data.measurements);
    const w = weightAt(S.data.measurements, a.date);
    kcalOut.textContent = (r.kind === 'saisie' ? 'Calories renseignées : ' : 'Calories estimées automatiquement : ') + kcalResultText(r) + (r.kind === 'estimation' ? ' ' + weightNote(w, a.date) : '');
    // Double comptage : un segment cardio de séance le même jour
    dupWarn.replaceChildren();
    const types = SESSION_CARDIO_MATCH[a.type] || [];
    const same = doneSessions(S.data.sessions).filter(s => s.date === a.date && (s.entries || []).some(e => e.kind === 'cardio' && types.includes(e.cardioType)));
    if (same.length && !existing) dupWarn.append(note('Une séance du même jour contient déjà ce type de cardio. Si c’est la même activité, ne l’ajoute pas ici : elle serait comptée deux fois.', 'warning'));
  }

  root.append(h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    if (!a.type) { toast('Choisis le type d’activité.', { kind: 'error' }); return; }
    if (!a.date) { toast('Indique la date.', { kind: 'error' }); return; }
    a.calories = cal.value ? { ...cal } : null;
    await saveRecord('activities', a);
    toast(existing ? 'Activité modifiée.' : 'Activité ajoutée.');
    const res = await companionSync({ silent: !!existing });
    rewardToast(res);
    location.hash = existing ? '#/historique' : '#/accueil';
  } },
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Type' }), segmented(ACTIVITY_TYPES, a.type, v => { a.type = v; assistWrap.hidden = v !== 'velo_electrique'; customWrap.hidden = v !== 'autre'; refresh(); }, { cls: 'seg-wrap', label: 'Type d’activité' })),
    customWrap,
    h('div', { class: 'grid-2' },
      field('Date', dateInput(a.date, { max: todayISO(), oninput: v => { a.date = v; refresh(); } })),
      field('Heure de début', h('input', { type: 'time', value: a.startTime || '', oninput: (e) => { a.startTime = e.target.value || null; } }), { help: 'Facultatif, évite les chevauchements de durée' })),
    h('div', { class: 'grid-3' },
      field('Durée (min)', numInput(a.durationMin, { decimals: 0, oninput: v => { a.durationMin = v; refresh(); } })),
      field('Distance (km)', numInput(a.distanceKm, { oninput: v => { a.distanceKm = v; refresh(); } })),
      field('Dénivelé (m)', numInput(a.elevationM, { decimals: 0, oninput: v => { a.elevationM = v; } }))),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Intensité ressentie' }), segmented(INTENSITIES, a.intensity, v => { a.intensity = v; refresh(); }, { allowNone: true }),
      h('p', { class: 'help', text: 'Légère : on parle facilement. Modérée : on parle en phrases courtes. Soutenue : parler devient difficile.' })),
    assistWrap,
    section('Calories',
      kcalOut,
      h('p', { class: 'help', text: 'L’estimation se calcule avec la durée, l’intensité et le dernier poids enregistré à cette date. Renseigne ces éléments pour voir le résultat.' }),
      h('details', { class: 'more', open: cal.value !== null && cal.value !== undefined },
      h('summary', { text: 'Utiliser les calories de ma montre (facultatif)' }),
      h('p', { class: 'fine', text: 'Si ta montre ou ton appareil indique une valeur, elle remplace l’estimation de l’application (les deux ne s’additionnent jamais).' }),
      h('div', { class: 'grid-3' },
        field('Valeur (kcal)', numInput(cal.value, { decimals: 0, oninput: v => { cal.value = v; refresh(); } })),
        field('Convention', selectInput(KCAL_CONVENTIONS, cal.convention, { oninput: v => { cal.convention = v; refresh(); } })),
        field('Source', selectInput(KCAL_SOURCES, cal.source, { oninput: v => { cal.source = v; } }))),
      )),
    field('Notes', textArea(a.notes, { rows: 2, oninput: v => { a.notes = v; } })),
    dupWarn,
    h('div', { class: 'form-actions' },
      existing ? btn('Dupliquer', async () => {
        const c = { ...JSON.parse(JSON.stringify(existing)), id: uid(), date: todayISO(), createdAt: null, updatedAt: null };
        await saveRecord('activities', c); toast('Activité dupliquée à la date du jour.'); rewardToast(await companionSync()); go(`#/activite/${c.id}`);
      }, { iconName: 'copy' }) : null,
      existing ? btn('Supprimer', async () => {
        if (!await confirmDialog('Supprimer cette activité ?', { danger: true, confirmLabel: 'Supprimer' })) return;
        await deleteRecord('activities', a.id); toast('Activité supprimée.'); go('#/historique');
      }, { kind: 'danger', iconName: 'trash' }) : null,
      h('button', { type: 'submit', class: 'btn btn-primary', text: existing ? 'Enregistrer' : 'Ajouter l’activité' }))));
  refresh();
}
