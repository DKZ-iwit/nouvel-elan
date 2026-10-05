// État de l'application en mémoire, synchronisé avec IndexedDB.
import * as db from './db.js';
import { LIBRARY, LIBRARY_BY_ID } from './data/exercises.js';
import { buildProgram } from './engine/program.js';
import { DEFAULT_SETTINGS } from './config.js';
import { nowISO, uid } from './util.js';

export const S = {
  profiles: [],
  profile: null,
  data: { sessions: [], activities: [], measurements: [], customExercises: [], templates: [] },
  settings: { ...DEFAULT_SETTINGS },
  lastExport: null,
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(); }

export async function init() {
  await db.openDB();
  S.settings = { ...DEFAULT_SETTINGS, ...(await db.getMeta('settings', {})) };
  S.lastExport = await db.getMeta('lastExport', null);
  S.profiles = (await db.getAll('profiles')).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const activeId = await db.getMeta('activeProfileId', null);
  const p = S.profiles.find(x => x.id === activeId) || S.profiles[0] || null;
  if (p) await loadProfile(p.id); else S.profile = null;
}

export async function loadProfile(id) {
  S.profile = S.profiles.find(p => p.id === id) || null;
  if (!S.profile) return;
  for (const store of db.PROFILE_STORES) S.data[store] = await db.getByProfile(store, id);
  await db.setMeta('activeProfileId', id);
  emit();
}

export async function reloadAll() {
  S.profiles = (await db.getAll('profiles')).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const keep = S.profile && S.profiles.find(p => p.id === S.profile.id);
  if (keep) await loadProfile(keep.id);
  else if (S.profiles[0]) await loadProfile(S.profiles[0].id);
  else { S.profile = null; for (const k of db.PROFILE_STORES) S.data[k] = []; await db.setMeta('activeProfileId', null); }
  emit();
}

export async function saveSettings(patch) {
  S.settings = { ...S.settings, ...patch };
  await db.setMeta('settings', S.settings);
  emit();
}

export async function markExported() {
  S.lastExport = nowISO();
  await db.setMeta('lastExport', S.lastExport);
}

// ---------- Exercices (bibliothèque + exercices personnalisés du profil) ----------
export function getEx(id) {
  return LIBRARY_BY_ID[id] || S.data.customExercises.find(e => e.id === id) || null;
}
export function allExercises() { return [...LIBRARY, ...S.data.customExercises]; }

// ---------- Profils ----------
export function newProfile(fields = {}) {
  return {
    id: uid(), name: '', avatar: '🏋️', color: '#2449C9', birthYear: null, heightCm: null,
    goal: null, secondaryGoals: [], goalNote: '', weightTargets: [], level: null,
    gymPerWeek: null, outdoorMinutesTarget: null, durationMin: null,
    equipment: [], favorites: [], excluded: [], increments: {}, replaceRequests: [], slotPins: {},
    cardioPrefs: [], cardioProgressive: [], attention: [], references: [], program: null,
    createdAt: nowISO(), updatedAt: nowISO(), ...fields,
  };
}

export async function saveProfile(p, { rebuild = true } = {}) {
  p.updatedAt = nowISO();
  if (rebuild) {
    const lib = allExercisesFor(p);
    const prog = buildProgram(p, p.id === S.profile?.id ? S.data.sessions : [], lib, p.program && p.program.status === 'ok' ? p.program : null);
    if (prog.status === 'ok') applyPins(p, prog, lib);
    p.program = prog;
  }
  await db.put('profiles', p);
  const i = S.profiles.findIndex(x => x.id === p.id);
  if (i >= 0) S.profiles[i] = p; else S.profiles.push(p);
  if (S.profile && S.profile.id === p.id) S.profile = p;
  emit();
  return p;
}

function allExercisesFor(p) {
  return p.id === S.profile?.id ? allExercises() : LIBRARY;
}

// Exercices épinglés manuellement sur un créneau du programme
function applyPins(p, prog, lib) {
  const pins = p.slotPins || {};
  for (const d of prog.days) for (const sl of d.slots) {
    const pin = pins[sl.key];
    if (pin && lib.some(e => e.id === pin) && !(p.excluded || []).includes(pin)) { sl.exerciseId = pin; sl.reason = 'choisi par toi'; }
  }
}

export async function deleteProfile(id) {
  await db.deleteProfileCascade(id);
  await reloadAll();
}

// ---------- Enregistrements du profil actif ----------
export async function saveRecord(store, rec) {
  rec.profileId = rec.profileId || S.profile.id;
  rec.updatedAt = nowISO();
  if (!rec.createdAt) rec.createdAt = rec.updatedAt;
  await db.put(store, rec);
  if (rec.profileId === S.profile.id) {
    const arr = S.data[store];
    const i = arr.findIndex(x => x.id === rec.id);
    if (i >= 0) arr[i] = rec; else arr.push(rec);
  }
  emit();
  return rec;
}

export async function deleteRecord(store, id) {
  await db.del(store, id);
  S.data[store] = S.data[store].filter(x => x.id !== id);
  emit();
}

export function draftSession() {
  return S.data.sessions.find(s => s.status === 'draft') || null;
}

export async function deviceSnapshot() {
  const out = { profiles: await db.getAll('profiles') };
  for (const st of db.PROFILE_STORES) out[st] = await db.getAll(st);
  return out;
}
