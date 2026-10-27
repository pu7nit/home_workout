// Global application state and the only place CRUD touches IndexedDB.
import {
  seedDatabase, readDatabase, ensureProfile, newProfile,
  dbPut, dbDelete, STORES, resetDatabase
} from './db.js';
import { todayISO } from './utils.js';

export const state = {
  ready: false,
  fatalError: null,
  profile: null,
  exercises: [],
  workouts: [],
  routines: [],
  plans: [],
  weekly: { id: 'weekly', days: {} },
  weights: [],
  measurements: [],
  photos: [],
  route: 'home',
  lastSavedAt: null,
  ui: {
    library: { q: '', muscle: 'all', equipment: 'all', favOnly: false },
    calendar: { mode: 'month', anchor: todayISO(), selected: todayISO() },
    strength: { side: 'front', muscle: 'chest' },
    progress: { tab: 'weight', range: 90, measure: 'waist', exerciseId: '', photoA: '', photoB: '' },
    planner: { focusRoutine: null, draft: null },
    settings: { section: 'profile' }
  }
};

export const ROUTES = ['home', 'workouts', 'library', 'calendar', 'strength', 'progress', 'planner', 'settings'];

const PREF_KEY = 'cozy-strength-prefs';

const PREF_DEFAULTS = {
  theme: 'system',
  weekStart: 1,
  restDefault: 90,
  autoRest: false,
  timerSound: true,
  timerVibrate: true,
  onboardSkipped: false,
  calendarMode: 'month',
  progressTab: 'weight',
  overloadDismissed: {}
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return structuredClone(PREF_DEFAULTS);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(PREF_DEFAULTS), ...parsed };
  } catch {
    return structuredClone(PREF_DEFAULTS);
  }
}

let prefsCache = readPrefs();

export const prefs = {
  all() { return { ...prefsCache }; },
  get(key) { return prefsCache[key]; },
  set(key, value) {
    prefsCache[key] = value;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefsCache));
    } catch {
      /* preferences are non-critical */
    }
    return value;
  },
  update(patch) {
    prefsCache = { ...prefsCache, ...patch };
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefsCache));
    } catch {
      /* preferences are non-critical */
    }
    return prefsCache;
  },
  reset() {
    prefsCache = structuredClone(PREF_DEFAULTS);
    try { localStorage.removeItem(PREF_KEY); } catch { /* ignore */ }
  }
};

function sortWorkouts(list) {
  return [...list].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}
function sortPlans(list) {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}
function sortWeights(list) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
}
function sortMeasurements(list) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}
function sortPhotos(list) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
}

export async function initStore() {
  try {
    await seedDatabase();
    const data = await readDatabase();
    Object.assign(state, data);
    if (!state.profile) {
      state.profile = newProfile();
      await dbPut(STORES.profile, state.profile);
    }
    state.route = 'home';
    state.ready = true;
    state.fatalError = null;
  } catch (error) {
    console.error('Could not load the local database', error);
    state.fatalError = error;
    state.ready = false;
  }
  return state;
}

export async function refreshStore() {
  const data = await readDatabase();
  Object.assign(state, data);
  if (!state.profile) state.profile = await ensureProfile();
  return state;
}

export function exerciseById(id) {
  return state.exercises.find((e) => e.id === id) || null;
}
export function routineById(id) {
  return state.routines.find((r) => r.id === id) || null;
}
export function activeWorkout() {
  return state.workouts.find((w) => w.status === 'in-progress') || null;
}
export function workoutById(id) {
  return state.workouts.find((w) => w.id === id) || null;
}
export function photoById(id) {
  return state.photos.find((p) => p.id === id) || null;
}

export async function saveProfile(patch) {
  const profile = { ...state.profile, ...patch, id: 'me', updatedAt: Date.now() };
  await dbPut(STORES.profile, profile);
  state.profile = profile;
  return profile;
}

export async function saveExercise(exercise) {
  const doc = {
    ...exercise,
    id: exercise.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isCustom: exercise.isCustom !== false,
    updatedAt: Date.now()
  };
  await dbPut(STORES.exercises, doc);
  const idx = state.exercises.findIndex((e) => e.id === doc.id);
  if (idx >= 0) state.exercises[idx] = doc;
  else state.exercises.push(doc);
  state.exercises.sort((a, b) => a.name.localeCompare(b.name));
  return doc;
}

export async function toggleFavourite(id) {
  const exercise = exerciseById(id);
  if (!exercise) return;
  await saveExercise({ ...exercise, favourite: !exercise.favourite, isCustom: exercise.isCustom });
}

export async function deleteExercise(id) {
  const exercise = exerciseById(id);
  if (!exercise) return;
  if (!exercise.isCustom) throw new Error('Built-in exercises stay in the library, but you can favourite or hide them from your routine plans.');
  await dbDelete(STORES.exercises, id);
  state.exercises = state.exercises.filter((e) => e.id !== id);
}

