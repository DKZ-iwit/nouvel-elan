import { h, s, fmtNum, fmtDate, todayISO, addDays, daysBetween, fmtDuration } from '../util.js';
import { go } from '../router.js';
import { S, getEx, allExercises, draftSession } from '../state.js';
import { weeklySummary, exerciseKeys, exerciseSeries, doneSessions } from '../engine/stats.js';
import { suggestSession } from '../engine/suggest.js';
import { missingForProgram } from '../engine/program.js';
import { ACTIVITY_TYPES } from '../data/exercises.js';
import { btn, icon, note, section } from '../ui/components.js';
import { kcalAggText, kcalAggNotes, latest, nextMilestone, targetLabel, profileChip, measureValue } from './common.js';
import { openProfileSwitcher } from './profiles.js';
import { completeProgramCard } from './program.js';

// Barre de la semaine : un disque par séance (bleu) ou activité (vert) ; emplacements vides = séances prévues restantes.
function weekBar(sum) {
  const W = 340, H = 120, cy = 60;
  const items = sum.items;
  const remaining = Math.max(0, (sum.gymTarget || 0) - sum.gymDone);
  const plates = [...items.map(i => ({ kind: i.kind })), ...Array.from({ length: remaining }, () => ({ kind: 'empty' }))];
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'weekbar', role: 'img',
    'aria-label': `Semaine : ${sum.gymDone} séance(s) en salle${sum.gymTarget ? ' sur ' + sum.gymTarget + ' prévue(s)' : ''}, ${sum.outdoorCount} activité(s) hors salle.` });
  svg.append(s('rect', { x: 8, y: cy - 3, width: W - 16, height: 6, rx: 3, class: 'wb-bar' }));
  svg.append(s('rect', { x: W / 2 - 46, y: cy - 6, width: 92, height: 12, rx: 3, class: 'wb-grip' }));
  // collier intérieur
  svg.append(s('rect', { x: W / 2 - 60, y: cy - 14, width: 10, height: 28, rx: 2, class: 'wb-collar' }));
  svg.append(s('rect', { x: W / 2 + 50, y: cy - 14, width: 10, height: 28, rx: 2, class: 'wb-collar' }));
  const maxPlates = 7;
  const shown = plates.slice(0, maxPlates);
  let offset = 64;
  shown.forEach((p, i) => {
    const big = p.kind === 'gym' || p.kind === 'empty';
    const ph = big ? 96 : 70, pw = big ? 13 : 10;
    for (const side of [-1, 1]) {
      const x = side < 0 ? W / 2 - offset - pw : W / 2 + offset;
      svg.append(s('rect', { x, y: cy - ph / 2, width: pw, height: ph, rx: 3, class: `wb-plate wb-${p.kind}`, style: { animationDelay: `${i * 70}ms` } }));
    }
    offset += pw + 3;
  });
  if (plates.length > maxPlates) svg.append(s('text', { x: W - 10, y: 16, 'text-anchor': 'end', class: 'axis', text: `+${plates.length - maxPlates}` }));
  return svg;
}

function progressFacts(sessions) {
  const facts = [];
  const since = addDays(todayISO(), -60);
  for (const k of exerciseKeys(sessions)) {
    const ex = getEx(k.exerciseId); if (!ex) continue;
    const pts = exerciseSeries(sessions, k.key, ex).filter(p => p.date >= since);
    if (pts.length < 2) continue;
    const a = pts[0], b = pts[pts.length - 1];
    const name = k.name + (k.variant ? ` (${k.variant})` : '');
    const span = `${fmtDate(a.date)} → ${fmtDate(b.date)}`;
    if (ex.load === 'assist' && a.top !== null && b.top !== null && b.top < a.top && b.repsAtTop >= a.repsAtTop) facts.push({ name, text: `assistance ${fmtNum(a.top, 2)} → ${fmtNum(b.top, 2)} kg`, span });
    else if (ex.load !== 'assist' && a.top !== null && b.top !== null && b.top > a.top) facts.push({ name, text: `${fmtNum(a.top, 2)} → ${fmtNum(b.top, 2)} kg`, span });
    else if (a.top !== null && a.top === b.top && b.repsAtTop > a.repsAtTop) facts.push({ name, text: `${a.repsAtTop} → ${b.repsAtTop} répétitions à ${fmtNum(b.top, 2)} kg`, span });
    else if (a.seconds !== null && b.seconds !== null && b.seconds > a.seconds) facts.push({ name, text: `${a.seconds} → ${b.seconds} s`, span });
  }
  return facts.slice(0, 5);
}

