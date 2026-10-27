// Canonical muscle identifiers, tiers, and the transparent scoring model.
// Kept in one place so anatomy, exercises, scoring and charts never disagree.

export const MUSCLES = [
  { id: 'chest', label: 'Chest', group: 'Push', views: ['front'] },
  { id: 'frontDelts', label: 'Front delts', group: 'Push', views: ['front'] },
  { id: 'sideDelts', label: 'Side delts', group: 'Push', views: ['front', 'back'] },
  { id: 'rearDelts', label: 'Rear delts', group: 'Pull', views: ['back'] },
  { id: 'traps', label: 'Trapezius', group: 'Pull', views: ['front', 'back'] },
  { id: 'lats', label: 'Lats', group: 'Pull', views: ['back'] },
  { id: 'upperBack', label: 'Upper back', group: 'Pull', views: ['back'] },
  { id: 'lowerBack', label: 'Lower back', group: 'Hinge', views: ['back'] },
  { id: 'biceps', label: 'Biceps', group: 'Pull', views: ['front'] },
  { id: 'triceps', label: 'Triceps', group: 'Push', views: ['back'] },
  { id: 'forearms', label: 'Forearms', group: 'Grip', views: ['front', 'back'] },
  { id: 'abs', label: 'Abdominals', group: 'Core', views: ['front'] },
  { id: 'obliques', label: 'Obliques', group: 'Core', views: ['front'] },
  { id: 'glutes', label: 'Glutes', group: 'Hinge', views: ['back'] },
  { id: 'quads', label: 'Quadriceps', group: 'Squat', views: ['front'] },
  { id: 'hamstrings', label: 'Hamstrings', group: 'Hinge', views: ['back'] },
  { id: 'calves', label: 'Calves', group: 'Lower leg', views: ['front', 'back'] },
  { id: 'adductors', label: 'Adductors', group: 'Squat', views: ['front'] },
  { id: 'abductors', label: 'Abductors', group: 'Hinge', views: ['back'] }
];

export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));
export const MUSCLE_IDS = MUSCLES.map((m) => m.id);

export const TIERS = [
  { id: 'beginner', label: 'Beginner', color: '#F44336', min: 0 },
  { id: 'novice', label: 'Novice', color: '#FF9800', min: 20 },
  { id: 'intermediate', label: 'Intermediate', color: '#4CAF50', min: 38 },
  { id: 'advanced', label: 'Advanced', color: '#2196F3', min: 56 },
  { id: 'elite', label: 'Elite', color: '#9C27B0', min: 72 },
  { id: 'world', label: 'World Class', color: '#E91E63', min: 88 }
];

export function tierForScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  let result = TIERS[0];
  for (const tier of TIERS) if (score >= tier.min) result = tier;
  return result;
}

// All weights below sum to 100. Tweak here to tune the whole profile.
export const SCORING = {
  windowWeeks: 12,
  volumeWindowWeeks: 8,
  volumeTargetSets: 80, // effective sets over the volume window for full marks
  weights: { volume: 40, consistency: 20, frequency: 15, progression: 15, load: 10 },
  secondaryFactor: 0.5,
  warmupFactor: 0,
  sufficient: { sessions: 3, effectiveSets: 9 },
  loadRatioTarget: 0.6, // external load / bodyweight averaged across loaded sets
  frequencyTargetSessions: 12, // per 28 days
  tierThresholds: TIERS.map((t) => ({ id: t.id, min: t.min })),
  recovery: {
    recentlyTrainedHours: 24,
    inProgressHours: 48,
    highVolumeHours: 72,
    highVolumeSets: 14
  }
};

// Heuristic reference bands for estimated 1RM relative to body weight.
// These are motivational estimates for this app, not validated standards.
export const BENCHMARK_PATTERNS = {
  'horizontal-push': { label: 'Horizontal push', ratios: [0.35, 0.55, 0.8, 1.05, 1.3] },
  'vertical-push': { label: 'Vertical push', ratios: [0.25, 0.4, 0.6, 0.8, 1.0] },
  'horizontal-pull': { label: 'Horizontal pull', ratios: [0.3, 0.5, 0.75, 1.0, 1.25] },
  'vertical-pull': { label: 'Vertical pull', ratios: [0.2, 0.4, 0.65, 0.9, 1.2] },
  squat: { label: 'Squat', ratios: [0.4, 0.65, 1.0, 1.35, 1.7] },
  hinge: { label: 'Hinge', ratios: [0.4, 0.65, 1.0, 1.4, 1.8] },
  lunge: { label: 'Lunge', ratios: [0.3, 0.5, 0.75, 1.0, 1.3] },
  isolation: { label: 'Isolation', ratios: [0.15, 0.25, 0.4, 0.55, 0.7] },
  core: { label: 'Core', ratios: [0.1, 0.2, 0.35, 0.5, 0.65] }
};

export const MOVEMENT_LABELS = {
  'horizontal-push': 'Horizontal push',
  'vertical-push': 'Vertical push',
  'horizontal-pull': 'Horizontal pull',
  'vertical-pull': 'Vertical pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  carry: 'Carry',
  core: 'Core',
  isolation: 'Isolation',
  mobility: 'Mobility'
};

export const TRACKING_LABELS = {
  'reps-weight': 'Reps + weight',
  reps: 'Bodyweight reps',
  duration: 'Timed hold',
  'weight-duration': 'Weight + time'
};

export const EQUIPMENT_LABELS = {
  bodyweight: 'Bodyweight',
  dumbbells: 'Dumbbells',
  bands: 'Resistance bands',
  bench: 'Bench',
  pullupBar: 'Pull-up bar',
  barbell: 'Barbell',
  kettlebell: 'Kettlebell',
  chair: 'Chair / step',
  towel: 'Towel'
};

export const GOALS = [
  { id: 'strength', label: 'Build strength' },
  { id: 'muscle', label: 'Build muscle' },
  { id: 'consistency', label: 'Train consistently' },
  { id: 'mobility', label: 'Move better' },
  { id: 'energy', label: 'Feel more energetic' }
];

export const EXPERIENCE_LEVELS = [
  { id: 'new', label: 'New to training' },
  { id: 'beginner', label: 'Beginner (under 1 year)' },
  { id: 'intermediate', label: 'Intermediate (1–3 years)' },
  { id: 'advanced', label: 'Advanced (3+ years)' }
];

export const DEFAULT_WEEKLY = {
  days: {
    0: { type: 'rest' },
    1: { type: 'routine', routineId: 'routine-upper' },
    2: { type: 'none' },
    3: { type: 'routine', routineId: 'routine-lower' },
    4: { type: 'rest' },
    5: { type: 'routine', routineId: 'routine-full' },
    6: { type: 'none' }
  }
};
