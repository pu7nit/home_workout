// Derived training analytics. Everything here is recomputed from completed
// workouts and explicit plan records; nothing is cached as a source of truth.

import { state, exerciseById, routineById, prefs } from './store.js';
import {
  MUSCLES, MUSCLE_BY_ID, SCORING, BENCHMARK_PATTERNS, TIERS, tierForScore,
  TRACKING_LABELS
} from './data/muscles.js';
import {
  addDays, startOfWeekISO, todayISO, diffDays, parseISO,
  roundTo, clamp
} from './utils.js';
import { uid } from './utils.js';

export const MEASUREMENT_KEYS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'arms', label: 'Arms' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'calves', label: 'Calves' },
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' }
];

export const MEASUREMENT_LABELS = Object.fromEntries(MEASUREMENT_KEYS.map((m) => [m.key, m.label]));

export function trackingFlags(tracking) {
  return {
    weight: tracking === 'reps-weight' || tracking === 'weight-duration',
    reps: tracking === 'reps-weight' || tracking === 'reps',
    duration: tracking === 'duration' || tracking === 'weight-duration'
  };
}

export function trackingLabel(tracking) { return TRACKING_LABELS[tracking] || 'Reps'; }

export function latestBodyWeight() {
  return state.weights[0] || null;
}

export function bodyWeightKg() {
  const latest = latestBodyWeight();
  return latest && Number.isFinite(Number(latest.weightKg)) ? Number(latest.weightKg) : null;
}

export function completedWorkouts() {
  return state.workouts.filter((w) => w.status === 'completed');
}

export function completedSetsOfExercise(workout, exerciseId) {
  const ex = workout.exercises?.find((e) => e.exerciseId === exerciseId) || null;
  if (!ex) return [];
  return (ex.sets || []).filter((s) => s.completed && s.type !== 'warmup');
}

export function workingSets(workout) {
  const rows = [];
  for (const wex of workout.exercises || []) {
    for (const set of wex.sets || []) {
      if (set.completed && set.type !== 'warmup') rows.push({ wex, set });
    }
  }
  return rows;
}

export function estimate1RM(weightKg, reps) {
  if (!Number.isFinite(Number(weightKg)) || !Number.isFinite(Number(reps))) return null;
  if (Number(weightKg) <= 0 || Number(reps) <= 0) return null;
  return Number(weightKg) * (1 + Number(reps) / 30);
}

function effectiveLoad(set, wex) {
  let load = Number(set.weightKg) || 0;
  if (wex.bodyweightLoad) {
    const bw = bodyWeightKg();
    if (!bw) return null;
    load += bw;
  }
  return load > 0 ? load : null;
}

export function estimateSet1RM(wex, set) {
  if (!trackingFlags(wex.tracking).weight) return null;
  const load = effectiveLoad(set, wex);
  if (!load) return null;
  return estimate1RM(load, set.reps);
}

// ---------- per-exercise records & history ----------

export function exerciseSessions(exerciseId, { excludeWorkoutId = null } = {}) {
  return completedWorkouts()
    .filter((w) => w.id !== excludeWorkoutId)
    .map((workout) => {
      const wex = (workout.exercises || []).find((e) => e.exerciseId === exerciseId);
      if (!wex) return null;
      const sets = (wex.sets || []).filter((s) => s.completed && s.type !== 'warmup');
      if (!sets.length) return null;
      return { workout, wex, sets };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const da = a.workout.date || '';
      const db = b.workout.date || '';
      if (da !== db) return da.localeCompare(db);
      return (a.workout.startedAt || 0) - (b.workout.startedAt || 0);
    });
}

export function lastExerciseSession(exerciseId, options = {}) {
  const sessions = exerciseSessions(exerciseId, options);
  return sessions[sessions.length - 1] || null;
}

export function exerciseRecords(exerciseId, { excludeWorkoutId = null } = {}) {
  const sessions = exerciseSessions(exerciseId, { excludeWorkoutId });
  let bestWeight = null;
  let bestReps = null;
  let bestDuration = null;
  let bestE1RM = null;
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  const dateOf = (workout) => workout.date;

  for (const { workout, wex, sets } of sessions) {
    for (const set of sets) {
      totalSets += 1;
      const reps = Number(set.reps) || 0;
      const weight = Number(set.weightKg) || 0;
      const duration = Number(set.durationSec) || 0;
      totalReps += reps;
      totalVolume += weight * reps;
      if (weight > 0 && (!bestWeight || weight > bestWeight.value)) {
        bestWeight = { value: weight, reps, date: dateOf(workout), workoutId: workout.id };
      }
      if (reps > 0 && (!bestReps || reps > bestReps.value)) {
        bestReps = { value: reps, weightKg: weight, date: dateOf(workout), workoutId: workout.id };
      }
      if (duration > 0 && (!bestDuration || duration > bestDuration.value)) {
        bestDuration = { value: duration, date: dateOf(workout), workoutId: workout.id };
      }
      const oneRm = estimateSet1RM(wex, set);
      if (oneRm && (!bestE1RM || oneRm > bestE1RM.value)) {
        bestE1RM = {
          value: roundTo(oneRm, 1), weightKg: weight, reps, date: dateOf(workout),
          workoutId: workout.id, bodyweightLoad: Boolean(wex.bodyweightLoad)
        };
      }
    }
  }
  return {
    sessions: sessions.length,
    totalSets,
    totalReps,
    totalVolume,
    bestWeight,
    bestReps,
    bestDuration,
    bestE1RM,
    lastSession: sessions[sessions.length - 1] || null
  };
}

