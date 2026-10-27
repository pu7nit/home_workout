// IndexedDB persistence. Source records are authoritative; every derived
// stat in the app is recomputed from these stores.

import { EXERCISES, ROUTINE_SEEDS } from './data/exercises.js';
import { DEFAULT_WEEKLY } from './data/muscles.js';
import { uid, todayISO } from './utils.js';

const DB_NAME = 'cozy-strength';
const DB_VERSION = 1;

export const STORES = {
  profile: 'profile',
  exercises: 'exercises',
  workouts: 'workouts',
  routines: 'routines',
  plans: 'plans',
  weekly: 'weekly',
  weights: 'weights',
  measurements: 'measurements',
  photos: 'photos',
  meta: 'meta'
};

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support IndexedDB, so data cannot be saved locally.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const make = (name, indexes = []) => {
        if (db.objectStoreNames.contains(name)) return;
        const store = db.createObjectStore(name, { keyPath: 'id' });
        indexes.forEach((idx) => store.createIndex(idx, idx, { unique: false }));
      };
      make(STORES.profile);
      make(STORES.exercises, ['name']);
      make(STORES.workouts, ['date']);
      make(STORES.routines);
      make(STORES.plans, ['date']);
      make(STORES.weekly);
      make(STORES.weights, ['date']);
      make(STORES.measurements, ['date']);
      make(STORES.photos, ['date']);
      make(STORES.meta);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('Could not open the local database.'));
  });
  return dbPromise;
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('The local database write failed.'));
    tx.onabort = () => reject(tx.error || new Error('The local database transaction was aborted.'));
  });
}

export async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await txDone(tx);
  return value;
}

export async function dbDelete(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await txDone(tx);
}

export async function dbClear(store) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  await txDone(tx);
}

async function seedExercises() {
  const existing = await dbGetAll(STORES.exercises);
  const known = new Set(existing.map((e) => e.id));
  for (const exercise of EXERCISES) {
    if (!known.has(exercise.id)) {
      await dbPut(STORES.exercises, {
        ...exercise,
        favourite: false,
        seeded: true,
        createdAt: Date.now()
      });
    }
  }
}

async function seedRoutines() {
  const meta = await dbGet(STORES.meta, 'routineSeed');
  if (meta) return;
  const existing = new Set((await dbGetAll(STORES.routines)).map((r) => r.id));
  for (const [index, routine] of ROUTINE_SEEDS.entries()) {
    if (existing.has(routine.id)) continue;
    await dbPut(STORES.routines, {
      ...routine,
      order: index * 10,
      createdAt: Date.now() + index,
      updatedAt: Date.now()
    });
  }
  await dbPut(STORES.meta, { id: 'routineSeed', seededAt: Date.now() });
}

async function seedWeekly() {
  const weekly = await dbGet(STORES.weekly, 'weekly');
  if (!weekly) {
    await dbPut(STORES.weekly, {
      id: 'weekly',
      days: structuredClone(DEFAULT_WEEKLY.days),
      updatedAt: Date.now()
    });
  }
}

export async function seedDatabase() {
  await openDB();
  await seedExercises();
  await seedRoutines();
  await seedWeekly();
  await dbPut(STORES.meta, { id: 'installed', at: Date.now(), app: 'cozy-strength', version: DB_VERSION });
}

export async function readDatabase() {
  const [
    profile, exercises, workouts, routines, plans, weekly,
    weights, measurements, photos
  ] = await Promise.all([
    dbGet(STORES.profile, 'me'),
    dbGetAll(STORES.exercises),
    dbGetAll(STORES.workouts),
    dbGetAll(STORES.routines),
    dbGetAll(STORES.plans),
    dbGet(STORES.weekly, 'weekly'),
    dbGetAll(STORES.weights),
    dbGetAll(STORES.measurements),
    dbGetAll(STORES.photos)
  ]);
  return {
    profile,
    exercises: exercises.sort((a, b) => a.name.localeCompare(b.name)),
    workouts: workouts.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
    routines: routines.sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0)),
    plans: plans.sort((a, b) => a.date.localeCompare(b.date)),
    weekly: weekly || { id: 'weekly', days: structuredClone(DEFAULT_WEEKLY.days) },
    weights: weights.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)),
    measurements: measurements.sort((a, b) => b.date.localeCompare(a.date)),
    photos: photos.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0))
  };
}

export async function resetDatabase() {
  await openDB();
  for (const store of Object.values(STORES)) {
    await dbClear(store);
  }
  await seedDatabase();
}

export async function deletePhotoBlob(id) {
  await dbDelete(STORES.photos, id);
}

export function newProfile(overrides = {}) {
  return {
    id: 'me',
    name: '',
    unitSystem: 'metric',
    heightCm: null,
    targetWeightKg: null,
    dob: '',
    experience: 'beginner',
    goals: ['strength'],
    equipment: ['bodyweight', 'dumbbells'],
    weeklyTarget: 3,
    trainingDays: [1, 3, 5],
    onboarded: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  };
}

export async function ensureProfile(overrides = {}) {
  let profile = await dbGet(STORES.profile, 'me');
  if (!profile) {
    profile = newProfile(overrides);
    await dbPut(STORES.profile, profile);
  }
  return profile;
}

export async function savePhotoRecord(record) {
  const doc = {
    id: record.id || uid('photo'),
    date: record.date || todayISO(),
    category: record.category || 'Progress',
    note: record.note || '',
    mime: record.mime || 'image/jpeg',
    blob: record.blob,
    thumb: record.thumb || '',
    width: record.width || null,
    height: record.height || null,
    createdAt: record.createdAt || Date.now()
  };
  await dbPut(STORES.photos, doc);
  return doc;
}

export { DB_NAME, DB_VERSION };
