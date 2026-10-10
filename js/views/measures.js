import { h, uid, todayISO, fmtDate } from '../util.js';
import { S, saveRecord, deleteRecord, companionSync } from '../state.js';
import { rewardToast } from './companion.js';
import { btn, iconBtn, field, textInput, numInput, dateInput, selectInput, pageHeader, section, sheet, confirmDialog, toast } from '../ui/components.js';
import { MEASURE_TYPES, MEASURE_SOURCES, measureValue, estimateLabel } from './common.js';
import { rerender } from '../router.js';

export function openMeasure(existing) {
  const m = existing ? { ...existing } : { id: uid(), date: todayISO(), type: 'poids', value: null, approx: false, source: null, note: '' };
  const sh = sheet({ title: existing ? 'Modifier la mesure' : 'Nouvelle mesure', content: h('div', { class: 'form' },
    field('Mesure', selectInput(Object.fromEntries(Object.entries(MEASURE_TYPES).map(([k, v]) => [k, `${v.label} (${v.unit})`])), m.type, { oninput: v => { m.type = v; } })),
    h('div', { class: 'grid-2' },
      field('Date', dateInput(m.date, { max: todayISO(), oninput: v => { m.date = v; } })),
      field('Valeur', numInput(m.value, { oninput: v => { m.value = v; } }))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!m.approx, onchange: (e) => { m.approx = e.target.checked; } }), ' Valeur approximative'),
    field('Source', selectInput(MEASURE_SOURCES, m.source, { emptyLabel: 'Non précisée', oninput: v => { m.source = v; } }), { help: 'Les valeurs de balance ou de montre sont présentées comme des estimations déclarées.' }),
    field('Note', textInput(m.note, { oninput: v => { m.note = v; } }))),
  actions: [
    existing ? btn('Supprimer', async () => { if (await confirmDialog('Supprimer cette mesure ?', { danger: true, confirmLabel: 'Supprimer' })) { await deleteRecord('measurements', m.id); sh.close(); rerender(); } }, { kind: 'danger' }) : null,
    btn('Enregistrer', async () => {
      if (m.value === null || !m.date) { toast('Indique une date et une valeur.', { kind: 'error' }); return; }
      await saveRecord('measurements', m); sh.close(); toast('Mesure enregistrée.'); const res = await companionSync(); rewardToast(res); rerender();
    }, { kind: 'primary' })].filter(Boolean) });
}

export function renderMeasures(root) {
  root.append(pageHeader('Mesures', { back: '#/profil', actions: [btn('Ajouter', () => openMeasure(null), { small: true, iconName: 'plus' })] }));
  const list = S.data.measurements.slice().sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type));
  if (!list.length) { root.append(h('p', { class: 'muted', text: 'Aucune mesure. Le poids sert aussi à estimer les calories d’activité.' })); return; }
  root.append(section(null, h('ul', { class: 'list' }, ...list.map(m => h('li', { class: 'list-row' },
    h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: `${MEASURE_TYPES[m.type]?.label || m.type} : ${measureValue(m)}` }),
      h('span', { class: 'fine', text: [fmtDate(m.date, { year: true }), estimateLabel(m), m.note].filter(Boolean).join(' — ') })),
    iconBtn('edit', 'Modifier', () => openMeasure(m)))))));
}