export function exerciseLastPerformance(exerciseId) {
  const last = lastExerciseSession(exerciseId);
  if (!last) return null;
  return {
    date: last.workout.date,
    workoutName: last.workout.name,
    sets: last.sets.map((s) => ({
      reps: s.reps ?? null,
      weightKg: s.weightKg ?? null,
      durationSec: s.durationSec ?? null,
      type: s.type || 'working'
    })),
    wex: last.wex
  };
}

export function performanceLine(exercise) {
  const last = exerciseLastPerformance(exercise.id);
  if (!last) return null;
  const flags = trackingFlags(exercise.tracking);
  const parts = last.sets.map((set) => {
    if (flags.duration) return `${Math.round(set.durationSec || 0)}s${flags.weight && set.weightKg ? ` · ${roundTo(set.weightKg, 1)} kg` : ''}`;
    if (flags.weight) return `${set.reps || 0} × ${set.weightKg ? `${roundTo(set.weightKg, 1)} kg` : 'bodyweight'}`;
    return `${set.reps || 0} reps`;
  });
  return { date: last.date, sets: parts, last };
}

// ---------- muscle scoring ----------

function weekKeys(count, from = todayISO()) {
  const keys = [];
  let start = startOfWeekISO(from, 1);
  for (let i = 0; i < count; i += 1) {
    keys.unshift(start);
    start = addDays(start, -7);
  }
  return keys;
}

