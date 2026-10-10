import { h, clear, uid, fmtNum, fmtDate, todayISO } from '../util.js';
import { go } from '../router.js';
import { S, newProfile, saveProfile, loadProfile, deleteProfile, getEx, draftSession, saveRecord } from '../state.js';
import { APP, PROFILE_COLORS, PROFILE_AVATARS } from '../config.js';
import { EQUIPMENT, ZONES } from '../data/exercises.js';
import { LEVEL_OPTIONS } from '../data/programs.js';
import { sheet, btn, iconBtn, field, textInput, textArea, numInput, chips, segmented, pageHeader, section, note, confirmDialog, toast, avatar, icon, kv } from '../ui/components.js';
import { GOAL_OPTIONS, latest, measureValue, targetLabel, nextMilestone } from './common.js';
import { openExercisePicker } from './exercises.js';
import { openImport } from './settings.js';
import { ANIMALS } from '../companion/art.js';
import { renderCompanion } from '../companion/view.js';

const CARDIO_PREFS = { marche: 'Marche', tapis_incline: 'Tapis incliné', course: 'Course', velo: 'Vélo', elliptique: 'Elliptique', rameur: 'Rameur', natation: 'Natation' };

export function renderWelcome(root) {
  root.append(h('div', { class: 'welcome' },
    h('div', { class: 'welcome-pets', 'aria-hidden': 'true' }, ...Object.keys(ANIMALS).map(a => renderCompanion({ animal: a }, { decor: false, expression: 'sourire' }))),
    h('h1', { text: APP.name }),
    h('p', { class: 'lead', text: 'Tes séances, tes activités et tes progrès, enregistrés sur ce téléphone.' }),
    h('p', { class: 'muted', text: 'Pas de compte ni de serveur : tes données restent sur cet appareil. Pour les transférer, tu les exportes puis tu les importes.' }),
    h('div', { class: 'stack' },
      btn('Créer mon profil', () => { go('#/profil/nouveau'); }, { kind: 'primary', iconName: 'plus' }),
      btn('Importer une sauvegarde', () => openImport(), { iconName: 'upload' }))));
}

export function openProfileSwitcher() {
  const draft = draftSession();
  const content = h('div', {},
    draft ? note(`Une séance est en cours pour ${S.profile.name}. Elle reste enregistrée et attachée à ce profil.`) : null,
    h('ul', { class: 'list' }, ...S.profiles.map(p => h('li', {}, h('button', { type: 'button', class: 'list-link', 'aria-current': p.id === S.profile?.id ? 'true' : null, onclick: async () => {
      sh.close();
      if (p.id !== S.profile.id) { await loadProfile(p.id); toast(`Profil actif : ${p.name}`); go('#/accueil'); }
    } }, avatar(p, 34), h('span', { class: 'grow', text: p.name }), p.id === S.profile?.id ? h('span', { class: 'tag', text: 'Actif' }) : null)))),
    h('p', { class: 'fine', text: 'Les profils séparent les données sur cet appareil ; ils ne sont pas protégés par un mot de passe.' }));
  const sh = sheet({ title: 'Changer de profil', content, actions: [btn('Nouveau profil', () => { sh.close(); go('#/profil/nouveau'); }, { iconName: 'plus' })] });
}

