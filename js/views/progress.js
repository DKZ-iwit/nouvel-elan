import { h, clear, fmtNum, fmtDate, fmtShort, todayISO, fmtDuration } from '../util.js';
import { go } from '../router.js';
import { S, getEx } from '../state.js';
import { MUSCLES, ACTIVITY_TYPES } from '../data/exercises.js';
import { weeklySeries, exerciseKeys, exerciseSeries, personalRecords, muscleDistribution, periodStart, firstDataDate, doneSessions } from '../engine/stats.js';
import { roundKcal } from '../engine/calories.js';
import { lineChart, barChart, hbars } from '../ui/charts.js';
import { pageHeader, section, segmented, selectInput, emptyState, btn, note } from '../ui/components.js';
import { MEASURE_TYPES, targetLabel, estimateLabel } from './common.js';

let period = '4s';
let selKey = null;

export function renderProgress(root) {
  root.append(pageHeader('Progression'));
  root.append(segmented({ '4s': '4 semaines', '3m': '3 mois', '6m': '6 mois', tout: 'Tout' }, period, v => { period = v || '4s'; draw(); }, { label: 'Période', cls: 'seg-wrap' }));
  const body = h('div', {});
  root.append(body);
  function draw() {
    clear(body);
    const p = S.profile;
    const today = todayISO();
    const first = firstDataDate(S.data.sessions, S.data.activities, S.data.measurements);
    const from = periodStart(period, today, first);
    if (!first) { body.append(emptyState('Pas encore de données', 'Enregistre une séance, une activité ou une mesure pour voir tes graphiques.', btn('Ajouter une mesure', () => { go('#/mesures'); }))); return; }
    const weeks = weeklySeries(p, S.data.sessions, S.data.activities, S.data.measurements, from, today);
    const labels = weeks.map(w => fmtShort(w.week));

    // Régularité
    const reached = p.gymPerWeek ? weeks.filter(w => w.gym >= p.gymPerWeek).length : null;
    const cur = weeks[weeks.length - 1];
    body.append(section('Régularité',
      h('p', { class: 'lead-sm', text: p.gymPerWeek ? `${cur.gym} séance${cur.gym > 1 ? 's' : ''} réalisée${cur.gym > 1 ? 's' : ''} sur les ${p.gymPerWeek} prévues cette semaine.` : `${cur.gym} séance(s) en salle cette semaine.` }),
      reached !== null ? h('p', { class: 'muted', text: `Objectif atteint ${reached} semaine${reached > 1 ? 's' : ''} sur ${weeks.length} sur la période.` }) : null,
      barChart({ labels, title: 'Séances par semaine', series: [{ name: 'Salle', color: 'var(--gym)', values: weeks.map(w => w.gym) }, { name: 'Hors salle', color: 'var(--outdoor)', values: weeks.map(w => w.outdoor) }], target: p.gymPerWeek, targetLabel: 'Séances prévues', yFmt: v => fmtNum(v, 0) })));

    // Minutes actives
    body.append(section('Minutes actives',
      barChart({ labels, stacked: true, unit: ' min', title: 'Minutes par semaine (sans chevauchement)', series: [
        { name: 'Salle', color: 'var(--gym)', values: weeks.map(w => w.gymMin || 0), partial: weeks.map(w => w.minutesPartial) },
        { name: 'Hors salle', color: 'var(--outdoor)', values: weeks.map(w => w.outMin || 0) }],
        target: p.outdoorMinutesTarget || null, targetLabel: 'Objectif hors salle', partialNote: 'Partiel : durées de séance inconnues' }),
      h('p', { class: 'fine', text: 'Une séance sans durée connue ne compte que pour ses segments cardio chronométrés. Quand les heures sont connues, les périodes qui se chevauchent ne sont comptées qu’une fois.' })));

    // Calories
    const otherTotal = weeks.reduce((a, w) => a + (w.kcalOther || 0), 0);
    body.append(section('Calories d’activité',
      barChart({ labels, unit: ' kcal', title: 'Calories actives par semaine (estimées ou saisies)', series: [{ name: 'Calories actives', color: 'var(--kcal)', values: weeks.map(w => w.kcal === null ? null : roundKcal(w.kcal)), partial: weeks.map(w => w.kcalPartial) }] }),
      h('p', { class: 'fine', text: 'Uniquement les activités enregistrées : ce n’est ni la dépense totale de la journée ni un bilan alimentaire. Les valeurs inconnues ne comptent pas pour zéro : la semaine est alors marquée partielle.' }),
      otherTotal ? note(`${fmtNum(roundKcal(otherTotal), 0)} kcal ont été saisies avec une convention « totale » ou inconnue : elles ne sont pas additionnées aux calories actives.`) : null));

    // Activités hors salle par type
    const acts = S.data.activities.filter(a => a.date >= from);
    if (acts.length) {
      const byType = {};
      for (const a of acts) { const k = a.type; byType[k] = byType[k] || { n: 0, min: 0 }; byType[k].n++; byType[k].min += a.durationMin || 0; }
      body.append(section('Activités hors salle',
        hbars(Object.entries(byType).map(([k, v]) => ({ label: ACTIVITY_TYPES[k], value: v.n, valueLabel: `${v.n} fois${v.min ? ', ' + fmtDuration(v.min) : ''}`, color: 'var(--outdoor)' })))));
    }

    // Cardio en salle
    if (weeks.some(w => w.cardioMin)) {
      body.append(section('Cardio en salle', barChart({ labels, unit: ' min', title: 'Durée de cardio par semaine', series: [{ name: 'Cardio en salle', color: 'var(--gym)', values: weeks.map(w => w.cardioMin || null) }] }),
        weeks.some(w => w.cardioDist) ? h('p', { class: 'fine', text: `Distance renseignée sur la période : ${fmtNum(weeks.reduce((a, w) => a + w.cardioDist, 0), 1)} km.` }) : null));
    }

    // Poids et composition
    const meas = S.data.measurements.filter(m => m.date >= from);
    const weights = meas.filter(m => m.type === 'poids');
    const refs = (p.weightTargets || []).map(t => ({ y: t.max ? (t.min + t.max) / 2 : t.value, label: `${t.label ? t.label + ' : ' : ''}${targetLabel(t)}`, color: 'var(--record)' }));
    body.append(section('Poids',
      weights.length ? lineChart({ title: 'Poids enregistré (kg)', unit: ' kg', series: [{ name: 'Poids enregistré', color: 'var(--accent)', points: weights.map(m => ({ x: m.date, y: m.value, approx: m.approx || m.source === 'montre' || m.source === 'balance', note: estimateLabel(m) })) }], refLines: refs }) :
        h('p', { class: 'muted', text: 'Aucun poids sur la période.' }),
      refs.length ? h('p', { class: 'fine', text: 'Les lignes jaunes sont tes paliers visés, distincts des poids enregistrés.' }) : null,
      h('a', { class: 'link', href: '#/mesures', text: 'Ajouter ou modifier une mesure' })));
    const comp = ['masse_grasse_pct', 'masse_musculaire'].filter(t => meas.some(m => m.type === t));
    for (const t of comp) {
      const pts = meas.filter(m => m.type === t);
      body.append(section(MEASURE_TYPES[t].label, lineChart({ title: `${MEASURE_TYPES[t].label} (${MEASURE_TYPES[t].unit})`, unit: ' ' + MEASURE_TYPES[t].unit, series: [{ name: MEASURE_TYPES[t].label, color: 'var(--ink-soft)', dashed: true, points: pts.map(m => ({ x: m.date, y: m.value, approx: true, note: estimateLabel(m) || 'estimation déclarée' })) }] }),
        h('p', { class: 'fine', text: 'Valeurs affichées par une montre ou une balance : ce sont des estimations déclarées, à interpréter comme des tendances.' })));
    }
    const tours = Object.keys(MEASURE_TYPES).filter(t => t.startsWith('tour_') && meas.some(m => m.type === t));
    if (tours.length) {
      const colors = ['var(--accent)', 'var(--outdoor)', 'var(--kcal)', 'var(--alert)', 'var(--ink-soft)'];
      body.append(section('Mensurations', lineChart({ title: 'Mensurations (cm)', unit: ' cm', series: tours.map((t, i) => ({ name: MEASURE_TYPES[t].label, color: colors[i % colors.length], marker: i % 2 ? 'square' : null, points: meas.filter(m => m.type === t).map(m => ({ x: m.date, y: m.value, approx: m.approx })) })) })));
    }

    // Exercice
    const keys = exerciseKeys(S.data.sessions);
    if (keys.length) {
      if (!selKey || !keys.some(k => k.key === selKey)) selKey = keys[0].key;
      const exBlock = h('div', {});
      const drawEx = () => {
        clear(exBlock);
        const k = keys.find(x => x.key === selKey);
        const ex = getEx(k.exerciseId);
        const pts = exerciseSeries(S.data.sessions, k.key, ex).filter(pt => pt.date >= from);
        if (!pts.length) { exBlock.append(h('p', { class: 'muted', text: 'Pas de séance sur la période pour cet exercice.' })); return; }
        if (ex && ex.load === 'assist') {
          exBlock.append(lineChart({ title: 'Assistance (kg) — une assistance plus faible à répétitions comparables est une progression', unit: ' kg', series: [{ name: 'Assistance la plus faible', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.top, note: `${pt.repsAtTop} rép.${pt.setsKnown ? '' : ', séries non précisées'}` })) }] }));
        } else if (pts.some(pt => pt.seconds !== null)) {
          exBlock.append(lineChart({ title: 'Durée tenue (s)', unit: ' s', yMinZero: true, series: [{ name: 'Meilleure série', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.seconds, note: pt.setsKnown ? '' : 'séries non précisées' })) }] }));
        } else if (pts.some(pt => pt.top !== null)) {
          exBlock.append(lineChart({ title: 'Charge la plus lourde en série de travail (kg)', unit: ' kg', series: [{ name: 'Charge maximale', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.top, note: `${pt.repsAtTop} rép.` })) }] }));
          if (pts.some(pt => pt.volume !== null)) exBlock.append(barChart({ labels: pts.map(pt => fmtShort(pt.date)), unit: ' kg', title: 'Volume de la séance (séries × répétitions × charge)', series: [{ name: 'Volume', color: 'var(--gym)', values: pts.map(pt => pt.volume) }] }));
        } else {
          exBlock.append(lineChart({ title: 'Répétitions (meilleure série)', yMinZero: true, series: [{ name: 'Répétitions', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.reps })) }] }));
        }
        exBlock.append(h('p', { class: 'fine', text: 'Séries d’échauffement exclues. Les performances ne sont comparées qu’avec le même exercice et la même variante ou machine.' }));
      };
      body.append(section('Par exercice',
        h('label', { class: 'field' }, h('span', { class: 'label', text: 'Exercice' }), selectInput(Object.fromEntries(keys.map(k => [k.key, k.name + (k.variant ? ` (${k.variant})` : '')])), selKey, { oninput: v => { selKey = v; drawEx(); } })),
        exBlock));
      drawEx();

      // Records
      const recs = personalRecords(S.data.sessions, getEx);
      body.append(section('Records personnels',
        h('p', { class: 'fine', text: 'Charge : la plus lourde sur une série de travail. Assistance : la plus faible sur une série de travail. Durée : la plus longue série. Volume : le plus élevé sur une séance, séries connues uniquement.' }),
        h('ul', { class: 'records' }, ...recs.map(r => {
          const bits = [];
          if (r.load) bits.push(`${fmtNum(r.load.value, 2)} kg × ${r.load.reps} (${fmtDate(r.load.date)})`);
          if (r.assist) bits.push(`assistance ${fmtNum(r.assist.value, 2)} kg × ${r.assist.reps} (${fmtDate(r.assist.date)})`);
          if (r.time) bits.push(`${r.time.value} s (${fmtDate(r.time.date)})`);
          if (r.reps) bits.push(`${r.reps.value} rép. (${fmtDate(r.reps.date)})`);
          if (r.volume) bits.push(`volume ${fmtNum(r.volume.value, 0)} kg (${fmtDate(r.volume.date)})`);
          return h('li', {}, h('span', { class: 'rec-name', text: r.name + (r.variant ? ` (${r.variant})` : '') }), h('span', { class: 'fine', text: bits.join(' ; ') }));
        }))));

      // Répartition musculaire
      const dist = muscleDistribution(S.data.sessions, getEx, from, today);
      const entries = Object.entries(dist.counts).sort((a, b) => b[1] - a[1]);
      body.append(section('Séries de travail par groupe musculaire',
        entries.length ? hbars(entries.map(([m, v]) => ({ label: MUSCLES[m] || m, value: v }))) : h('p', { class: 'muted', text: 'Aucune série sur la période.' }),
        h('p', { class: 'fine', text: 'Chaque série compte 1 pour les muscles principaux de l’exercice et 0,5 pour ses muscles secondaires. Ces nombres ne s’additionnent pas en un total de séries, puisqu’un exercice polyarticulaire apparaît sur plusieurs muscles.' }),
        dist.unknownEntries ? h('p', { class: 'fine', text: `${dist.unknownEntries} exercice(s) au nombre de séries non précisé ne sont pas comptés.` }) : null));
    }
  }
  draw();
}