export function muscleStats() {
  const result = {};
  const today = todayISO();
  const now = Date.now();
  const currentWeek = startOfWeekISO(today, 1);
  const historyWeeks = weekKeys(12, today);
  const bw = bodyWeightKg();

  for (const muscle of MUSCLES) {
    result[muscle.id] = {
      muscleId: muscle.id,
      label: muscle.label,
      enough: false,
      score: null,
      tier: null,
      totalSets: 0,
      rawSets: 0,
      reps: 0,
      reps8: 0,
      sets28: 0,
      sessions28: 0,
      volume: 0,
      sessions: 0,
      primarySets: 0,
      secondarySets: 0,
      loadedSets: 0,
      loadRatioSum: 0,
      sessionDates: new Set(),
      weeklySets: new Map(historyWeeks.map((w) => [w, 0])),
      exercises: new Map(),
      recentSets72h: 0,
      lastDate: null,
      lastTrainedAt: null,
      breakdown: { volume: 0, consistency: 0, frequency: 0, progression: 0, load: 0 },
      recovery: { status: 'none', label: 'Not enough data', note: 'Complete a few sessions to see an estimate.' },
      prs: [],
      lastSets: 0
    };
  }

  for (const workout of completedWorkouts()) {
    for (const wex of workout.exercises || []) {
      const sets = (wex.sets || []).filter((s) => s.completed && s.type !== 'warmup');
      if (!sets.length) continue;
      const primary = Array.isArray(wex.primary) ? wex.primary : [];
      const secondary = Array.isArray(wex.secondary) ? wex.secondary : [];
      const factors = new Map();
      primary.forEach((m) => { if (MUSCLE_BY_ID[m]) factors.set(m, 1); });
      secondary.forEach((m) => {
        if (MUSCLE_BY_ID[m] && !primary.includes(m)) factors.set(m, SCORING.secondaryFactor);
      });
      if (!factors.size) continue;

      const trainedAt = workout.finishedAt || (parseISO(workout.date).getTime() + 12 * 3600000);
      const week = startOfWeekISO(workout.date, 1);
      const isRecent72 = now - trainedAt <= 72 * 3600000;
      const isRecent28 = diffDays(workout.date, today) <= 27;
      const isRecent56 = diffDays(workout.date, today) <= 55;

      for (const [muscleId, factor] of factors.entries()) {
        const m = result[muscleId];
        const rawSets = sets.length;
        m.sessions += 1;
        m.sessionDates.add(workout.date);
        m.totalSets += rawSets * factor;
        m.rawSets += rawSets;
        if (factor === 1) m.primarySets += rawSets;
        else m.secondarySets += rawSets;
        if (isRecent28) m.sets28 += rawSets * factor;
        if (!m.lastDate || workout.date > m.lastDate) {
          m.lastDate = workout.date;
          m.lastTrainedAt = trainedAt;
        }
        if (isRecent72) m.recentSets72h += rawSets * factor;
        if (m.weeklySets.has(week)) m.weeklySets.set(week, m.weeklySets.get(week) + rawSets * factor);

        const entry = m.exercises.get(wex.exerciseId) || { id: wex.exerciseId, name: wex.name, sets: 0, lastDate: workout.date };
        entry.sets += rawSets * factor;
        if (workout.date > entry.lastDate) entry.lastDate = workout.date;
        m.exercises.set(wex.exerciseId, entry);

        for (const set of sets) {
          const reps = Number(set.reps) || 0;
          const weight = Number(set.weightKg) || 0;
          m.reps += reps * factor;
          if (isRecent56) m.reps8 += reps * factor;
          m.volume += weight * reps * factor;
          if (weight > 0) {
            m.loadedSets += factor;
            m.loadRatioSum += (weight / Math.max(bw || 1, 1)) * factor;
          }
        }
      }
    }
  }

  for (const muscle of MUSCLES) {
    const m = result[muscle.id];
    const sets8 = historyWeeks
      .filter((w) => diffDays(w, currentWeek) < 56)
      .reduce((acc, w) => acc + (m.weeklySets.get(w) || 0), 0);
    const setScore = Math.min(1, sets8 / SCORING.volumeTargetSets);
    const repScore = Math.min(1, m.reps8 / (SCORING.volumeTargetSets * 8));
    const volumeScore = (setScore * 0.7 + repScore * 0.3) * SCORING.weights.volume;
    const trainedWeeks = historyWeeks.filter((w) => (m.weeklySets.get(w) || 0) > 0).length;
    const consistencyScore = (trainedWeeks / SCORING.windowWeeks) * SCORING.weights.consistency;
    const recentSessions = [...m.sessionDates].filter((d) => diffDays(d, today) <= 27).length;
    m.sessions28 = recentSessions;
    const frequencyScore = Math.min(1, recentSessions / SCORING.frequencyTargetSessions) * SCORING.weights.frequency;

    const recentWindow = historyWeeks.filter((w) => diffDays(w, currentWeek) < 14);
    const priorWindow = historyWeeks.filter((w) => diffDays(w, currentWeek) >= 14 && diffDays(w, currentWeek) < 42);
    const recentSets = recentWindow.reduce((acc, w) => acc + (m.weeklySets.get(w) || 0), 0);
    const priorSets = priorWindow.reduce((acc, w) => acc + (m.weeklySets.get(w) || 0), 0);
    const recentPerWeek = recentSets / Math.max(recentWindow.length, 1);
    const priorPerWeek = priorSets / Math.max(priorWindow.length, 1);
    let progressionScore;
    if (priorPerWeek === 0 && recentPerWeek === 0) progressionScore = 0;
    else if (priorPerWeek === 0) progressionScore = SCORING.weights.progression * 0.55;
    else {
      const ratio = recentPerWeek / priorPerWeek;
      progressionScore = ratio >= 1.08
        ? SCORING.weights.progression
        : ratio >= 0.85
          ? SCORING.weights.progression * 0.66
          : SCORING.weights.progression * 0.3;
    }
    const loadScore = bw && m.loadedSets > 0
      ? Math.min(1, (m.loadRatioSum / m.loadedSets) / SCORING.loadRatioTarget) * SCORING.weights.load
      : 0;

    const score = clamp(volumeScore + consistencyScore + frequencyScore + progressionScore + loadScore, 0, 100);
    m.breakdown = {
      volume: roundTo(volumeScore, 1),
      consistency: roundTo(consistencyScore, 1),
      frequency: roundTo(frequencyScore, 1),
      progression: roundTo(progressionScore, 1),
      load: roundTo(loadScore, 1)
    };
    m.enough = m.sessions >= SCORING.sufficient.sessions && m.totalSets >= SCORING.sufficient.effectiveSets;
    m.score = m.enough ? roundTo(score, 0) : null;
    m.tier = m.enough ? tierForScore(score) : null;
    m.history = historyWeeks.map((w) => ({ weekStart: w, sets: roundTo(m.weeklySets.get(w) || 0, 1) }));
    m.lastSets = [...m.sessionDates].filter((d) => d === m.lastDate).length;
    m.topExercises = [...m.exercises.values()]
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 6);
    m.prs = m.topExercises.map((entry) => {
      const rec = exerciseRecords(entry.id);
      return { exerciseId: entry.id, name: entry.name, records: rec };
    });
    m.recovery = recoveryFor(m);
    delete m.weeklySets;
    delete m.exercises;
    delete m.sessionDates;
    delete m.recentSets72h;
  }
  return result;
}

function recoveryFor(m) {
  if (!m.lastDate) {
    return { status: 'none', label: 'Not enough data', note: 'Log a session to see a recovery estimate.' };
  }
  const hours = Math.max(0, (Date.now() - (m.lastTrainedAt || Date.now())) / 3600000);
  const cfg = SCORING.recovery;
  if (hours < cfg.recentlyTrainedHours) {
    return {
      status: 'recent',
      label: 'Recently trained',
      note: `Trained ${Math.max(1, Math.round(hours))}h ago. Give this muscle some easy time before loading it heavily again.`
    };
  }
  if (hours < cfg.inProgressHours) {
    return { status: 'recovering', label: 'Recovery in progress', note: 'Estimated recovery is still underway. Light movement is usually fine.' };
  }
  if (hours < cfg.highVolumeHours && m.recentSets72h >= cfg.highVolumeSets) {
    return { status: 'recovering', label: 'Recovery in progress', note: 'A high-volume session landed recently; an extra easy day may feel better.' };
  }
  return {
    status: 'ready',
    label: 'Likely ready for another session',
    note: 'A gentle estimate based on time since training and recent volume, not a physiological measurement.'
  };
}

