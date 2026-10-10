// Sauvegarde et restauration. Fonctions pures + préparation des lots à écrire.
import { APP } from './config.js';
import { PROFILE_STORES } from './db.js';
import { uid, nowISO } from './util.js';

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export function buildExport(profileBundles, scope = 'complet') {
  return {
    app: APP.slug, format: APP.exportFormat, appVersion: APP.version, exportedAt: nowISO(), scope,
    profiles: profileBundles.map(b => ({
      profile: b.profile,
      ...Object.fromEntries(PROFILE_STORES.map(n => [n, b[n] || []])),
    })),
  };
}

// Migrations du format d'export : clé = format atteint.
const FORMAT_MIGRATIONS = {
  // Format 2 (v2.0.0) : ajout facultatif du compagnon dans chaque profil. Les profils sans
  // compagnon restent valides : le compagnon sera proposé à l'utilisateur.
  2(data) {
    for (const b of data.profiles || []) if (b && b.profile && b.profile.companion === undefined) b.profile.companion = null;
    data.format = 2;
    return data;
  },
};

function migrate(data) {
  let d = data;
  for (let v = (d.format || 1) + 1; v <= APP.exportFormat; v++) if (FORMAT_MIGRATIONS[v]) d = FORMAT_MIGRATIONS[v](d);
  return d;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isStr = (v) => typeof v === 'string';
const isNumOrNull = (v) => v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v));

// Nettoyage récursif : seules les valeurs JSON simples sont conservées ; textes limités en taille.
function sanitize(v, depth = 0) {
  if (depth > 12) return null;
  if (v === null) return null;
  if (typeof v === 'string') return v.slice(0, 5000);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, 5000).map(x => sanitize(x, depth + 1));
  if (typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      o[k] = sanitize(x, depth + 1);
    }
    return o;
  }
  return null;
}

export function parseImportText(text) {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, errors: ['Fichier trop volumineux.'] };
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, errors: ['Ce fichier n’est pas un JSON valide.'] }; }
  return validateImport(obj);
}

export function validateImport(raw) {
  const errors = [], warnings = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Contenu vide ou illisible.'] };
  if (raw.app !== APP.slug) return { ok: false, errors: [`Ce fichier ne provient pas de ${APP.name}.`] };
  if (typeof raw.format !== 'number' || raw.format < 1) return { ok: false, errors: ['Version de format absente.'] };
  if (raw.format > APP.exportFormat) return { ok: false, errors: ['Ce fichier vient d’une version plus récente de l’application. Mets l’application à jour puis réessaie.'] };
  if (!Array.isArray(raw.profiles) || !raw.profiles.length) return { ok: false, errors: ['Aucun profil dans ce fichier.'] };
  const data = migrate(sanitize(raw));
  const bundles = [];
  data.profiles.forEach((b, i) => {
    const p = b && b.profile;
    if (!p || !isStr(p.id) || !p.id || !isStr(p.name) || !p.name.trim()) { errors.push(`Profil n° ${i + 1} : identifiant ou prénom manquant.`); return; }
    const out = { profile: p };
    for (const store of PROFILE_STORES) {
      const arr = Array.isArray(b[store]) ? b[store] : [];
      out[store] = [];
      arr.forEach((r, j) => {
        if (!r || !isStr(r.id) || !r.id) { warnings.push(`${p.name} : un élément de « ${store} » sans identifiant a été ignoré.`); return; }
        if (store !== 'customExercises' && store !== 'templates' && (!isStr(r.date) || !DATE_RE.test(r.date))) { warnings.push(`${p.name} : un élément de « ${store} » sans date valide a été ignoré.`); return; }
        if (store === 'measurements' && !isNumOrNull(r.value)) { warnings.push(`${p.name} : une mesure invalide a été ignorée.`); return; }
        if (store === 'sessions' && !Array.isArray(r.entries)) r.entries = [];
        r.profileId = p.id;
        out[store].push(r);
      });
    }
    bundles.push(out);
  });
  if (errors.length) return { ok: false, errors, warnings };
  return { ok: true, errors, warnings, bundles, exportedAt: data.exportedAt || null, scope: data.scope || 'complet' };
}

export function countsOf(b) {
  return {
    sessions: b.sessions.filter(s => s.status !== 'draft').length,
    activities: b.activities.length, measurements: b.measurements.length,
    customExercises: b.customExercises.length, templates: b.templates.length,
  };
}

