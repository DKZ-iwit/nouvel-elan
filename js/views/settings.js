import { h, fmtDate, fmtNum, todayISO } from '../util.js';
import { S, saveSettings, markExported, reloadAll, loadProfile, deviceSnapshot } from '../state.js';
import { APP } from '../config.js';
import * as db from '../db.js';
import { buildExport, parseImportText, planImport, prepareWrite, csvSessions, csvActivities, csvMeasurements } from '../io.js';
import { btn, field, numInput, segmented, pageHeader, section, note, sheet, confirmDialog, toast, download, kv } from '../ui/components.js';
import { applyTheme, checkForUpdate } from '../platform.js';
import { rerender , go } from '../router.js';

function stamp() { return todayISO(); }

async function exportAll() {
  const snap = await deviceSnapshot();
  const bundles = snap.profiles.map(p => ({ profile: p, ...Object.fromEntries(db.PROFILE_STORES.map(st => [st, snap[st].filter(r => r.profileId === p.id)])) }));
  download(`${APP.slug}-sauvegarde-${stamp()}.json`, JSON.stringify(buildExport(bundles, 'complet'), null, 1));
  await markExported(); toast('Sauvegarde complète exportée.'); rerender();
}

async function exportProfile() {
  const p = S.profile;
  download(`${APP.slug}-${p.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${stamp()}.json`, JSON.stringify(buildExport([{ profile: p, ...S.data }], 'profil'), null, 1));
  await markExported(); toast(`Profil ${p.name} exporté.`); rerender();
}

export function openImport() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files[0]; input.remove();
    if (!file) return;
    const text = await file.text();
    const res = parseImportText(text);
    if (!res.ok) { sheet({ title: 'Import impossible', content: h('div', {}, ...res.errors.map(e => note(e, 'warning'))) }); return; }
    const snap = await deviceSnapshot();
    const plan = planImport(res.bundles, snap);
    const hasLocal = snap.profiles.length > 0;
    let mode = 'ajouter';
    const choices = {};
    const list = h('ul', { class: 'list' }, ...plan.map(pl => h('li', { class: 'list-col' },
      h('strong', { text: pl.name + (pl.exists ? ' (déjà sur cet appareil)' : ' (nouveau)') }),
      h('span', { class: 'fine', text: `${pl.counts.sessions} séance(s), ${pl.counts.activities} activité(s), ${pl.counts.measurements} mesure(s), ${pl.counts.customExercises} exercice(s) perso, ${pl.counts.templates} modèle(s)` }),
      pl.exists ? h('span', { class: 'fine', text: `Fusion : ${pl.stats.add} ajout(s), ${pl.stats.update} mise(s) à jour, ${pl.stats.same} identique(s) ignoré(s), ${pl.stats.keepLocal} plus récent(s) sur l’appareil conservé(s).` }) : null,
      pl.exists ? segmented({ fusionner: 'Fusionner', copie: 'Profil séparé', ignorer: 'Ignorer' }, 'fusionner', v => { choices[pl.profileId] = v || 'fusionner'; }, { label: 'Choix pour ' + pl.name }) : null)));
    const modeWrap = hasLocal ? h('div', { class: 'field' }, h('span', { class: 'label', text: 'Que faire ?' }),
      segmented({ ajouter: 'Ajouter ou fusionner', restaurer: 'Restaurer (remplace tout)' }, 'ajouter', v => { mode = v || 'ajouter'; list.hidden = false; }, { cls: 'seg-wrap' }),
      h('p', { class: 'help', text: 'Ajouter : les profils de l’appareil sont conservés, sans doublon en cas d’import répété. Restaurer : toutes les données de l’appareil sont remplacées par celles du fichier.' })) : null;
    const sh = sheet({ title: 'Aperçu de l’import', wide: true, content: h('div', {},
      h('p', { class: 'muted', text: `Fichier du ${res.exportedAt ? fmtDate(res.exportedAt.slice(0, 10), { year: true }) : 'date inconnue'}, ${plan.length} profil(s).` }),
      ...res.warnings.slice(0, 5).map(w => note(w, 'warning')),
      modeWrap, list),
    actions: [btn('Annuler', () => sh.close()), btn('Importer', async () => {
      if (mode === 'restaurer' && !await confirmDialog('Remplacer toutes les données de cet appareil par celles du fichier ?', { danger: true, confirmLabel: 'Remplacer', detail: 'Tous les profils actuels et leurs historiques seront supprimés de cet appareil.' })) return;
      const toWrite = prepareWrite(res.bundles, snap, mode, choices);
      await db.writeBundle(toWrite, { clearFirst: mode === 'restaurer' });
      await reloadAll();
      if (!S.profile || mode === 'restaurer' || !hasLocal) { const first = toWrite.profiles[0]; if (first) await loadProfile(first.id); }
      sh.close();
      toast('Import terminé.');
      go('#/accueil');
    }, { kind: 'primary' })] });
  });
  document.body.append(input);
  input.click();
}