export function muscleStatList() {
  const stats = muscleStats();
  return MUSCLES.map((m) => stats[m.id]);
}

export function frequentlyTrainedMuscles(limit = 4) {
  return muscleStatList()
    .filter((m) => m.sessions > 0)
    .sort((a, b) => b.totalSets - a.totalSets)
    .slice(0, limit);
}

export function strengthBenchmark(exerciseId) {
  const exercise = exerciseById(exerciseId);
  if (!exercise) return null;
  const records = exerciseRecords(exerciseId);
  const pattern = BENCHMARK_PATTERNS[exercise.pattern];
  const bw = bodyWeightKg();
  if (!pattern || !records.bestE1RM || !bw) return null;
  const ratio = records.bestE1RM.value / bw;
  const labels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite', 'World Class'];
  let idx = 0;
  pattern.ratios.forEach((threshold, i) => { if (ratio >= threshold) idx = i + 1; });
  return {
    ratio: roundTo(ratio, 2),
    label: labels[Math.min(idx, labels.length - 1)],
    tier: TIERS[Math.min(idx, TIERS.length - 1)],
    e1rm: records.bestE1RM,
    patternLabel: pattern.label,
    note: 'A motivational estimate from your best estimated 1RM relative to body weight, not a validated strength standard.'
  };
}

// ---------- streaks, weeks and plans ----------

export function workoutDatesSet() {
  return new Set(completedWorkouts().map((w) => w.date));
}

export function computeStreaks() {
  const dates = workoutDatesSet();
  const currentWeek = startOfWeekISO(todayISO(), 1);
  const hasWeek = (weekStart) => {
    for (let i = 0; i < 7; i += 1) if (dates.has(addDays(weekStart, i))) return true;
    return false;
  };
  let current = 0;
  let cursor = currentWeek;
  if (!hasWeek(cursor)) cursor = addDays(cursor, -7);
  let guard = 0;
  while (hasWeek(cursor) && guard < 520) {
    current += 1;
    cursor = addDays(cursor, -7);
    guard += 1;
  }
  let longest = 0;
  if (dates.size) {
    const allDates = [...dates].sort();
    let start = startOfWeekISO(allDates[0], 1);
    let run = 0;
    while (start <= currentWeek) {
      if (hasWeek(start)) { run += 1; longest = Math.max(longest, run); }
      else run = 0;
      start = addDays(start, 7);
    }
  }
  return { current, longest, totalWorkouts: completedWorkouts().length };
}

export function getTemplateEntry(date) {
  const weekday = parseISO(date).getDay();
  return state.weekly?.days?.[weekday] || { type: 'none' };
}

export function plansForDate(date) {
  return state.plans.filter((p) => p.date === date);
}

export function enrichedPlan(plan) {
  const routine = plan.routineId ? routineById(plan.routineId) : null;
  return {
    ...plan,
    routine,
    name: plan.name || routine?.name || 'Planned session',
    auto: Boolean(plan.auto)
  };
}

// Resolve a date into planned sessions, rest state and workouts.
export function resolveDay(date) {
  const explicit = plansForDate(date).map(enrichedPlan);
  const workouts = state.workouts.filter((w) => w.date === date);
  const template = getTemplateEntry(date);
  let plans = explicit;
  let auto = null;
  let rest = false;
  let unscheduled = false;

  if (!explicit.length) {
    if (template.type === 'routine' && template.routineId) {
      const routine = routineById(template.routineId);
      if (routine) {
        auto = {
          id: `auto:${date}`,
          date,
          routineId: routine.id,
          name: routine.name,
          status: 'planned',
          workoutId: null,
          source: 'template',
          auto: true,
          routine
        };
        plans = [auto];
      } else {
        unscheduled = true;
      }
    } else if (template.type === 'rest') {
      rest = true;
    } else {
      unscheduled = true;
    }
  }

  const linkedWorkoutIds = new Set(plans.map((p) => p.workoutId).filter(Boolean));
  const unlinkedWorkouts = workouts.filter((w) => !linkedWorkoutIds.has(w.id));
  const sessions = [
    ...plans.map((plan) => ({
      ...plan,
      workout: plan.workoutId ? workouts.find((w) => w.id === plan.workoutId) || null : null
    })),
    ...unlinkedWorkouts.map((workout) => ({
      id: `workout:${workout.id}`,
      auto: false,
      date,
      name: workout.name || 'Workout',
      status: workout.status === 'completed' ? 'completed' : 'in-progress',
      workoutId: workout.id,
      workout,
      source: 'workout'
    }))
  ];

  const completed = sessions.filter((s) => s.status === 'completed' && (s.workout?.status === 'completed' || s.workout));
  const planned = sessions.filter((s) => s.status === 'planned');
  const skipped = sessions.filter((s) => s.status === 'skipped');
  const inProgress = sessions.filter((s) => s.status === 'in-progress' || s.workout?.status === 'in-progress');

  let status = 'none';
  if (completed.length) status = 'completed';
  else if (inProgress.length) status = 'in-progress';
  else if (skipped.length && !planned.length) status = 'skipped';
  else if (planned.length) status = 'planned';
  else if (rest) status = 'rest';
  else if (unscheduled) status = 'unscheduled';

  return {
    date,
    plans,
    sessions,
    workouts,
    auto,
    rest,
    unscheduled,
    template,
    completed,
    planned,
    skipped,
    inProgress,
    status
  };
}