export function renderHome(root) {
  const p = S.profile;
  const today = todayISO();
  const sum = weeklySummary(p, S.data.sessions, S.data.activities, S.data.measurements, today);
  const draft = draftSession();

  root.append(h('header', { class: 'home-head' },
    h('div', {}, h('p', { class: 'muted', text: fmtDate(today, { weekday: true }) }), h('h1', { text: `Bonjour ${p.name}` })),
    profileChip(p, () => openProfileSwitcher())));

  // 1. Où en suis-je ?
  const gymLine = sum.gymTarget ? `${sum.gymDone} séance${sum.gymDone > 1 ? 's' : ''} sur ${sum.gymTarget} prévue${sum.gymTarget > 1 ? 's' : ''}` : `${sum.gymDone} séance${sum.gymDone > 1 ? 's' : ''} en salle`;
  const outLine = `${sum.outdoorCount} activité${sum.outdoorCount > 1 ? 's' : ''} hors salle`;
  const w = latest(S.data.measurements, 'poids');
  const ms = w ? nextMilestone(p, w.value) : null;
  root.append(h('section', { class: 'hero' },
    h('h2', { class: 'sr-only', text: 'Cette semaine' }),
    weekBar(sum),
    h('p', { class: 'hero-line' }, h('strong', { text: gymLine }), h('span', { text: ', ' + outLine })),
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-v', text: sum.minutes.minutes ? fmtDuration(sum.minutes.minutes) : '0 min' }), h('span', { class: 'stat-l', text: sum.minutes.partial ? 'actives (partiel)' : 'actives' })),
      h('div', { class: 'stat' }, h('span', { class: 'stat-v kcal', text: sum.calories.count ? kcalAggText(sum.calories) : '—' }), h('span', { class: 'stat-l', text: !sum.calories.count ? 'calories d’activité (rien d’enregistré)' : sum.calories.unknownCount ? 'calories d’activité (partiel)' : 'calories d’activité' })),
      w ? h('div', { class: 'stat' }, h('span', { class: 'stat-v', text: measureValue(w) }), h('span', { class: 'stat-l', text: `le ${fmtDate(w.date)}${ms ? ', palier ' + targetLabel(ms) : ''}` })) : null),
    sum.calories.count && kcalAggNotes(sum.calories).length ? h('p', { class: 'fine', text: kcalAggNotes(sum.calories).join(' ') }) : null,
    sum.outdoorTarget ? h('p', { class: 'fine', text: `Hors salle : ${sum.outdoorMin} min sur ${sum.outdoorTarget} min visées cette semaine.` }) : null,
  ));

  // 2. Aujourd'hui
  const todayBlock = section('Aujourd’hui');
  if (draft) {
    todayBlock.append(h('div', { class: 'card card-accent' },
      h('p', { class: 'card-title', text: 'Séance en cours' }),
      h('p', { class: 'muted', text: `${draft.suggestion ? draft.suggestion.title + ', ' : ''}${draft.entries.length} exercice(s), commencée ${draft.date === today ? 'aujourd’hui' : 'le ' + fmtDate(draft.date)}.` }),
      btn('Reprendre la séance', () => { go('#/seance'); }, { kind: 'primary', iconName: 'seance' })));
  } else if (missingForProgram(p).length) {
    todayBlock.append(completeProgramCard(p));
    todayBlock.append(btn('Commencer une séance libre', () => { go('#/seance'); }, { iconName: 'plus' }));
  } else {
    const sg = suggestSession({ profile: p, program: p.program, sessions: S.data.sessions, activities: S.data.activities, today, options: { minutes: p.durationMin }, library: allExercises(), getEx });
    if (sg.needsProgram) {
      todayBlock.append(note('Ton programme doit être recalculé. Ouvre « Mon programme ».', 'warning'));
    } else {
      const doneToday = doneSessions(S.data.sessions).some(x => x.date === today);
      todayBlock.append(h('div', { class: 'card card-accent' },
        h('p', { class: 'card-title', text: doneToday ? 'Séance déjà faite aujourd’hui' : sg.title }),
        h('p', { class: 'muted', text: doneToday ? `Prochaine séance proposée : ${sg.title}, environ ${sg.estMinutes} min.` : `Environ ${sg.estMinutes} min, ${sg.items.length} exercices${sg.cardio ? ' et ' + sg.cardio.minutes + ' min de cardio' : ''}.` }),
        h('ul', { class: 'mini-list' }, ...sg.items.slice(0, 4).map(it => h('li', {}, h('span', { text: it.name }), h('span', { class: 'muted', text: it.advice.load ? `${fmtNum(it.advice.load, 2)} kg` : it.advice.kind === 'start' ? 'à déterminer' : '' })))),
        h('p', { class: 'fine', text: sg.reasons[0] }),
        h('div', { class: 'row' },
          btn('Préparer la séance', () => { go('#/seance/preparer'); }, { kind: 'primary', iconName: 'seance' }),
          btn('Séance libre', () => { go('#/seance'); }))));
    }
  }
  root.append(todayBlock);

  // 3. Progrès
  const facts = progressFacts(S.data.sessions);
  const prog = section('Sur quoi j’ai progressé');
  if (facts.length) {
    prog.append(h('ul', { class: 'facts' }, ...facts.map(f => h('li', {}, h('span', { class: 'fact-name', text: f.name }), h('span', { class: 'fact-val', text: f.text }), h('span', { class: 'fine', text: f.span })))));
  } else {
    prog.append(h('p', { class: 'muted', text: doneSessions(S.data.sessions).length < 2 ? 'Les progrès apparaîtront ici dès que deux séances comparables seront enregistrées.' : 'Pas de hausse de charge, de répétitions ou de durée sur les 60 derniers jours pour l’instant.' }));
  }
  prog.append(h('a', { class: 'link', href: '#/progression', text: 'Voir la progression détaillée' }));
  root.append(prog);

  // Activités récentes
  const acts = S.data.activities.filter(a => daysBetween(a.date, today) <= 6 && a.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  if (acts.length) {
    root.append(section('Activités récentes', h('ul', { class: 'list' }, ...acts.slice(0, 3).map(a => h('li', {}, h('a', { href: `#/activite/${a.id}`, class: 'list-link' },
      h('span', { class: 'dot dot-outdoor', 'aria-hidden': 'true' }),
      h('span', { class: 'grow', text: a.type === 'autre' ? (a.customLabel || 'Autre activité') : ACTIVITY_TYPES[a.type] }),
      h('span', { class: 'muted', text: `${a.durationMin ? fmtDuration(a.durationMin) + ', ' : ''}${fmtDate(a.date)}` })))))));
  }

  // Rappel de sauvegarde discret
  const nData = S.data.sessions.length + S.data.activities.length + S.data.measurements.length;
  const days = S.lastExport ? daysBetween(S.lastExport.slice(0, 10), today) : null;
  if (nData >= 3 && (days === null || days >= (S.settings.backupReminderDays || 14))) {
    root.append(h('p', { class: 'backup-hint' }, icon('download', { size: 16 }),
      h('span', { text: days === null ? 'Aucune sauvegarde exportée pour l’instant. ' : `Dernière sauvegarde il y a ${days} jours. ` }),
      h('a', { href: '#/reglages', text: 'Exporter mes données' })));
  }
}
