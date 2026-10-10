import { h, clear, fmtNum, fmtDate, fmtShort, todayISO, fmtDuration, addDays } from '../util.js';
import { S, getEx } from '../state.js';
import { MUSCLES, ACTIVITY_TYPES } from '../data/exercises.js';
import { weeklySeries, exerciseKeys, exerciseSeries, personalRecords, muscleDistribution, periodStart, firstDataDate, doneSessions, weeklySummary } from '../engine/stats.js';
import { roundKcal } from '../engine/calories.js';
import { lineChart, barChart, hbars } from '../ui/charts.js';
import { pageHeader, segmented, selectInput, emptyState, btn, iconBtn, sheet, note } from '../ui/components.js';
import { MEASURE_TYPES, targetLabel, estimateLabel, latest, nextMilestone, measureValue } from './common.js';
import { openMeasure } from './measures.js';
import { go } from '../router.js';

let period = '4s';
let selKey = null;
let recKind = 'tout';

const TABS = { synthese: 'Synthèse', regularite: 'Régularité', musculation: 'Musculation', cardio: 'Cardio et activités', mesures: 'Mesures', records: 'Records' };

const INFO = {
  regularite: ['Séances en salle terminées par semaine, comparées au nombre que tu t’es fixé dans ton profil.', 'Les activités hors salle sont comptées à part pour ne pas fausser l’objectif de séances.'],
  minutes: ['Minutes de séances et d’activités. Quand les heures sont connues, les périodes qui se chevauchent ne sont comptées qu’une fois.', 'Une séance sans durée connue ne compte que pour ses segments cardio chronométrés : la semaine est alors marquée « partiel » (hachures).'],
  calories: ['Calories actives estimées ou saisies, uniquement pour les activités enregistrées : ce n’est ni la dépense de la journée ni un bilan alimentaire.', 'Une valeur saisie (montre, appareil) remplace l’estimation. Les valeurs inconnues ne comptent pas pour zéro : la semaine est marquée partielle. Les valeurs saisies en convention « totale » ou inconnue sont affichées à part.', 'Méthodes : équations de l’ACSM pour la marche et la course avec vitesse et pente, valeurs MET du Compendium sinon (détails dans le README).'],
  charge: ['Charge la plus lourde sur une série de travail à chaque séance ; pour l’assistance, la plus faible (moins d’assistance = progression).', 'Échauffements exclus. Les comparaisons se font avec le même exercice et la même variante ou machine.'],
  volume: ['Volume = séries de travail × répétitions × charge (× 2 pour une paire d’haltères).', 'Non calculé pour l’assistance, le poids du corps ou lorsque le nombre de séries est inconnu.'],
  muscles: ['Chaque série de travail compte 1 pour les muscles principaux et 0,5 pour les muscles secondaires.', 'Ces nombres ne s’additionnent pas en un total, puisqu’un exercice polyarticulaire apparaît sur plusieurs muscles.'],
  poids: ['Poids enregistrés. Les points creux sont des valeurs approximatives ou issues d’une montre ou d’une balance (estimations déclarées).', 'La ligne pointillée montre le prochain palier que tu as renseigné, distinct des poids enregistrés.'],
  records: ['Charge : la plus lourde sur une série de travail. Répétitions : le plus de répétitions sur une série au poids du corps. Assistance : la plus faible sur une série de travail. Durée : la plus longue série. Volume : le plus élevé sur une séance, séries connues uniquement.', 'Les records sont datés du jour où ils ont été réalisés : ouvrir l’application ou importer un historique ne crée aucun « nouveau » record.'],
};

function info(key, title) {
  return iconBtn('info', `Comprendre cet indicateur : ${title}`, () => sheet({ title: 'Comprendre cet indicateur', content: h('div', { class: 'stack' }, h('p', { class: 'strong', text: title }), ...INFO[key].map(t => h('p', { class: 'muted', text: t }))) }));
}

function metric({ title, value, sub, chart, infoKey, extra }) {
  return h('section', { class: 'metric', 'aria-label': title },
    h('div', { class: 'metric-head' }, h('h2', { class: 'metric-title', text: title }), infoKey ? info(infoKey, title) : null),
    value !== undefined && value !== null ? h('p', { class: 'metric-value', text: value }) : null,
    sub ? h('p', { class: 'metric-sub', text: sub }) : null,
    chart || null, extra || null);
}

