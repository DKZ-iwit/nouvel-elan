import { h, fmtNum, fmtDate, todayISO, addDays, daysBetween, fmtDuration } from '../util.js';
import { S, getEx, allExercises, draftSession, companionProgress } from '../state.js';
import { weeklySummary, exerciseKeys, exerciseSeries, doneSessions } from '../engine/stats.js';
import { suggestSession } from '../engine/suggest.js';
import { missingForProgram } from '../engine/program.js';
import { btn, icon } from '../ui/components.js';
import { kcalAggText, latest, nextMilestone, targetLabel, measureValue } from './common.js';
import { openProfileSwitcher } from './profiles.js';
import { completeProgramCard } from './program.js';
import { companionCard, adoptInvite, shouldInvite } from './companion.js';
import { renderCompanion } from '../companion/view.js';
import { openQuickStart } from './session.js';
import { openMeasure } from './measures.js';
import { go } from '../router.js';

function progressFacts(sessions) {
  const facts = [];
  const since = addDays(todayISO(), -60);
  for (const k of exerciseKeys(sessions)) {
    const ex = getEx(k.exerciseId); if (!ex) continue;
    const pts = exerciseSeries(sessions, k.key, ex).filter(p => p.date >= since);
    if (pts.length < 2) continue;
    const a = pts[0], b = pts[pts.length - 1];
    if (ex.load === 'assist' && a.top !== null && b.top !== null && b.top < a.top && b.repsAtTop >= a.repsAtTop) facts.push(`${k.name} : assistance ${fmtNum(a.top, 2)} → ${fmtNum(b.top, 2)} kg`);
    else if (ex.load !== 'assist' && a.top !== null && b.top !== null && b.top > a.top) facts.push(`${k.name} : ${fmtNum(a.top, 2)} → ${fmtNum(b.top, 2)} kg`);
    else if (a.top !== null && a.top === b.top && b.repsAtTop > a.repsAtTop) facts.push(`${k.name} : ${a.repsAtTop} → ${b.repsAtTop} rép. à ${fmtNum(b.top, 2)} kg`);
    else if (a.seconds !== null && b.seconds !== null && b.seconds > a.seconds) facts.push(`${k.name} : ${a.seconds} → ${b.seconds} s`);
  }
  return facts.slice(0, 2);
}