export function isRestDay(date) {
  return resolveDay(date).rest;
}

export function weekStats(date = todayISO()) {
  const weekStart = startOfWeekISO(date, Number(prefs.get('weekStart')) || 1);
  const weekEnd = addDays(weekStart, 6);
  const today = todayISO();
  const days = [];
  let due = 0;
  let completed = 0;
  let skipped = 0;
  let extraWorkouts = 0;
  let plannedTotal = 0;
  let workoutCount = 0;

  for (let i = 0; i < 7; i += 1) {
    const iso = addDays(weekStart, i);
    const day = resolveDay(iso);
    days.push(day);
    workoutCount += day.workouts.filter((w) => w.status === 'completed').length;
    for (const s of day.sessions) {
      if (s.source === 'workout') {
        if (s.status === 'completed') extraWorkouts += 1;
        continue;
      }
      if (iso <= today) {
        if (s.status === 'completed') completed += 1;
        if (['planned', 'skipped', 'completed', 'in-progress'].includes(s.status)) due += 1;
        if (s.status === 'skipped') skipped += 1;
      }
      if (s.status !== 'skipped') plannedTotal += 1;
    }
  }
  const pct = due > 0 ? Math.round((completed / due) * 100) : null;
  return {
    weekStart, weekEnd, days, due, completed, skipped, plannedTotal,
    pct, extraWorkouts, workoutCount,
    completedThisWeek: workoutCount,
    today
  };
}

export function monthStats(anchorISO) {
  const anchor = parseISO(anchorISO);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const today = todayISO();
  let due = 0;
  let completed = 0;
  let skipped = 0;
  let workoutDays = 0;
  const seenDays = new Set();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (iso > today) continue;
    const day = resolveDay(iso);
    if (day.workouts.some((w) => w.status === 'completed')) {
      workoutDays += 1;
      seenDays.add(iso);
    }
    for (const s of day.sessions) {
      if (s.source === 'workout') continue;
      if (['planned', 'skipped', 'completed', 'in-progress'].includes(s.status)) due += 1;
      if (s.status === 'completed') completed += 1;
      if (s.status === 'skipped') skipped += 1;
    }
  }
  return {
    due, completed, skipped, workoutDays,
    pct: due ? Math.round((completed / due) * 100) : null
  };
}

export function workoutsOnDate(date) {
  return state.workouts.filter((w) => w.date === date);
}

// ---------- workout creation helpers ----------

export function makeSet(exercise, prev = null, overrides = {}) {
  const flags = trackingFlags(exercise?.tracking || 'reps-weight');
  return {
    id: uid('set'),
    type: 'working',
    completed: false,
    reps: flags.reps ? (prev?.reps ?? overrides.reps ?? null) : null,
    weightKg: flags.weight ? (prev?.weightKg ?? overrides.weightKg ?? null) : null,
    durationSec: flags.duration ? (prev?.durationSec ?? overrides.durationSec ?? null) : null,
    rpe: null,
    ...overrides
  };
}

export function makeWorkoutExercise(exercise, options = {}) {
  const flags = trackingFlags(exercise.tracking);
  const previous = options.prefill === false ? null : exerciseLastPerformance(exercise.id);
  const targetReps = options.targetReps || {
    min: Number.isFinite(Number(exercise.repMin)) ? Number(exercise.repMin) : (flags.reps ? 8 : null),
    max: Number.isFinite(Number(exercise.repMax)) ? Number(exercise.repMax) : (flags.reps ? 12 : null)
  };
  const targetDuration = options.targetDuration ?? exercise.duration ?? null;
  const setCount = Math.max(1, Number(options.sets) || Number(exercise.sets) || 3);
  const prevSets = previous?.sets || [];
  const sets = [];
  for (let i = 0; i < setCount; i += 1) {
    const prev = prevSets[i] || prevSets[prevSets.length - 1] || null;
    sets.push(makeSet(exercise, prev, {
      reps: prev?.reps ?? (flags.reps ? targetReps.min : null),
      weightKg: prev?.weightKg ?? options.weightKg ?? null,
      durationSec: prev?.durationSec ?? targetDuration
    }));
  }
  return {
    uid: uid('wex'),
    exerciseId: exercise.id,
    name: exercise.name,
    tracking: exercise.tracking,
    primary: [...(exercise.primary || [])],
    secondary: [...(exercise.secondary || [])],
    bodyweightLoad: Boolean(exercise.bodyweightLoad),
    notes: '',
    targetReps,
    targetDuration,
    targetWeightKg: options.weightKg ?? null,
    sets,
    previous: previous ? { date: previous.date, sets: previous.sets } : null
  };
}