function periodSeg(onChange) {
  return segmented({ '4s': '4 sem.', '3m': '3 mois', '6m': '6 mois', tout: 'Tout' }, period, v => { period = v || '4s'; onChange(); }, { label: 'Période', cls: 'seg-wrap' });
}

function recCards(recs, kind) {
  const cards = [];
  for (const r of recs) {
    const name = r.name + (r.variant ? ` (${r.variant})` : '');
    if (r.load && (kind === 'tout' || kind === 'charge')) cards.push({ r, k: 'Charge', perf: `${fmtNum(r.load.value, 2)} kg × ${r.load.reps}`, date: r.load.date, name });
    if (r.reps && (kind === 'tout' || kind === 'reps')) cards.push({ r, k: 'Répétitions', perf: `${r.reps.value} rép.`, date: r.reps.date, name });
    if (r.assist && (kind === 'tout' || kind === 'assist')) cards.push({ r, k: 'Assistance', perf: `${fmtNum(r.assist.value, 2)} kg × ${r.assist.reps}`, date: r.assist.date, name });
    if (r.time && (kind === 'tout' || kind === 'duree')) cards.push({ r, k: 'Durée', perf: `${r.time.value} s`, date: r.time.date, name });
    if (r.volume && kind === 'volume') cards.push({ r, k: 'Volume', perf: `${fmtNum(r.volume.value, 0)} kg`, date: r.volume.date, name });
  }
  return cards.sort((a, b) => b.date.localeCompare(a.date));
}

function recordSheet(r) {
  const rows = [];
  if (r.load) rows.push(['Charge', `${fmtNum(r.load.value, 2)} kg × ${r.load.reps}`, r.load.date]);
  if (r.reps) rows.push(['Répétitions', `${r.reps.value}`, r.reps.date]);
  if (r.assist) rows.push(['Assistance la plus faible', `${fmtNum(r.assist.value, 2)} kg × ${r.assist.reps}`, r.assist.date]);
  if (r.time) rows.push(['Durée', `${r.time.value} s`, r.time.date]);
  if (r.volume) rows.push(['Volume sur une séance', `${fmtNum(r.volume.value, 0)} kg`, r.volume.date]);
  sheet({ title: r.name, content: h('div', { class: 'stack' },
    r.variant ? h('p', { class: 'muted', text: 'Variante ou machine : ' + r.variant }) : h('p', { class: 'fine', text: 'Sans variante ni machine précisée.' }),
    h('div', { class: 'kvs' }, ...rows.map(([l, v, d]) => h('div', { class: 'kv' }, h('span', { class: 'kv-l', text: l }), h('span', { class: 'kv-v', text: `${v} — ${fmtDate(d)}` })))),
    h('p', { class: 'fine', text: INFO.records[0] })) });
}