function weightTargetsEditor(p) {
  const wrap = h('div', { class: 'stack-sm' });
  const draw = () => {
    clear(wrap);
    (p.weightTargets || []).forEach((t, i) => {
      wrap.append(h('div', { class: 'row-inline' },
        textInput(t.label || '', { placeholder: 'Nom (ex. palier)', oninput: v => { t.label = v; } }),
        numInput(t.min ?? t.value ?? null, { placeholder: 'kg', ariaLabel: 'Valeur ou minimum (kg)', oninput: v => { if (t.max) t.min = v; else t.value = v; } }),
        numInput(t.max ?? null, { placeholder: 'max', ariaLabel: 'Maximum facultatif (kg)', oninput: v => { if (v) { t.min = t.min ?? t.value; t.max = v; delete t.value; } else { t.value = t.min ?? t.value; delete t.min; delete t.max; } } }),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Retirer ce palier', onclick: () => { p.weightTargets.splice(i, 1); draw(); } }, icon('trash', { size: 18 }))));
    });
    wrap.append(btn('Ajouter un palier', () => { p.weightTargets = [...(p.weightTargets || []), { id: uid(), label: '', value: null }]; draw(); }, { small: true, iconName: 'plus' }));
  };
  draw();
  return wrap;
}

export function renderProfileForm(root, mode, params) {
  const part = mode === 'nouveau' ? null : (params && params.get('partie')) || null;
  const creating = mode === 'nouveau';
  const p = creating ? newProfile({ color: PROFILE_COLORS[S.profiles.length % PROFILE_COLORS.length] }) : JSON.parse(JSON.stringify(S.profile));
  const PART_TITLES = { identite: 'Identité', objectifs: 'Mes objectifs', materiel: 'Matériel et exercices' };
  root.append(pageHeader(creating ? 'Nouveau profil' : (PART_TITLES[part] || 'Modifier le profil'), { back: creating ? (S.profiles.length ? '#/profil' : '#/bienvenue') : '#/profil',
    sub: creating ? 'Seul le prénom est obligatoire. Le reste peut être complété plus tard.' : null }));
  const avatarRow = h('div', { class: 'avatar-pick', role: 'group', 'aria-label': 'Avatar' });
  const drawAv = () => {
    clear(avatarRow);
    PROFILE_AVATARS.forEach(a => avatarRow.append(h('button', { type: 'button', class: 'av-btn', 'aria-pressed': String(p.avatar === a), style: { background: p.color }, onclick: () => { p.avatar = a; drawAv(); }, 'aria-label': 'Avatar ' + a }, a)));
  };
  const colorRow = h('div', { class: 'avatar-pick', role: 'group', 'aria-label': 'Couleur' }, ...PROFILE_COLORS.map(c => h('button', { type: 'button', class: 'color-btn', style: { background: c }, 'aria-label': 'Couleur ' + c, 'aria-pressed': String(p.color === c), onclick: (e) => { p.color = c; colorRow.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); drawAv(); } })));
  drawAv();
  const favLabel = h('p', { class: 'muted' });
  const excLabel = h('p', { class: 'muted' });
  const drawLists = () => {
    favLabel.textContent = (p.favorites || []).map(id => getEx(id)?.name).filter(Boolean).join(', ') || 'Aucun';
    excLabel.textContent = (p.excluded || []).map(id => getEx(id)?.name).filter(Boolean).join(', ') || 'Aucun';
  };
  drawLists();
  const refs = textArea((p.references || []).join('\n'), { rows: 3, placeholder: 'Une information par ligne', oninput: v => { p.references = v.split('\n').map(x => x.trim()).filter(Boolean); } });

  root.append(h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    if (!p.name.trim()) { toast('Indique un prénom ou un pseudonyme.', { kind: 'error' }); return; }
    p.name = p.name.trim();
    p.weightTargets = (p.weightTargets || []).filter(t => t.value || (t.min && t.max));
    const iw = p._initialWeight; delete p._initialWeight;
    await saveProfile(p);
    if (creating) {
      await loadProfile(p.id);
      if (iw) await saveRecord('measurements', { id: uid(), date: todayISO(), type: 'poids', value: iw, approx: false, source: null, note: '' });
      toast(`Profil ${p.name} créé.`); go('#/attention?nouveau=1');
    }
    else { toast('Profil enregistré.'); go('#/profil'); }
  } },
    section('Identité',
      field('Prénom ou pseudonyme', textInput(p.name, { oninput: v => { p.name = v; }, maxlength: 40 })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Avatar' }), avatarRow),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Couleur' }), colorRow),
      h('div', { class: 'grid-3' },
        field('Année de naissance', numInput(p.birthYear, { decimals: 0, oninput: v => { p.birthYear = v; } })),
        field('Taille (cm)', numInput(p.heightCm, { decimals: 0, oninput: v => { p.heightCm = v; } })),
        creating ? field('Poids (kg)', numInput(null, { oninput: v => { p._initialWeight = v; } }), { help: 'Facultatif, daté d’aujourd’hui' }) : null)),
    section('Objectifs',
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Objectif principal' }), segmented(GOAL_OPTIONS, p.goal, v => { p.goal = v; }, { cls: 'seg-wrap' })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Objectifs secondaires (facultatif)' }), chips(GOAL_OPTIONS, p.secondaryGoals, v => { p.secondaryGoals = v; })),
      field('Précision sur l’objectif', textInput(p.goalNote, { oninput: v => { p.goalNote = v; }, placeholder: 'Facultatif' })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Paliers de poids (facultatif)' }), weightTargetsEditor(p))),
    section('Entraînement',
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Niveau' }), segmented(Object.fromEntries(Object.entries(LEVEL_OPTIONS).map(([k, v]) => [k, v.label])), p.level, v => { p.level = v; }, { cls: 'seg-wrap' })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Séances en salle par semaine' }), segmented(['1', '2', '3', '4', '5', '6'].map(v => ({ value: v, label: v })), p.gymPerWeek ? String(p.gymPerWeek) : null, v => { p.gymPerWeek = v ? Number(v) : null; })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Durée habituelle d’une séance' }), segmented(['30', '45', '60', '75', '90'].map(v => ({ value: v, label: v + ' min' })), p.durationMin ? String(p.durationMin) : null, v => { p.durationMin = v ? Number(v) : null; }, { cls: 'seg-wrap' })),
      field('Activité hors salle visée (minutes par semaine)', numInput(p.outdoorMinutesTarget, { decimals: 0, oninput: v => { p.outdoorMinutesTarget = v; } }), { help: 'Facultatif : marche, vélo, natation…' })),
    section('Matériel',
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Matériel disponible' }), chips(EQUIPMENT, p.equipment, v => { p.equipment = v; }))),
    section('Préférences',
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Cardio apprécié' }), chips(CARDIO_PREFS, p.cardioPrefs, v => { p.cardioPrefs = v; })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Cardio à intégrer progressivement' }), chips(CARDIO_PREFS, p.cardioProgressive, v => { p.cardioProgressive = v; })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices préférés' }), favLabel, btn('Choisir', () => openExercisePicker({ multi: true, selected: p.favorites, onPick: ids => { p.favorites = ids; drawLists(); } }), { small: true })),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Exercices exclus' }), excLabel, btn('Choisir', () => openExercisePicker({ multi: true, selected: p.excluded, onPick: ids => { p.excluded = ids; drawLists(); } }), { small: true }),
        h('p', { class: 'help', text: 'Un exercice exclu n’est jamais proposé, ni en remplacement.' })),
      field('Repères personnels', refs, { help: 'Informations de contexte (habitudes, capacités déclarées). Elles ne créent aucun relevé.' })),
    h('div', { class: 'form-actions' }, h('button', { type: 'submit', class: 'btn btn-primary', text: creating ? 'Créer le profil' : 'Enregistrer' }))));
  // Affichage progressif : en modification, seule la rubrique demandée est visible.
  const KEEP = { identite: ['Identité'], objectifs: ['Objectifs', 'Entraînement'], materiel: ['Matériel', 'Préférences'] };
  if (part && KEEP[part]) {
    for (const sec of root.querySelectorAll('form > section')) {
      const t = sec.querySelector('.block-title')?.textContent;
      if (!KEEP[part].includes(t)) sec.hidden = true;
    }
  }
  if (creating) {
    // Création : l'essentiel d'abord, le reste replié
    const secs = [...root.querySelectorAll('form > section')];
    for (const sec of secs.slice(2)) {
      const det = h('details', { class: 'box' }, h('summary', { text: sec.querySelector('.block-title')?.textContent + ' (facultatif)' }));
      sec.querySelector('.block-title')?.remove();
      sec.replaceWith(det); det.append(sec);
    }
  }
}