export function makeWorkout({ name, routine = null, date = todayISO(), planId = null }) {
  const exercises = [];
  if (routine) {
    for (const planned of routine.exercises || []) {
      const exercise = exerciseById(planned.exerciseId);
      if (!exercise) continue;
      const wex = makeWorkoutExercise(exercise, {
        sets: planned.sets,
        targetReps: planned.repMin || planned.repMax ? { min: planned.repMin, max: planned.repMax } : null,
        targetDuration: planned.duration || null,
        weightKg: planned.weightKg ?? null
      });
      wex.notes = planned.note || '';
      exercises.push(wex);
    }
  }
  const now = Date.now();
  return {
    id: uid('workout'),
    name: name || routine?.name || 'Training session',
    date,
    routineId: routine?.id || null,
    planId: planId || null,
    status: 'in-progress',
    startedAt: now,
    finishedAt: null,
    durationSec: null,
    notes: routine?.notes || '',
    exercises
  };
}

export function makePlan({ date, routine = null, name = '', source = 'manual' }) {
  return {
    id: uid('plan'),
    date,
    routineId: routine?.id || null,
    name: name || routine?.name || 'Planned session',
    status: 'planned',
    workoutId: null,
    source,
    createdAt: Date.now()
  };
}

export function totalWorkoutStats(workout) {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  let timedSets = 0;
  const muscles = new Set();
  for (const wex of workout.exercises || []) {
    const flags = trackingFlags(wex.tracking);
    for (const set of wex.sets || []) {
      if (!set.completed || set.type === 'warmup') continue;
      sets += 1;
      reps += Number(set.reps) || 0;
      if (flags.weight) volume += (Number(set.weightKg) || 0) * (Number(set.reps) || 0);
      if (flags.duration) timedSets += 1;
    }
    (wex.primary || []).forEach((m) => muscles.add(m));
    (wex.secondary || []).forEach((m) => muscles.add(m));
  }
  const duration = workout.durationSec || (workout.startedAt && workout.finishedAt
    ? Math.round((workout.finishedAt - workout.startedAt) / 1000)
    : null);
  return { sets, reps, volume, timedSets, muscles: [...muscles], duration };
}

export function summarizeWorkout(workout) {
  const stats = totalWorkoutStats(workout);
  const previous = previousComparable(workout);
  const newPRs = detectNewPRs(workout);
  let comparison = null;
  if (previous) {
    const prevStats = totalWorkoutStats(previous);
    comparison = {
      previous,
      delta: {
        sets: stats.sets - prevStats.sets,
        reps: stats.reps - prevStats.reps,
        volume: stats.volume - prevStats.volume,
        duration: stats.duration && prevStats.duration ? stats.duration - prevStats.duration : null
      }
    };
  }
  return { ...stats, newPRs, comparison };
}

function previousComparable(workout) {
  const candidates = completedWorkouts().filter((w) => {
    if (w.id === workout.id) return false;
    if (w.date < workout.date) return true;
    if (w.date === workout.date && (w.startedAt || 0) < (workout.startedAt || 0)) return true;
    return false;
  });
  if (workout.routineId) {
    const same = candidates
      .filter((w) => w.routineId === workout.routineId)
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    if (same.length) return same[0];
  }
  const currentNames = new Set((workout.exercises || []).map((e) => e.exerciseId));
  let best = null;
  let bestOverlap = 0;
  for (const candidate of candidates) {
    const overlap = (candidate.exercises || []).filter((e) => currentNames.has(e.exerciseId)).length;
    if (overlap > bestOverlap) {
      best = candidate;
      bestOverlap = overlap;
    }
  }
  return bestOverlap > 0 ? best : null;
}

function detectNewPRs(workout) {
  const prs = [];
  for (const wex of workout.exercises || []) {
    const sets = (wex.sets || []).filter((s) => s.completed && s.type !== 'warmup');
    if (!sets.length) continue;
    const prior = exerciseRecords(wex.exerciseId, { excludeWorkoutId: workout.id });
    if (!prior.sessions) continue;
    const flags = trackingFlags(wex.tracking);
    const currentE1rm = sets
      .map((s) => ({ set: s, value: estimateSet1RM(wex, s) }))
      .filter((x) => x.value)
      .sort((a, b) => b.value - a.value)[0] || null;
    if (currentE1rm && prior.bestE1RM && currentE1rm.value > prior.bestE1RM.value + 0.05) {
      prs.push({
        type: 'Estimated 1RM',
        exerciseId: wex.exerciseId,
        exerciseName: wex.name,
        value: roundTo(currentE1rm.value, 1),
        unit: 'kg',
        previous: prior.bestE1RM.value
      });
    }
    if (flags.weight) {
      const maxWeight = Math.max(0, ...sets.map((s) => Number(s.weightKg) || 0));
      if (maxWeight > 0 && prior.bestWeight && maxWeight > prior.bestWeight.value + 0.01) {
        prs.push({
          type: 'Heaviest set',
          exerciseId: wex.exerciseId,
          exerciseName: wex.name,
          value: maxWeight,
          unit: 'kg',
          previous: prior.bestWeight.value
        });
      }
    }
    if (flags.duration) {
      const bestDuration = Math.max(0, ...sets.map((s) => Number(s.durationSec) || 0));
      if (bestDuration > 0 && prior.bestDuration && bestDuration > prior.bestDuration.value) {
        prs.push({
          type: 'Longest hold',
          exerciseId: wex.exerciseId,
          exerciseName: wex.name,
          value: bestDuration,
          unit: 'sec',
          previous: prior.bestDuration.value
        });
      }
    }
    if (!flags.weight && flags.reps) {
      const bestReps = Math.max(0, ...sets.map((s) => Number(s.reps) || 0));
      if (bestReps > 0 && prior.bestReps && bestReps > prior.bestReps.value) {
        prs.push({
          type: 'Most reps',
          exerciseId: wex.exerciseId,
          exerciseName: wex.name,
          value: bestReps,
          unit: 'reps',
          previous: prior.bestReps.value
        });
      }
    }
  }
  return prs;
}