export function renderProgress(root, params) {
  const tab = params?.get('onglet') || 'synthese';
  root.append(pageHeader('Progrès'));
  root.append(h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Catégories' }, ...Object.entries(TABS).map(([k, l]) => h('button', { type: 'button', role: 'tab', class: 'tab-btn', 'aria-selected': String(k === tab), onclick: () => go(`#/progression?onglet=${k}`) }, l))));
  const body = h('div', { class: 'stack', role: 'tabpanel' });
  root.append(body);
  const p = S.profile;
  const today = todayISO();
  const first = firstDataDate(S.data.sessions, S.data.activities, S.data.measurements);
  if (!first) { body.append(emptyState('Pas encore de données', 'Termine une séance, ajoute une activité ou note une mesure pour voir tes progrès.', btn('Noter une mesure', () => openMeasure(null), { iconName: 'scale' }))); return; }

  const draw = () => {
    clear(body);
    if (tab !== 'synthese' && tab !== 'records') body.append(periodSeg(draw));
    const from = periodStart(period, today, first);
    const weeks = weeklySeries(p, S.data.sessions, S.data.activities, S.data.measurements, from, today);
    const labels = weeks.map(w => fmtShort(w.week));
    const cur = weeks[weeks.length - 1] || { gym: 0 };
    const reached = p.gymPerWeek ? weeks.filter(w => w.gym >= p.gymPerWeek).length : null;

    if (tab === 'synthese') {
      const sum = weeklySummary(p, S.data.sessions, S.data.activities, S.data.measurements, today);
      const w4 = weeklySeries(p, S.data.sessions, S.data.activities, S.data.measurements, addDays(today, -27), today);
      const reached4 = p.gymPerWeek ? w4.filter(w => w.gym >= p.gymPerWeek).length : null;
      const cards = [];
      cards.push(metric({ title: 'Cette semaine', value: p.gymPerWeek ? `${sum.gymDone}/${p.gymPerWeek} séances` : `${sum.gymDone} séance(s)`, sub: reached4 !== null ? `Objectif atteint ${reached4} semaine(s) sur 4` : `${sum.outdoorCount} activité(s) hors salle` }));
      cards.push(metric({ title: 'Minutes actives', value: fmtDuration(sum.minutes.minutes || 0), sub: sum.minutes.partial ? 'Cette semaine, total partiel' : 'Cette semaine' }));
      const w = latest(S.data.measurements, 'poids');
      if ((p.weightTargets || []).length && w) { const ms = nextMilestone(p, w.value); cards.push(metric({ title: 'Poids', value: measureValue(w), sub: ms ? `Prochain palier : ${targetLabel(ms)}` : `Le ${fmtDate(w.date)}` })); }
      // Musculation : constats vérifiables uniquement
      let up = 0, comparable = 0;
      for (const k of exerciseKeys(S.data.sessions)) {
        const ex = getEx(k.exerciseId); if (!ex) continue;
        const pts = exerciseSeries(S.data.sessions, k.key, ex).filter(x => x.date >= addDays(today, -60));
        if (pts.length < 2) continue;
        comparable++;
        const a = pts[0], b = pts[pts.length - 1];
        if ((ex.load === 'assist' ? (b.top !== null && a.top !== null && b.top < a.top) : (b.top !== null && a.top !== null && b.top > a.top)) || (a.top === b.top && b.repsAtTop > a.repsAtTop) || (b.seconds > a.seconds)) up++;
      }
      if (p.goal !== 'endurance') cards.push(metric({ title: 'Musculation (60 jours)', value: comparable ? `${up} exercice(s) en progrès` : '—', sub: comparable ? `sur ${comparable} suivis sur au moins deux séances` : 'Il faut deux séances comparables pour constater un progrès' }));
      if (['endurance', 'perte_poids', 'forme'].includes(p.goal) || sum.outdoorCount) cards.push(metric({ title: 'Hors salle', value: `${sum.outdoorCount} activité(s)`, sub: sum.outdoorTarget ? `${sum.outdoorMin} min sur ${sum.outdoorTarget} visées` : `${sum.outdoorMin} min cette semaine` }));
      body.append(h('div', { class: 'summary-grid' }, ...cards.slice(0, 4)));
      body.append(metric({ title: 'Séances des 4 dernières semaines', infoKey: 'regularite', chart: barChart({ labels: w4.map(x => fmtShort(x.week)), integer: true, series: [{ name: 'Salle', color: 'var(--gym)', values: w4.map(x => x.gym) }, { name: 'Hors salle', color: 'var(--outdoor)', values: w4.map(x => x.outdoor) }], target: p.gymPerWeek, targetLabel: 'Objectif' }) }));
      const recs = recCards(personalRecords(S.data.sessions, getEx), 'tout').slice(0, 2);
      if (recs.length) body.append(h('div', { class: 'row-between' }, h('h2', { class: 'block-title', text: 'Derniers records' }), h('a', { class: 'link fine', href: '#/progression?onglet=records', text: 'Tous' })),
        h('div', { class: 'records-grid' }, ...recs.map(c => h('button', { type: 'button', class: 'rec-card', onclick: () => recordSheet(c.r) }, h('span', { class: 'rec-kind', text: c.k }), h('span', { class: 'rec-name', text: c.name }), h('span', { class: 'rec-perf', text: c.perf }), h('span', { class: 'fine', text: fmtDate(c.date) })))));
      return;
    }

    if (tab === 'regularite') {
      body.append(metric({ title: 'Séances par semaine', infoKey: 'regularite', value: p.gymPerWeek ? `${cur.gym} sur ${p.gymPerWeek} cette semaine` : `${cur.gym} cette semaine`, sub: reached !== null ? `Objectif atteint ${reached} semaine(s) sur ${weeks.length}` : null,
        chart: barChart({ labels, integer: true, series: [{ name: 'Salle', color: 'var(--gym)', values: weeks.map(w => w.gym) }, { name: 'Hors salle', color: 'var(--outdoor)', values: weeks.map(w => w.outdoor) }], target: p.gymPerWeek, targetLabel: 'Objectif' }) }));
      const totalMin = weeks.reduce((a, w) => a + (w.gymMin || 0) + (w.outMin || 0), 0);
      body.append(metric({ title: 'Minutes actives', infoKey: 'minutes', value: `${fmtDuration(totalMin)} sur la période`, sub: weeks.some(w => w.minutesPartial) ? 'Certaines semaines sont partielles' : null,
        chart: barChart({ labels, stacked: true, unit: ' min', series: [{ name: 'Salle', color: 'var(--gym)', values: weeks.map(w => w.gymMin || 0), partial: weeks.map(w => w.minutesPartial) }, { name: 'Hors salle', color: 'var(--outdoor)', values: weeks.map(w => w.outMin || 0) }], target: p.outdoorMinutesTarget || null, targetLabel: 'Objectif hors salle', partialNote: 'Partiel : durée inconnue' }) }));
      return;
    }

    if (tab === 'musculation') {
      const keys = exerciseKeys(S.data.sessions);
      if (!keys.length) { body.append(emptyState('Aucune série enregistrée', 'Termine une séance pour suivre tes charges.')); return; }
      if (!selKey || !keys.some(k => k.key === selKey)) selKey = keys[0].key;
      const exBox = h('div', { class: 'stack' });
      const drawEx = () => {
        clear(exBox);
        const k = keys.find(x => x.key === selKey);
        const ex = getEx(k.exerciseId);
        const pts = exerciseSeries(S.data.sessions, k.key, ex).filter(pt => pt.date >= from);
        if (!pts.length) { exBox.append(h('p', { class: 'muted', text: 'Pas de séance sur la période pour cet exercice.' })); return; }
        const last = pts[pts.length - 1], firstPt = pts[0];
        const trend = pts.length < 3 ? `${pts.length} séance(s) sur la période : trop peu pour parler de tendance.` : null;
        if (ex && ex.load === 'assist') {
          const diff = last.top !== null && firstPt.top !== null ? firstPt.top - last.top : null;
          exBox.append(metric({ title: 'Assistance', infoKey: 'charge', value: `${fmtNum(last.top, 2)} kg × ${last.repsAtTop}`, sub: trend || (diff > 0 ? `${fmtNum(diff, 2)} kg d’assistance en moins depuis le ${fmtDate(firstPt.date)}` : diff < 0 ? `Assistance plus élevée qu’au ${fmtDate(firstPt.date)}` : `Stable depuis le ${fmtDate(firstPt.date)}`),
            chart: lineChart({ unit: ' kg', series: [{ name: 'Assistance', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.top, note: `${pt.repsAtTop} rép.${pt.setsKnown ? '' : ', séries non précisées'}` })) }] }) }));
        } else if (pts.some(pt => pt.seconds !== null)) {
          exBox.append(metric({ title: 'Durée tenue', infoKey: 'charge', value: `${last.seconds} s`, sub: trend || (last.seconds > firstPt.seconds ? `+${last.seconds - firstPt.seconds} s depuis le ${fmtDate(firstPt.date)}` : `Depuis le ${fmtDate(firstPt.date)}`),
            chart: lineChart({ unit: ' s', yMinZero: true, series: [{ name: 'Meilleure série', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.seconds, note: pt.setsKnown ? '' : 'séries non précisées' })) }] }) }));
        } else if (pts.some(pt => pt.top !== null)) {
          const diff = last.top - firstPt.top;
          exBox.append(metric({ title: 'Charge maximale', infoKey: 'charge', value: `${fmtNum(last.top, 2)} kg × ${last.repsAtTop}`, sub: trend || (diff > 0 ? `+${fmtNum(diff, 2)} kg depuis le ${fmtDate(firstPt.date)}` : diff < 0 ? `En dessous du ${fmtDate(firstPt.date)} (${fmtNum(firstPt.top, 2)} kg)` : `Stable depuis le ${fmtDate(firstPt.date)}`),
            chart: lineChart({ unit: ' kg', series: [{ name: 'Charge maximale', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.top, note: `${pt.repsAtTop} rép.` })) }] }) }));
          if (pts.some(pt => pt.volume !== null)) exBox.append(metric({ title: 'Volume par séance', infoKey: 'volume', chart: barChart({ labels: pts.map(pt => fmtShort(pt.date)), unit: ' kg', series: [{ name: 'Volume', color: 'var(--gym)', values: pts.map(pt => pt.volume) }] }) }));
        } else {
          exBox.append(metric({ title: 'Répétitions', value: `${last.reps} rép.`, sub: trend, chart: lineChart({ yMinZero: true, series: [{ name: 'Répétitions', color: 'var(--accent)', points: pts.map(pt => ({ x: pt.date, y: pt.reps })) }] }) }));
        }
      };
      body.append(h('label', { class: 'field' }, h('span', { class: 'label', text: 'Exercice' }), selectInput(Object.fromEntries(keys.map(k => [k.key, k.name + (k.variant ? ` (${k.variant})` : '')])), selKey, { oninput: v => { selKey = v; drawEx(); } })), exBox);
      drawEx();
      const dist = muscleDistribution(S.data.sessions, getEx, from, today);
      const entries = Object.entries(dist.counts).sort((a, b) => b[1] - a[1]);
      body.append(metric({ title: 'Séries par groupe musculaire', infoKey: 'muscles', sub: dist.unknownEntries ? `${dist.unknownEntries} exercice(s) au nombre de séries non précisé non comptés` : null,
        chart: entries.length ? hbars(entries.slice(0, 10).map(([m, v]) => ({ label: MUSCLES[m] || m, value: v }))) : h('p', { class: 'muted', text: 'Aucune série sur la période.' }) }));
      return;
    }

    if (tab === 'cardio') {
      const known = weeks.filter(w => w.kcal !== null);
      const otherTotal = weeks.reduce((a, w) => a + (w.kcalOther || 0), 0);
      body.append(metric({ title: 'Calories d’activité', infoKey: 'calories', value: known.length ? `≈ ${fmtNum(roundKcal(known.reduce((a, w) => a + w.kcal, 0)), 0)} kcal` : 'Inconnues', sub: weeks.some(w => w.kcalPartial) ? 'Total partiel : certaines activités n’ont pas de valeur' : 'Sur la période',
        chart: barChart({ labels, unit: ' kcal', series: [{ name: 'Calories actives', color: 'var(--kcal)', values: weeks.map(w => w.kcal === null ? null : roundKcal(w.kcal)), partial: weeks.map(w => w.kcalPartial) }] }),
        extra: otherTotal ? note(`${fmtNum(roundKcal(otherTotal), 0)} kcal saisies dans une autre convention, non additionnées.`) : null }));
      const acts = S.data.activities.filter(a => a.date >= from);
      if (acts.length) {
        const byType = {};
        for (const a of acts) { byType[a.type] = byType[a.type] || { n: 0, min: 0 }; byType[a.type].n++; byType[a.type].min += a.durationMin || 0; }
        body.append(metric({ title: 'Activités hors salle', value: `${acts.length} activité(s)`, sub: `${fmtDuration(acts.reduce((x, a) => x + (a.durationMin || 0), 0))} au total`, chart: hbars(Object.entries(byType).map(([k, v]) => ({ label: ACTIVITY_TYPES[k], value: v.n, valueLabel: `${v.n} fois${v.min ? ', ' + fmtDuration(v.min) : ''}`, color: 'var(--outdoor)' }))) }));
      } else body.append(note('Aucune activité hors salle sur la période.'));
      if (weeks.some(w => w.cardioMin)) body.append(metric({ title: 'Cardio en salle', value: fmtDuration(weeks.reduce((a, w) => a + w.cardioMin, 0)), sub: weeks.some(w => w.cardioDist) ? `${fmtNum(weeks.reduce((a, w) => a + w.cardioDist, 0), 1)} km renseignés` : null,
        chart: barChart({ labels, unit: ' min', series: [{ name: 'Cardio en salle', color: 'var(--gym)', values: weeks.map(w => w.cardioMin || null) }] }) }));
      return;
    }

    if (tab === 'mesures') {
      const meas = S.data.measurements.filter(m => m.date >= from);
      const weights = meas.filter(m => m.type === 'poids');
      const all = S.data.measurements.filter(m => m.type === 'poids');
      const lastW = latest(S.data.measurements, 'poids');
      const ms = lastW ? nextMilestone(p, lastW.value) : null;
      const refs = ms ? [{ y: ms.max ? (ms.min + ms.max) / 2 : ms.value, label: `Palier ${targetLabel(ms)}`, color: 'var(--coral)' }] : [];
      body.append(metric({ title: 'Poids', infoKey: 'poids', value: lastW ? measureValue(lastW) : 'Aucun poids', sub: lastW ? `Le ${fmtDate(lastW.date)}${ms ? ` · prochain palier ${targetLabel(ms)}` : ''}` : null,
        chart: weights.length ? lineChart({ unit: ' kg', series: [{ name: 'Poids enregistré', color: 'var(--accent)', points: weights.map(m => ({ x: m.date, y: m.value, approx: m.approx || m.source === 'montre' || m.source === 'balance', note: estimateLabel(m) })) }], refLines: refs }) : (all.length ? h('p', { class: 'muted', text: 'Aucun poids sur cette période.' }) : null),
        extra: (p.weightTargets || []).length > 1 ? h('details', { class: 'more' }, h('summary', { text: 'Tous mes paliers' }), h('ul', { class: 'bullets fine' }, ...p.weightTargets.map(t => h('li', { text: `${t.label ? t.label + ' : ' : ''}${targetLabel(t)}` })))) : null }));
      for (const t of ['masse_grasse_pct', 'masse_musculaire']) {
        const pts = meas.filter(m => m.type === t);
        if (!pts.length) continue;
        const l = pts[pts.length - 1];
        body.append(metric({ title: MEASURE_TYPES[t].label, value: measureValue(l), sub: `${estimateLabel(l) || 'valeur déclarée'}, le ${fmtDate(l.date)}`,
          chart: pts.length > 1 ? lineChart({ unit: ' ' + MEASURE_TYPES[t].unit, series: [{ name: MEASURE_TYPES[t].label, color: 'var(--ink-soft)', dashed: true, points: pts.map(m => ({ x: m.date, y: m.value, approx: true, note: estimateLabel(m) || 'estimation déclarée' })) }] }) : null }));
      }
      const tours = Object.keys(MEASURE_TYPES).filter(t => t.startsWith('tour_') && meas.some(m => m.type === t));
      if (tours.length) {
        const colors = ['var(--accent)', 'var(--coral)', 'var(--gold)', 'var(--ink-soft)', 'var(--outdoor)'];
        body.append(metric({ title: 'Mensurations', chart: lineChart({ unit: ' cm', series: tours.map((t, i) => ({ name: MEASURE_TYPES[t].label, color: colors[i % colors.length], marker: i % 2 ? 'square' : null, points: meas.filter(m => m.type === t).map(m => ({ x: m.date, y: m.value, approx: m.approx })) })) }) }));
      }
      body.append(h('div', { class: 'row' }, btn('Noter une mesure', () => openMeasure(null), { iconName: 'scale', kind: 'primary' }), btn('Toutes les mesures', () => go('#/mesures'))));
      return;
    }

    if (tab === 'records') {
      const recs = personalRecords(S.data.sessions, getEx);
      body.append(h('div', { class: 'row-between' }, segmented({ tout: 'Tout', charge: 'Charge', reps: 'Répétitions', assist: 'Assistance', duree: 'Durée', volume: 'Volume' }, recKind, v => { recKind = v || 'tout'; draw(); }, { label: 'Type de record', cls: 'seg-wrap grow' }), info('records', 'Records')));
      const cards = recCards(recs, recKind);
      if (!cards.length) { body.append(emptyState('Aucun record de ce type', 'Ils apparaîtront au fil des séances.')); return; }
      body.append(h('div', { class: 'records-grid' }, ...cards.map(c => h('button', { type: 'button', class: 'rec-card', onclick: () => recordSheet(c.r) }, h('span', { class: 'rec-kind', text: c.k }), h('span', { class: 'rec-name', text: c.name }), h('span', { class: 'rec-perf', text: c.perf }), h('span', { class: 'fine', text: fmtDate(c.date) })))));
    }
  };
  draw();
}
