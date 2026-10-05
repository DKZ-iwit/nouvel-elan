// Stockage local IndexedDB, schéma versionné.
// Chaque migration de schéma est additive et conserve les données existantes.
import { APP } from './config.js';

export const STORES = ['profiles', 'sessions', 'activities', 'measurements', 'customExercises', 'templates'];
export const PROFILE_STORES = ['sessions', 'activities', 'measurements', 'customExercises', 'templates'];

// Migrations de schéma : la clé est la version atteinte.
export const SCHEMA_MIGRATIONS = {
  1(db) {
    db.createObjectStore('meta', { keyPath: 'key' });
    db.createObjectStore('profiles', { keyPath: 'id' });
    for (const name of PROFILE_STORES) {
      const st = db.createObjectStore(name, { keyPath: 'id' });
      st.createIndex('profileId', 'profileId', { unique: false });
    }
  },
  // 2(db, tx) { ... }  ← exemple de future migration
};

let dbPromise = null;

export async function closeDB() { if (dbPromise) { const d = await dbPromise; d.close(); dbPromise = null; } }

export function openDB(name = APP.dbName, version = APP.dbVersion) {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error("Ce navigateur ne permet pas le stockage local (IndexedDB indisponible).")); return; }
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const tx = req.transaction;
      for (let v = ev.oldVersion + 1; v <= version; v++) {
        if (SCHEMA_MIGRATIONS[v]) SCHEMA_MIGRATIONS[v](db, tx);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error("Ouverture de la base locale impossible."));
    req.onblocked = () => reject(new Error("La base locale est bloquée par un autre onglet. Fermez les autres onglets de l'application."));
  });
  return dbPromise;
}

function reqP(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}
function txDone(tx) {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error || new Error('Écriture impossible'));
    tx.onabort = () => rej(tx.error || new Error('Écriture annulée (espace de stockage insuffisant ?)'));
  });
}

function report(err) {
  globalThis.dispatchEvent?.(new CustomEvent('storage-error', { detail: err }));
  throw err;
}

export async function getAll(store) {
  try { const db = await openDB(); return await reqP(db.transaction(store).objectStore(store).getAll()); }
  catch (e) { return report(e); }
}

export async function getByProfile(store, profileId) {
  try {
    const db = await openDB();
    return await reqP(db.transaction(store).objectStore(store).index('profileId').getAll(profileId));
  } catch (e) { return report(e); }
}

export async function put(store, obj) {
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(obj);
    await txDone(tx);
    return obj;
  } catch (e) { return report(e); }
}

export async function del(store, id) {
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    await txDone(tx);
  } catch (e) { return report(e); }
}

export async function getMeta(key, fallback = null) {
  try {
    const db = await openDB();
    const r = await reqP(db.transaction('meta').objectStore('meta').get(key));
    return r ? r.value : fallback;
  } catch (e) { return report(e); }
}

export async function setMeta(key, value) { return put('meta', { key, value }); }

// Supprime un profil et uniquement ses données.
export async function deleteProfileCascade(profileId) {
  try {
    const db = await openDB();
    const tx = db.transaction(['profiles', ...PROFILE_STORES], 'readwrite');
    tx.objectStore('profiles').delete(profileId);
    for (const name of PROFILE_STORES) {
      const idx = tx.objectStore(name).index('profileId');
      const keys = await reqP(idx.getAllKeys(profileId));
      for (const k of keys) tx.objectStore(name).delete(k);
    }
    await txDone(tx);
  } catch (e) { return report(e); }
}

// Écrit un lot de données en une seule transaction (import).
// mode 'restore' : efface tous les profils et données avant d'écrire.
export async function writeBundle(bundle, { clearFirst = false } = {}) {
  try {
    const db = await openDB();
    const tx = db.transaction(['profiles', ...PROFILE_STORES], 'readwrite');
    if (clearFirst) for (const name of ['profiles', ...PROFILE_STORES]) tx.objectStore(name).clear();
    for (const p of bundle.profiles || []) tx.objectStore('profiles').put(p);
    for (const name of PROFILE_STORES) for (const r of bundle[name] || []) tx.objectStore(name).put(r);
    await txDone(tx);
  } catch (e) { return report(e); }
}

export async function wipeAll() {
  try {
    const db = await openDB();
    const tx = db.transaction(['meta', 'profiles', ...PROFILE_STORES], 'readwrite');
    for (const name of ['meta', 'profiles', ...PROFILE_STORES]) tx.objectStore(name).clear();
    await txDone(tx);
  } catch (e) { return report(e); }
}

export async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch { /* ignoré */ }
  return false;
}

export async function storageEstimate() {
  try { if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate(); } catch { /* ignoré */ }
  return null;
}