// ---------- overload & progress ----------

export function overloadSuggestion(wex) {
  if (!wex) return null;
  const last = lastExerciseSession(wex.exerciseId);
  if (!last) return null;
  const flags = trackingFlags(wex.tracking);
  const target = wex.targetReps || {};
  const workingSets = last.sets.filter((s) => s.type !== 'warmup');
  if (!workingSets.length) return null;
  const targetMax = Number(target.max) || null;
  const targetMin = Number(target.min) || null;
  const lastReps = workingSets.map((s) => Number(s.reps) || 0);
  const lastWeight = Math.max(0, ...workingSets.map((s) => Number(s.weightKg) || 0));
  const lastDuration = Math.max(0, ...workingSets.map((s) => Number(s.durationSec) || 0));
  const dismissKey = `${wex.exerciseId}:${last.workout.date}`;
  const dismissed = prefs.get('overloadDismissed') || {};
  const base = {
    exerciseId: wex.exerciseId,
    exerciseName: wex.name,
    lastDate: last.workout.date,
    dismissKey,
    dismissed: Boolean(dismissed[dismissKey])
  };

  if (flags.duration && !flags.reps) {
    const targetDuration = Number(wex.targetDuration) || 30;
    if (lastDuration >= targetDuration) {
      return {
        ...base,
        headline: 'A little more time',
        reason: `You held ${lastDuration}s in your last session (target ${targetDuration}s). Add 5 seconds next time.`,
        next: { durationSec: lastDuration + 5 }
      };
    }
    return null;
  }

  if (flags.weight && targetMax && lastReps.filter((r) => r > 0).length) {
    const hitTop = lastReps.every((r) => r >= targetMax);
    if (hitTop && lastWeight > 0) {
      const isLower = ['squat', 'hinge', 'lunge'].includes(
        exerciseById(wex.exerciseId)?.pattern || ''
      );
      const increment = isLower ? 5 : 2.5;
      return {
        ...base,
        headline: 'Ready for a small increase',
        reason: `You completed every set at ${targetMax}+ reps with ${roundTo(lastWeight, 1)} kg on ${last.workout.date}. Try ${roundTo(lastWeight + increment, 1)} kg next time; add reps before adding more load.`,
        next: { weightKg: roundTo(lastWeight + increment, 1) }
      };
    }
    if (!hitTop && targetMin && lastReps.every((r) => r >= targetMin)) {
      return {
        ...base,
        headline: 'Add a rep',
        reason: `All sets reached ${targetMin}+ reps at ${roundTo(lastWeight, 1)} kg. Aim for ${Math.min(targetMax, Math.max(...lastReps) + 1)} reps before increasing weight.`,
        next: { reps: Math.min(targetMax, Math.max(...lastReps) + 1) }
      };
    }
  }

  if (!flags.weight && flags.reps && targetMax) {
    const hitTop = lastReps.every((r) => r >= targetMax);
    if (hitTop) {
      return {
        ...base,
        headline: 'Progress the movement',
        reason: `You reached ${targetMax}+ reps on every set. Add a rep or two, or choose a slightly harder variation next session.`,
        next: { reps: Math.max(...lastReps) + 1 }
      };
    }
  }

  return null;
}

export function exerciseProgressSeries(exerciseId) {
  const sessions = exerciseSessions(exerciseId);
  const exercise = exerciseById(exerciseId);
  return sessions.map(({ workout, wex, sets }) => {
    const e1rms = sets.map((s) => estimateSet1RM(wex, s)).filter(Boolean);
    const weights = sets.map((s) => Number(s.weightKg) || 0);
    const reps = sets.map((s) => Number(s.reps) || 0);
    const durations = sets.map((s) => Number(s.durationSec) || 0);
    const flags = trackingFlags(wex.tracking);
    const metric = flags.weight ? 'E1RM' : flags.duration ? 'Duration' : 'Reps';
    return {
      date: workout.date,
      workoutId: workout.id,
      e1rm: e1rms.length ? roundTo(Math.max(...e1rms), 1) : null,
      bestWeight: Math.max(0, ...weights) || null,
      bestReps: Math.max(0, ...reps) || null,
      bestDuration: Math.max(0, ...durations) || null,
      volume: sets.reduce((acc, s) => acc + (Number(s.weightKg) || 0) * (Number(s.reps) || 0), 0),
      sets: sets.length,
      metric,
      tracking: wex.tracking,
      exercise
    };
  });
}