function newer(a, b) { return (a.updatedAt || a.createdAt || '') > (b.updatedAt || b.createdAt || ''); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// Prévisualisation : pour chaque profil importé, ce qui serait ajouté / mis à jour / ignoré.
export function planImport(bundles, existing) {
  // existing : { profiles: [], sessions: [], ... } (toutes données de l'appareil)
  const exProfiles = new Map(existing.profiles.map(p => [p.id, p]));
  return bundles.map(b => {
    const exists = exProfiles.has(b.profile.id);
    const stats = { add: 0, update: 0, same: 0, keepLocal: 0 };
    if (exists) {
      for (const store of PROFILE_STORES) {
        const local = new Map((existing[store] || []).filter(r => r.profileId === b.profile.id).map(r => [r.id, r]));
        for (const r of b[store]) {
          const l = local.get(r.id);
          if (!l) stats.add++;
          else if (same(l, r)) stats.same++;
          else if (newer(r, l)) stats.update++;
          else stats.keepLocal++;
        }
      }
    }
    return { profileId: b.profile.id, name: b.profile.name, exists, counts: countsOf(b), stats };
  });
}

// Prépare le lot à écrire.
// mode 'restaurer' : remplace toutes les données de l'appareil.
// mode 'ajouter'  : choix par profil existant : 'fusionner' (sans doublon, version la plus récente gardée)
//                   ou 'copie' (nouveau profil distinct, nouveaux identifiants).
export function prepareWrite(bundles, existing, mode, choices = {}) {
  const out = { profiles: [], ...Object.fromEntries(PROFILE_STORES.map(n => [n, []])) };
  const exProfiles = new Map(existing.profiles.map(p => [p.id, p]));
  for (const b of bundles) {
    const exists = exProfiles.has(b.profile.id);
    if (mode === 'restaurer' || !exists) {
      out.profiles.push(b.profile);
      for (const store of PROFILE_STORES) out[store].push(...b[store]);
      continue;
    }
    const choice = choices[b.profile.id] || 'fusionner';
    if (choice === 'ignorer') continue;
    if (choice === 'copie') {
      const newId = uid();
      const idMap = {};
      out.profiles.push({ ...b.profile, id: newId, name: b.profile.name + ' (copie)', program: null, createdAt: nowISO(), updatedAt: nowISO() });
      for (const store of PROFILE_STORES) for (const r of b[store]) { idMap[r.id] = uid(); out[store].push({ ...r, id: idMap[r.id], profileId: newId }); }
      // Les exercices personnalisés gardent leur lien dans les séances copiées
      for (const s of out.sessions.filter(s => s.profileId === newId)) for (const e of s.entries || []) if (idMap[e.exerciseId]) e.exerciseId = idMap[e.exerciseId];
      continue;
    }
    // fusion
    const lp = exProfiles.get(b.profile.id);
    out.profiles.push(newer(b.profile, lp) ? b.profile : lp);
    for (const store of PROFILE_STORES) {
      const local = new Map((existing[store] || []).filter(r => r.profileId === b.profile.id).map(r => [r.id, r]));
      for (const r of b[store]) {
        const l = local.get(r.id);
        if (!l || (!same(l, r) && newer(r, l))) out[store].push(r);
      }
    }
  }
  return out;
}

// ---------- CSV ----------
function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // évite l'interprétation de formules dans un tableur
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(rows) { return '\uFEFF' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'); }

export function csvSessions(profile, sessions) {
  const rows = [['Profil', 'Date', 'Exercice', 'Variante / équipement', 'Type', 'Série', 'Charge (kg)', 'Répétitions', 'Secondes', 'Nombre de séries connu', 'Cardio : durée (min)', 'Durée minimale', 'Distance (km)', 'Vitesse (km/h)', 'Inclinaison (%)', 'Notes']];
  for (const s of sessions.filter(x => x.status === 'done').sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of s.entries || []) {
      const variant = [e.variant, e.equipmentNote].filter(Boolean).join(' / ');
      if (e.kind === 'cardio') {
        rows.push([profile.name, s.date, e.name, variant, 'cardio', '', '', '', '', '', e.durationMin, e.durationIsMinimum ? 'oui' : '', e.distanceKm, e.speedKmh, e.inclinePct, e.notes]);
      } else {
        (e.sets || []).forEach((st, i) => rows.push([profile.name, s.date, e.name, variant, st.type === 'warmup' ? 'échauffement' : 'travail', i + 1, st.load, st.reps, st.seconds, e.setsCountKnown === false ? 'non' : 'oui', '', '', '', '', '', i === 0 ? e.notes : '']));
      }
    }
  }
  return toCsv(rows);
}

export function csvActivities(profile, activities) {
  const rows = [['Profil', 'Date', 'Heure', 'Type', 'Durée (min)', 'Distance (km)', 'Dénivelé (m)', 'Intensité', 'Assistance', 'Calories saisies', 'Convention', 'Source', 'Notes']];
  for (const a of activities.slice().sort((x, y) => x.date.localeCompare(y.date))) {
    rows.push([profile.name, a.date, a.startTime, a.type === 'autre' ? (a.customLabel || 'autre') : a.type, a.durationMin, a.distanceKm, a.elevationM, a.intensity, a.assistLevel, a.calories?.value, a.calories?.convention, a.calories?.source, a.notes]);
  }
  return toCsv(rows);
}

export function csvMeasurements(profile, measurements) {
  const rows = [['Profil', 'Date', 'Mesure', 'Valeur', 'Approximative', 'Source', 'Note']];
  for (const m of measurements.slice().sort((x, y) => x.date.localeCompare(y.date))) rows.push([profile.name, m.date, m.type, m.value, m.approx ? 'oui' : '', m.source, m.note]);
  return toCsv(rows);
}