export function renderProfile(root) {
  const p = S.profile;
  const w = latest(S.data.measurements, 'poids');
  const ms = w ? nextMilestone(p, w.value) : null;
  root.append(h('header', { class: 'greet' }, h('div', { class: 'row' }, avatar(p, 52),
    h('div', {}, h('h1', { text: p.name }), h('p', { class: 'muted', text: [p.goal ? GOAL_OPTIONS[p.goal] : 'Objectif à renseigner', p.level ? LEVEL_OPTIONS[p.level].label : null].filter(Boolean).join(' · ') }))),
    iconBtn('edit', 'Modifier l’identité', () => go('#/profil/edition?partie=identite'))));

  const item = (href, ic, title, sub, tone = '') => h('li', {}, h('a', { class: 'list-link', href }, h('span', { class: `ico-wrap ${tone}` }, icon(ic, { size: 20 })), h('span', { class: 'grow' }, h('span', { class: 'block-txt strong', text: title }), sub ? h('span', { class: 'fine', text: sub }) : null), icon('chevron', { size: 18 })));
  const attCount = (p.attention || []).length;
  const comp = p.companion;
  root.append(h('ul', { class: 'list' },
    item('#/profil/edition?partie=objectifs', 'target', 'Mes objectifs', [p.goal ? GOAL_OPTIONS[p.goal] : 'À renseigner', p.gymPerWeek ? `${p.gymPerWeek} séance(s)/semaine` : null, ms ? `palier ${targetLabel(ms)}` : null].filter(Boolean).join(' · ')),
    item('#/programme', 'calendar', 'Mon programme', p.program?.status === 'ok' ? `${p.program.days.length} journée(s) : ${p.program.days.map(d => d.label).join(', ')}` : 'À compléter'),
    item('#/attention', 'info', 'Confort et points d’attention', attCount ? p.attention.map(a => ZONES[a.zone]).join(', ') : 'Aucun point renseigné', 'coral'),
    item('#/profil/edition?partie=materiel', 'seance', 'Matériel et exercices', `${(p.equipment || []).length} type(s) de matériel · ${(p.excluded || []).length} exclusion(s)`),
    item('#/compagnon', 'paw', 'Mon compagnon', comp ? `${comp.name || 'Sans nom'} · niveau ${comp.level || 1}` : 'À choisir', 'gold'),
    item('#/mesures', 'scale', 'Mesures', w ? `Dernier poids : ${measureValue(w)} (${fmtDate(w.date)})` : `${S.data.measurements.length} mesure(s)`),
    item('#/reglages', 'settings', 'Réglages et sauvegardes', S.lastExport ? `Dernier export : ${fmtDate(S.lastExport.slice(0, 10))}` : 'Aucun export pour l’instant')));

  root.append(h('details', { class: 'box' }, h('summary', { text: 'Plus d’options' }),
    h('ul', { class: 'list' },
      item('#/exercices', 'list', 'Bibliothèque d’exercices', 'Préférés, exclusions, incréments, exercices personnalisés'),
      item('#/modeles', 'copy', 'Modèles de séance', `${S.data.templates.length} modèle(s)`)),
    (p.references || []).length ? h('div', {}, h('h3', { class: 'h3', text: 'Repères' }), h('ul', { class: 'bullets fine' }, ...p.references.map(r => h('li', { text: r })))) : null));

  root.append(section('Profils sur cet appareil',
    h('ul', { class: 'list' }, ...S.profiles.map(x => h('li', { class: 'list-row' }, avatar(x, 30), h('span', { class: 'grow', text: x.name + (x.id === p.id ? ' (actif)' : '') }),
      x.id !== p.id ? btn('Ouvrir', async () => { await loadProfile(x.id); go('#/accueil'); }, { small: true }) : null))),
    h('div', { class: 'row' },
      btn('Nouveau profil', () => { go('#/profil/nouveau'); }, { iconName: 'plus', small: true }),
      btn('Supprimer ce profil', async () => {
        const ok = await confirmDialog(`Supprimer le profil ${p.name} et toutes ses données (séances, activités, mesures, compagnon) sur cet appareil ?`, { danger: true, confirmLabel: 'Supprimer définitivement', detail: 'Les autres profils ne sont pas touchés. Pense à exporter ce profil avant si tu veux le garder.' });
        if (!ok) return;
        await deleteProfile(p.id); toast('Profil supprimé.');
        go(S.profile ? '#/accueil' : '#/bienvenue');
      }, { kind: 'danger', small: true, iconName: 'trash' })),
    h('p', { class: 'fine', text: 'Les profils sont séparés mais pas protégés par un mot de passe. Pour changer de téléphone : Réglages > Exporter, puis Importer.' })));
}