export function progressMetricFor(exercise) {
  if (!exercise) return null;
  const flags = trackingFlags(exercise.tracking);
  if (flags.weight) return { key: 'e1rm', label: 'Estimated 1RM', unit: 'kg' };
  if (flags.duration) return { key: 'bestDuration', label: 'Longest hold', unit: 'sec' };
  return { key: 'bestReps', label: 'Best set reps', unit: 'reps' };
}

export function weeklySeries(weeks = 8) {
  const keys = weekKeys(weeks, todayISO());
  return keys.map((weekStart) => {
    let workouts = 0;
    let sets = 0;
    let reps = 0;
    let volume = 0;
    let minutes = 0;
    for (const workout of completedWorkouts()) {
      if (startOfWeekISO(workout.date, 1) !== weekStart) continue;
      workouts += 1;
      const stats = totalWorkoutStats(workout);
      sets += stats.sets;
      reps += stats.reps;
      volume += stats.volume;
      minutes += (stats.duration || 0) / 60;
    }
    return { weekStart, workouts, sets, reps, volume, minutes: Math.round(minutes) };
  });
}

export function recentPRs(limit = 5) {
  const rows = [];
  for (const exercise of state.exercises) {
    const rec = exerciseRecords(exercise.id);
    if (!rec.sessions) continue;
    const flags = trackingFlags(exercise.tracking);
    let best = null;
    if (flags.weight && rec.bestE1RM) {
      best = { label: 'Est. 1RM', value: rec.bestE1RM.value, formatted: `${roundTo(rec.bestE1RM.value, 1)} kg`, date: rec.bestE1RM.date };
    } else if (flags.duration && rec.bestDuration) {
      best = { label: 'Longest hold', value: rec.bestDuration.value, formatted: `${Math.round(rec.bestDuration.value)} s`, date: rec.bestDuration.date };
    } else if (rec.bestReps) {
      best = { label: 'Best set', value: rec.bestReps.value, formatted: `${rec.bestReps.value} reps`, date: rec.bestReps.date };
    }
    if (best) rows.push({ exerciseId: exercise.id, name: exercise.name, ...best });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export function strengthImprovements(limit = 3) {
  const rows = [];
  const recentStart = addDays(todayISO(), -28);
  for (const exercise of state.exercises) {
    const series = exerciseProgressSeries(exercise.id).filter((s) => s.e1rm);
    if (series.length < 2) continue;
    const recent = series.filter((s) => s.date >= recentStart);
    const earlier = series.filter((s) => s.date < recentStart);
    if (!recent.length || !earlier.length) continue;
    const recentBest = Math.max(...recent.map((s) => s.e1rm));
    const priorBest = Math.max(...earlier.map((s) => s.e1rm));
    const delta = recentBest - priorBest;
    if (delta > 0.2) {
      rows.push({
        exerciseId: exercise.id,
        name: exercise.name,
        delta: roundTo(delta, 1),
        recent: roundTo(recentBest, 1),
        prior: roundTo(priorBest, 1),
        date: recent[recent.length - 1].date
      });
    }
  }
  return rows.sort((a, b) => b.delta - a.delta).slice(0, limit);
}

export function detectionNote() {
  return 'Estimates are calculated from completed working sets in this app. They are training aids, not medical or laboratory measurements.';
}

export function recentWorkoutHistory(limit = 5) {
  return completedWorkouts().slice(0, limit);
}

export function muscleLabel(muscleId) {
  return MUSCLE_BY_ID[muscleId]?.label || muscleId;
}

export function routineName(id) {
  return routineById(id)?.name || null;
}

export function activePlanForWorkout(workout) {
  return workout.planId ? state.plans.find((p) => p.id === workout.planId) || null : null;
}

export function lastWorkoutForRoutine(routineId) {
  return completedWorkouts()
    .filter((w) => w.routineId === routineId)
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0] || null;
}

export function setsSummaryLine(wex) {
  const flags = trackingFlags(wex.tracking);
  const sets = (wex.sets || []).filter((s) => s.type !== 'warmup');
  if (!sets.length) return '—';
  if (flags.duration) {
    const d = Math.max(...sets.map((s) => Number(s.durationSec) || 0));
    return `${sets.length} × ${Math.round(d)}s`;
  }
  const reps = sets.map((s) => Number(s.reps) || 0);
  const weights = sets.map((s) => Number(s.weightKg) || 0);
  const maxW = Math.max(0, ...weights);
  const minR = Math.min(...reps);
  const maxR = Math.max(...reps);
  if (flags.weight && maxW > 0) {
    return `${sets.length} × ${minR === maxR ? maxR : `${minR}–${maxR}`} @ ${roundTo(maxW, 1)} kg`;
  }
  return `${sets.length} × ${minR === maxR ? maxR : `${minR}–${maxR}`} reps`;
}

export function completedSetCount(workout) {
  return workingSets(workout).length;
}

// Friendly comparison used in dashboard/summary.
export function workoutDurationLabel(workout) {
  const stats = totalWorkoutStats(workout);
  if (!stats.duration) return null;
  const mins = Math.round(stats.duration / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