export async function saveWorkout(workout) {
  const doc = { ...workout, updatedAt: Date.now() };
  await dbPut(STORES.workouts, doc);
  state.workouts = sortWorkouts(state.workouts.filter((w) => w.id !== doc.id).concat(doc));
  state.lastSavedAt = Date.now();
  return doc;
}

export async function deleteWorkoutRecord(id) {
  await dbDelete(STORES.workouts, id);
  state.workouts = state.workouts.filter((w) => w.id !== id);
  // If a planned session pointed at this workout, make the session plannable again.
  const linkedPlans = state.plans.filter((p) => p.workoutId === id);
  for (const plan of linkedPlans) {
    const next = { ...plan, status: 'planned', workoutId: null };
    await dbPut(STORES.plans, next);
    const idx = state.plans.findIndex((p) => p.id === next.id);
    if (idx >= 0) state.plans[idx] = next;
  }
  state.plans = sortPlans(state.plans);
}

export async function saveRoutine(routine) {
  const doc = {
    ...routine,
    id: routine.id || `routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    updatedAt: Date.now(),
    createdAt: routine.createdAt || Date.now()
  };
  await dbPut(STORES.routines, doc);
  const idx = state.routines.findIndex((r) => r.id === doc.id);
  if (idx >= 0) state.routines[idx] = doc;
  else state.routines.push(doc);
  return doc;
}

export async function deleteRoutine(id) {
  await dbDelete(STORES.routines, id);
  state.routines = state.routines.filter((r) => r.id !== id);
  // Keep schedule integrity: remove routine references, leave the days unscheduled.
  const days = { ...state.weekly.days };
  let changed = false;
  for (const [day, entry] of Object.entries(days)) {
    if (entry?.routineId === id) {
      days[day] = { type: 'none' };
      changed = true;
    }
  }
  if (changed) await saveWeekly({ ...state.weekly, days });
}

export async function savePlan(plan) {
  const doc = { ...plan, updatedAt: Date.now() };
  await dbPut(STORES.plans, doc);
  state.plans = sortPlans(state.plans.filter((p) => p.id !== doc.id).concat(doc));
  return doc;
}

export async function deletePlan(id) {
  await dbDelete(STORES.plans, id);
  state.plans = state.plans.filter((p) => p.id !== id);
}

export async function saveWeekly(weekly) {
  const doc = { ...weekly, id: 'weekly', updatedAt: Date.now() };
  await dbPut(STORES.weekly, doc);
  state.weekly = doc;
  return doc;
}

export async function saveWeight(entry) {
  const doc = { ...entry, id: entry.id || `weight-${Date.now()}`, createdAt: entry.createdAt || Date.now() };
  await dbPut(STORES.weights, doc);
  state.weights = sortWeights(state.weights.filter((w) => w.id !== doc.id).concat(doc));
  return doc;
}

export async function deleteWeight(id) {
  await dbDelete(STORES.weights, id);
  state.weights = state.weights.filter((w) => w.id !== id);
}

export async function saveMeasurement(entry) {
  const doc = { ...entry, id: entry.id || `measure-${Date.now()}` };
  await dbPut(STORES.measurements, doc);
  state.measurements = sortMeasurements(state.measurements.filter((m) => m.id !== doc.id).concat(doc));
  return doc;
}

export async function deleteMeasurement(id) {
  await dbDelete(STORES.measurements, id);
  state.measurements = state.measurements.filter((m) => m.id !== id);
}

export async function savePhoto(record) {
  await dbPut(STORES.photos, record);
  state.photos = sortPhotos(state.photos.filter((p) => p.id !== record.id).concat(record));
  return record;
}

export async function deletePhoto(id) {
  await dbDelete(STORES.photos, id);
  state.photos = state.photos.filter((p) => p.id !== id);
}

export async function clearAllPersonalData() {
  await resetDatabase();
  const data = await readDatabase();
  Object.assign(state, data);
  if (!state.profile) {
    state.profile = newProfile();
    await dbPut(STORES.profile, state.profile);
  }
  prefs.reset();
  state.ui = {
    library: { q: '', muscle: 'all', equipment: 'all', favOnly: false },
    calendar: { mode: 'month', anchor: todayISO(), selected: todayISO() },
    strength: { side: 'front', muscle: 'chest' },
    progress: { tab: 'weight', range: 90, measure: 'waist', exerciseId: '', photoA: '', photoB: '' },
    planner: { focusRoutine: null },
    settings: { section: 'profile' }
  };
  state.route = 'home';
}

export function latestWeight() {
  if (!state.weights.length) return null;
  return state.weights[0];
}