export function renderHome(root) {
  const p = S.profile;
  const today = todayISO();
  const comp = p.companion && !p.companion.hidden ? p.companion : null;
  const prog = p.companion ? companionProgress(p) : null;
  const draft = draftSession();

  // 1. Salutation compacte
  root.append(h('header', { class: 'greet' },
    h('div', {}, h('p', { class: 'fine', text: fmtDate(today, { weekday: true }) }), h('h1', { text: `Bonjour ${p.name}` })),
    h('button', { type: 'button', class: 'profile-chip', onclick: () => openProfileSwitcher(), 'aria-label': `Profil : ${p.name}. Changer de profil` },
      h('span', { class: 'avatar', style: { background: p.color }, 'aria-hidden': 'true' }, p.avatar || p.name.slice(0, 1)), h('span', { text: 'Profil' }))));

  // 2. Carte principale
  const mini = comp ? renderCompanion(comp, { level: prog.level, decor: false, reaction: draft ? null : null }) : null;
  if (draft) {
    const done = draft.entries.filter(e => e.kind === 'cardio' ? e.durationMin : (e.sets || []).length && e.sets.every(s => s.done)).length;
    root.append(h('section', { class: 'card card-hero', 'aria-label': 'Séance en cours' },
      h('div', { class: 'hero-top' }, h('div', { class: 'grow stack-sm' }, h('p', { class: 'fine', text: 'Séance en cours' }), h('h2', { class: 'card-title', text: draft.suggestion?.title || 'Séance libre' }),
        h('p', { class: 'hero-meta' }, h('span', { text: `${done} sur ${draft.entries.length} exercice(s) terminé(s)` }))), mini),
      btn('Reprendre ma séance', () => go('#/seance'), { kind: 'light', iconName: 'seance', cls: 'btn-wide' })));
  } else if (missingForProgram(p).length) {
    root.append(completeProgramCard(p));
  } else {
    const sg = suggestSession({ profile: p, program: p.program, sessions: S.data.sessions, activities: S.data.activities, today, options: { minutes: p.durationMin }, library: allExercises(), getEx });
    const doneToday = doneSessions(S.data.sessions).some(x => x.date === today);
    if (!sg.needsProgram) {
      root.append(h('section', { class: 'card card-hero', 'aria-label': 'Ta prochaine séance' },
        h('div', { class: 'hero-top' }, h('div', { class: 'grow stack-sm' },
          h('p', { class: 'fine', text: doneToday ? 'Bien joué pour aujourd’hui. Prochaine séance' : 'Ta prochaine séance' }),
          h('h2', { class: 'card-title', text: sg.title }),
          h('p', { class: 'hero-meta' }, h('span', {}, icon('timer', { size: 18 }), `≈ ${sg.estMinutes} min`), h('span', {}, icon('seance', { size: 18 }), `${sg.items.length} exercices${sg.cardio ? ' + cardio' : ''}`))), mini),
        h('div', { class: 'row' },
          btn('Commencer', () => openQuickStart(), { kind: 'light', iconName: 'seance' }),
          btn('Adapter', () => go('#/seance/preparer'), { kind: 'outline-light' }))));
    }
  }

  // 3. Cette semaine
  const sum = weeklySummary(p, S.data.sessions, S.data.activities, S.data.measurements, today);
  const target = sum.gymTarget || 0;
  const dots = h('span', { class: 'dots', 'aria-hidden': 'true' }, ...Array.from({ length: Math.max(target, sum.gymDone) }, (_, i) => h('i', { class: i < sum.gymDone ? 'on' : '' })), ...Array.from({ length: Math.min(sum.outdoorCount, 7) }, () => h('i', { class: 'out' })));
  root.append(h('section', { class: 'block', 'aria-label': 'Cette semaine' },
    h('div', { class: 'row-between' }, h('h2', { class: 'block-title', text: 'Cette semaine' }), h('a', { class: 'link fine', href: '#/progression', text: 'Détails' })),
    h('div', { class: 'week' },
      h('div', { class: 'week-cell' }, h('span', { class: 'week-v', text: target ? `${sum.gymDone}/${target}` : String(sum.gymDone) }), h('span', { class: 'week-l', text: `séance${sum.gymDone > 1 ? 's' : ''}${sum.outdoorCount ? ` + ${sum.outdoorCount} activité${sum.outdoorCount > 1 ? 's' : ''}` : ''}` }), dots),
      h('div', { class: 'week-cell' }, h('span', { class: 'week-v', text: sum.minutes.minutes ? fmtDuration(sum.minutes.minutes) : '0 min' }), h('span', { class: 'week-l', text: sum.minutes.partial ? 'actives (partiel)' : 'actives' })),
      h('div', { class: 'week-cell' }, h('span', { class: 'week-v', text: sum.calories.count ? kcalAggText(sum.calories).replace('Inconnues', '—') : '—' }), h('span', { class: 'week-l', text: !sum.calories.count ? 'kcal d’activité' : sum.calories.unknownCount || sum.calories.other ? 'kcal (partiel)' : 'kcal d’activité' })))));

  // 4. Compagnon
  if (comp) root.append(companionCard(p));
  else if (shouldInvite(p)) root.append(adoptInvite(p));

  // 5. Objectif personnel
  if ((p.weightTargets || []).length) {
    const w = latest(S.data.measurements, 'poids');
    const ms = w ? nextMilestone(p, w.value) : null;
    root.append(h('a', { class: 'card card-flat', href: '#/progression?onglet=mesures', style: { textDecoration: 'none', color: 'inherit' } },
      h('div', { class: 'row-between' }, h('span', { class: 'h3', text: 'Mon objectif' }), icon('target', { size: 20 })),
      w ? h('p', {}, h('span', { class: 'strong', text: measureValue(w) }), h('span', { class: 'muted', text: ` le ${fmtDate(w.date)}` })) : h('p', { class: 'muted', text: 'Aucun poids noté pour l’instant.' }),
      ms ? h('p', { class: 'fine', text: `Prochain palier : ${targetLabel(ms)}${w ? ` (écart ≈ ${fmtNum(Math.abs(w.value - (ms.max ?? ms.value)), 1)} kg)` : ''}` }) : null));
  }

  // 6. Actions rapides
  root.append(h('div', { class: 'quick' },
    btn('Ajouter une activité', () => go('#/activite/nouvelle'), { iconName: 'bike' }),
    btn('Noter une mesure', () => openMeasure(null), { iconName: 'scale' })));

  const facts = progressFacts(S.data.sessions);
  if (facts.length) root.append(h('section', { class: 'block' }, h('h2', { class: 'block-title', text: 'Derniers progrès' }), h('ul', { class: 'bullets' }, ...facts.map(f => h('li', { text: f })))));

  const nData = S.data.sessions.length + S.data.activities.length + S.data.measurements.length;
  const days = S.lastExport ? daysBetween(S.lastExport.slice(0, 10), today) : null;
  if (nData >= 3 && (days === null || days >= (S.settings.backupReminderDays || 14))) {
    root.append(h('p', { class: 'fine row' }, icon('download', { size: 16 }), h('span', { text: days === null ? 'Aucune sauvegarde exportée.' : `Dernière sauvegarde il y a ${days} jours.` }), h('a', { href: '#/reglages', text: 'Exporter' })));
  }
}