export function renderSettings(root) {
  root.append(pageHeader('Réglages', { back: '#/profil' }));
  root.append(section('Affichage',
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Thème' }), segmented({ auto: 'Automatique', clair: 'Clair', sombre: 'Sombre' }, S.settings.theme, async v => { await saveSettings({ theme: v || 'auto' }); applyTheme(); })),
    field('Repos par défaut (secondes)', numInput(S.settings.restSeconds, { decimals: 0, oninput: v => { if (v) saveSettings({ restSeconds: v }); } }), { help: 'Utilisé quand la séance ne propose pas de durée de repos.' })));

  root.append(section('Sauvegardes',
    h('p', { class: 'muted', text: S.lastExport ? `Dernier export : ${fmtDate(S.lastExport.slice(0, 10), { year: true })}.` : 'Aucun export pour l’instant.' }),
    note('Tes données sont stockées uniquement dans ce navigateur, sur cet appareil. Effacer les données du navigateur ou désinstaller l’application peut supprimer ton historique : un export régulier permet de le restaurer.'),
    h('div', { class: 'stack' },
      btn('Exporter tout (tous les profils)', exportAll, { iconName: 'download', kind: 'primary' }),
      btn(`Exporter le profil de ${S.profile.name}`, exportProfile, { iconName: 'download' }),
      btn('Importer une sauvegarde', openImport, { iconName: 'upload' })),
    field('Rappel de sauvegarde (jours)', numInput(S.settings.backupReminderDays, { decimals: 0, oninput: v => { if (v) saveSettings({ backupReminderDays: v }); } })),
    h('h3', { class: 'h3', text: 'Tableur (CSV)' }),
    h('div', { class: 'row wrap' },
      btn('Séances', () => download(`${APP.slug}-seances-${stamp()}.csv`, csvSessions(S.profile, S.data.sessions), 'text/csv;charset=utf-8'), { small: true, iconName: 'download' }),
      btn('Activités', () => download(`${APP.slug}-activites-${stamp()}.csv`, csvActivities(S.profile, S.data.activities), 'text/csv;charset=utf-8'), { small: true, iconName: 'download' }),
      btn('Mesures', () => download(`${APP.slug}-mesures-${stamp()}.csv`, csvMeasurements(S.profile, S.data.measurements), 'text/csv;charset=utf-8'), { small: true, iconName: 'download' }))));

  const storage = h('div', { class: 'kvs' });
  (async () => {
    const est = await db.storageEstimate();
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
    storage.append(
      kv('Espace utilisé', est ? `${fmtNum(est.usage / 1024 / 1024, 1)} Mo` : 'Inconnu'),
      kv('Stockage protégé', persisted === null ? 'Non disponible' : persisted ? 'Oui' : 'Non (le navigateur peut le libérer si l’espace manque)'));
  })();
  root.append(section('Confidentialité et stockage',
    h('ul', { class: 'bullets' },
      h('li', { text: 'Aucun compte, aucun serveur, aucune publicité, aucune mesure d’audience.' }),
      h('li', { text: 'Les données restent sur cet appareil et ne sont jamais synchronisées entre téléphones.' }),
      h('li', { text: 'Pour changer de téléphone : exporter ici, puis importer sur le nouvel appareil.' }),
      h('li', { text: 'Les profils d’un même appareil sont séparés, mais pas protégés par un mot de passe.' })),
    storage,
    btn('Demander un stockage protégé', async () => { const ok = await db.requestPersistence(); toast(ok ? 'Stockage protégé accordé.' : 'Le navigateur n’a pas accordé la protection (souvent automatique une fois l’application installée).'); rerender(); }, { small: true })));

  root.append(section('Application',
    h('div', { class: 'kvs' }, kv('Version', APP.version), kv('Profils sur cet appareil', String(S.profiles.length))),
    h('div', { class: 'row wrap' },
      btn('Rechercher une mise à jour', () => checkForUpdate(true), { small: true }),
      btn('Tout effacer sur cet appareil', async () => {
        if (!await confirmDialog('Effacer tous les profils et toutes les données de cet appareil ?', { danger: true, confirmLabel: 'Tout effacer', detail: 'Action définitive. Exporte une sauvegarde avant si besoin.' })) return;
        await db.wipeAll(); await reloadAll(); toast('Données effacées.'); go('#/bienvenue');
      }, { small: true, kind: 'danger' })),
    h('details', { class: 'more' }, h('summary', { text: 'Installer l’application sur le téléphone' }),
      h('p', { text: 'Android (Chrome) : menu ⋮ puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».' }),
      h('p', { text: 'iPhone (Safari) : bouton Partager puis « Sur l’écran d’accueil ».' }),
      h('p', { class: 'fine', text: 'Après la première ouverture, l’application fonctionne sans connexion.' })),
    h('details', { class: 'more' }, h('summary', { text: 'À propos des estimations' }),
      h('p', { text: 'Les calories d’activité sont des estimations : équations de l’ACSM pour la marche et la course avec vitesse et pente connues, valeurs MET du Compendium des activités physiques sinon. Elles excluent la dépense de repos et restent approximatives (fourchette affichée).' }),
      h('p', { text: 'Les suggestions de séance reposent sur des règles locales et explicables (voir « Mon programme »). Elles ne constituent pas un avis médical.' }))));
}
