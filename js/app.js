// Cozy Strength application controller.
// Views render markup; this module owns interactions, persistence and the timer.
import {
  state, initStore, prefs, ROUTES, activeWorkout, exerciseById, routineById,
  workoutById, photoById, saveProfile, saveExercise, toggleFavourite,
  deleteExercise, saveWorkout, deleteWorkoutRecord, saveRoutine, deleteRoutine,
  savePlan, deletePlan, saveWeekly, saveWeight, deleteWeight, saveMeasurement,
  deleteMeasurement, savePhoto, deletePhoto, clearAllPersonalData, latestWeight
} from './store.js';
import {
  makeWorkout, makeWorkoutExercise, makePlan, trackingFlags,
  workingSets, MEASUREMENT_KEYS
} from './services.js';
import {
  $, $$, escapeHTML, todayISO, isValidISO, fmtDate, uid,
  parseISO, toISO, addDays, startOfWeekISO, displayToKg, displayToCm,
  formatTimer, roundTo, formatNumber
} from './utils.js';
import {
  openModal, closeModal, confirmDialog, toast, hydrateIcons, trackModalUrl,
  readPhotoFile, timerWidgetHTML, icon
} from './ui.js';
import { renderDashboard } from './views/dashboard.js';
import {
  renderWorkouts, renderLogger, sessionSummaryHTML, restTimerCardHTML,
  exercisePickerBody, workoutDetailBody, summaryModalBody, routinePickerBody
} from './views/training.js';
import {
  renderLibrary, libraryResultsHTML, exerciseDetailBody, customExerciseFormBody,
  exerciseFormFooter
} from './views/library.js';
import { renderCalendar } from './views/calendar.js';
import { renderStrength } from './views/strength.js';
import {
  renderProgress, weightFormBody, measurementFormBody, photoFormBody,
  photoViewerBody, photoCompareBody, formFooter
} from './views/progress.js';
import { renderPlanner } from './views/planner.js';
import { renderSettings } from './views/settings.js';
import { onboardingBody, onboardingFooter } from './views/onboarding.js';

const TODAY = todayISO;
const TIMER_KEY = 'cozy-strength-rest-timer';
let openWorkoutId = null;
let saveTimer = null;
let saveStatus = 'saved';
let finishing = false;
let onboardingShown = false;
let onboardingDraft = null;
let suppressOnboardClose = false;
let photoDraft = null;
let currentModalExerciseId = null;
let audioContext = null;

// ---------------- theme ----------------

const mediaTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function prefTheme() {
  const pref = prefs.get('theme');
  if (pref === 'system') return mediaTheme?.matches ? 'dark' : 'light';
  return pref === 'dark' ? 'dark' : 'light';
}

function applyTheme() {
  const theme = prefTheme();
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#20231e' : '#FAF8F4');
}
if (mediaTheme?.addEventListener) {
  mediaTheme.addEventListener('change', () => {
    if (prefs.get('theme') === 'system') applyTheme();
  });
}

// ---------------- timer ----------------

function emptyTimer() {
  return { active: false, running: false, remaining: 0, total: 0, endAt: null };
}

function loadTimer() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return emptyTimer();
    const saved = JSON.parse(raw);
    if (!saved?.active) return emptyTimer();
    if (saved.running && saved.endAt) {
      const remaining = Math.ceil((saved.endAt - Date.now()) / 1000);
      if (remaining <= 0) return emptyTimer();
      return { active: true, running: true, remaining, total: saved.total || remaining, endAt: saved.endAt };
    }
    const remaining = Math.max(0, Number(saved.remaining) || 0);
    if (!remaining) return emptyTimer();
    return { active: true, running: false, remaining, total: saved.total || remaining, endAt: null };
  } catch {
    return emptyTimer();
  }
}

let timer = loadTimer();

function persistTimer() {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  } catch { /* timer persistence is a nicety */ }
}

function defaultRest() {
  return Math.max(5, Math.min(3600, Number(prefs.get('restDefault')) || 90));
}

function ensureAudio() {
  if (audioContext) return audioContext;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioContext = new Ctx();
  } catch { /* sound unavailable */ }
  return audioContext;
}

function playChime() {
  if (!prefs.get('timerSound')) return;
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [880, 1174.66, 1567.98].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + index * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + index * 0.14);
      osc.stop(now + index * 0.14 + 0.45);
    });
  } catch { /* ignore audio failure */ }
}

function buzz() {
  if (prefs.get('timerVibrate') && navigator.vibrate) {
    try { navigator.vibrate([120, 70, 120]); } catch { /* ignore */ }
  }
}

function syncTimerText() {
  window.__cozyTimer = timer;
  const widget = document.getElementById('rest-widget');
  if (widget) {
    widget.hidden = !timer.active;
    const stateKey = `${timer.active}-${timer.running}`;
    if (widget.dataset.timerState !== stateKey || !widget.innerHTML) {
      widget.innerHTML = timer.active ? timerWidgetHTML(timer) : '';
      widget.dataset.timerState = stateKey;
    }
    const timeEl = widget.querySelector('.timer-time');
    if (timeEl) timeEl.textContent = formatTimer(timer.remaining);
  }
  const inlineTime = document.getElementById('inline-timer-time');
  if (inlineTime) {
    inlineTime.textContent = timer.active ? formatTimer(timer.remaining) : formatTimer(defaultRest());
  }
}

function rebuildInlineTimer() {
  const inline = document.getElementById('rest-timer-inline');
  if (!inline) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = restTimerCardHTML(timer, Boolean(prefs.get('autoRest')));
  const next = wrap.firstElementChild;
  if (next) {
    inline.replaceWith(next);
    hydrateIcons(next);
  }
}

function updateTimerSurfaces({ rebuildInline = false } = {}) {
  syncTimerText();
  if (rebuildInline) rebuildInlineTimer();
}

function startTimer(seconds) {
  const duration = Math.max(5, Math.min(3600, Math.round(Number(seconds) || defaultRest())));
  ensureAudio();
  timer = { active: true, running: true, remaining: duration, total: duration, endAt: Date.now() + duration * 1000 };
  persistTimer();
  updateTimerSurfaces({ rebuildInline: true });
}

function pauseResumeTimer() {
  if (!timer.active) {
    startTimer(defaultRest());
    return;
  }
  if (timer.running) {
    timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    timer.running = false;
    timer.endAt = null;
  } else {
    if (timer.remaining <= 0) timer.remaining = defaultRest();
    timer.running = true;
    timer.endAt = Date.now() + timer.remaining * 1000;
  }
  persistTimer();
  updateTimerSurfaces({ rebuildInline: true });
}

function addTimerTime(seconds = 15) {
  if (!timer.active) {
    startTimer(defaultRest() + seconds);
    return;
  }
  timer.remaining = Math.max(0, timer.remaining + seconds);
  timer.total = Math.max(timer.total, timer.remaining);
  if (timer.running) timer.endAt = Date.now() + timer.remaining * 1000;
  persistTimer();
  updateTimerSurfaces({ rebuildInline: true });
}

function resetTimer() {
  timer = emptyTimer();
  persistTimer();
  updateTimerSurfaces({ rebuildInline: true });
}

function finishTimer() {
  timer = emptyTimer();
  persistTimer();
  updateTimerSurfaces({ rebuildInline: true });
  playChime();
  buzz();
  toast('Rest complete — begin whenever you feel ready.', 'info', 3000);
}

function tickTimer() {
  if (!timer.active || !timer.running) return;
  const remaining = Math.ceil((timer.endAt - Date.now()) / 1000);
  if (remaining <= 0) {
    finishTimer();
    return;
  }
  if (remaining !== timer.remaining) {
    timer.remaining = remaining;
    syncTimerText();
  }
}

// ---------------- save state ----------------

function syncSaveIndicator() {
  const el = document.getElementById('save-state');
  if (!el) return;
  if (saveStatus === 'saving') {
    el.className = 'save-state saving';
    el.innerHTML = '<span class="save-dot"></span><span>Saving locally…</span>';
  } else if (saveStatus === 'error') {
    el.className = 'save-state error';
    el.innerHTML = '<span class="save-dot"></span><button class="link-btn" type="button" data-action="retry-save" style="color:var(--danger)">Not saved — retry</button>';
  } else {
    el.className = 'save-state';
    el.innerHTML = '<span class="save-dot"></span><span>Saved in this browser</span>';
  }
}

function scheduleSave(workout) {
  if (!workout) return;
  clearTimeout(saveTimer);
  saveStatus = 'saving';
  syncSaveIndicator();
  const id = workout.id;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistWorkout(id);
  }, 420);
}

async function persistWorkout(id) {
  const workout = workoutById(id);
  if (!workout) return true;
  try {
    await saveWorkout(workout);
    saveStatus = 'saved';
    syncSaveIndicator();
    return true;
  } catch (error) {
    console.error(error);
    saveStatus = 'error';
    syncSaveIndicator();
    toast('Could not save to this browser. Your inputs are still here — try again.', 'error', 4200);
    return false;
  }
}

function clearSaveTimer() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
}

// ---------------- rendering & navigation ----------------

const ROUTE_TITLES = {
  home: 'Home',
  workouts: 'Workouts',
  session: 'Workout session',
  library: 'Exercise library',
  calendar: 'Calendar',
  strength: 'Strength profile',
  progress: 'Progress',
  planner: 'Planner',
  settings: 'Settings'
};

function currentSessionWorkout() {
  return (openWorkoutId ? workoutById(openWorkoutId) : null) || activeWorkout();
}

function updateTopbar() {
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = ROUTE_TITLES[state.route] || 'Cozy Strength';
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = fmtDate(TODAY(), { weekday: 'short', month: 'short', day: 'numeric' });
}

function syncNav() {
  const active = state.route === 'session' ? 'workouts' : state.route;
  $$('.nav-item').forEach((btn) => {
    const on = btn.dataset.route === active;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  });
  $$('.bnav-item').forEach((btn) => {
    let on = btn.dataset.route === active;
    if (btn.dataset.route === 'more') on = ['library', 'progress', 'planner', 'settings'].includes(active);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  });
}

function animateCounters(root) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  $$('[data-count-to]', root).forEach((el) => {
    const target = Number(el.dataset.countTo);
    const decimals = Number(el.dataset.countDecimals) || 0;
    const suffix = el.dataset.countSuffix || '';
    if (!Number.isFinite(target) || reduced) {
      el.textContent = `${formatNumber(target, decimals)}${suffix}`;
      return;
    }
    const start = performance.now();
    const duration = 620;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = `${formatNumber(target * eased, decimals)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = `${formatNumber(target, decimals)}${suffix}`;
    };
    requestAnimationFrame(step);
  });
}

function errorView(error) {
  return `<div class="card" style="max-width:560px;margin:14vh auto;text-align:center;padding:32px">
    <div class="empty-icon" style="margin:0 auto 12px;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--blush-soft);color:var(--blush-strong)">${icon('warning', 22)}</div>
    <h1 style="font-size:1.3rem">Something went wrong</h1>
    <p class="small muted" style="margin:8px 0 18px">${escapeHTML(error?.message || 'The view could not be drawn.')}</p>
    <button class="btn btn-primary btn-sm" type="button" onclick="location.reload()">Reload app</button>
  </div>`;
}

function renderCurrent({ scroll = false } = {}) {
  const main = document.getElementById('main');
  if (!main) return;
  updateTopbar();
  syncNav();
  if (state.fatalError) {
    main.innerHTML = errorView(state.fatalError);
    return;
  }
  let html = '';
  try {
    if (state.route === 'session') {
      window.__cozyTimer = timer;
      html = renderLogger(currentSessionWorkout());
    } else if (state.route === 'home') html = renderDashboard();
    else if (state.route === 'workouts') html = renderWorkouts();
    else if (state.route === 'library') html = renderLibrary();
    else if (state.route === 'calendar') html = renderCalendar();
    else if (state.route === 'strength') html = renderStrength();
    else if (state.route === 'progress') html = renderProgress();
    else if (state.route === 'planner') html = renderPlanner();
    else if (state.route === 'settings') html = renderSettings();
    else html = renderDashboard();
  } catch (error) {
    console.error(error);
    main.innerHTML = errorView(error);
    return;
  }
  main.innerHTML = html;
  hydrateIcons(main);
  animateCounters(main);
  syncSaveIndicator();
  syncTimerText();
  if (state.route === 'settings') fillStorageInfo();
  if (scroll) {
    window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  maybeOnboarding();
}

function navigate(route, { scroll = true } = {}) {
  if (route === 'more') {
    openMoreMenu();
    return;
  }
  if (!ROUTES.includes(route)) return;
  state.route = route;
  renderCurrent({ scroll });
}

function openSession(id) {
  const workout = workoutById(id);
  if (!workout) {
    toast('That workout could not be found.', 'error');
    return;
  }
  openWorkoutId = workout.id;
  saveStatus = 'saved';
  state.route = 'session';
  renderCurrent({ scroll: true });
}

// ---------------- onboarding ----------------

function profileOnboardingDraft() {
  const latest = latestWeight();
  return {
    name: state.profile?.name || '',
    dob: state.profile?.dob || '',
    heightCm: state.profile?.heightCm || null,
    weightKg: latest?.weightKg ?? null,
    targetWeightKg: state.profile?.targetWeightKg || null,
    unitSystem: state.profile?.unitSystem === 'imperial' ? 'imperial' : 'metric',
    experience: state.profile?.experience || 'beginner',
    goals: [...(state.profile?.goals || ['strength'])],
    equipment: [...(state.profile?.equipment || ['bodyweight', 'dumbbells'])],
    weeklyTarget: state.profile?.weeklyTarget || 3,
    trainingDays: [...(state.profile?.trainingDays || [1, 3, 5])]
  };
}

function collectOnboarding(form, currentUnits) {
  const data = new FormData(form);
  const heightCm = currentUnits === 'imperial'
    ? (() => {
        const feet = Number(data.get('heightFeet'));
        const inches = Number(data.get('heightInches'));
        if (!data.get('heightFeet') && !data.get('heightInches')) return null;
        if (!Number.isFinite(feet) && !Number.isFinite(inches)) return null;
        return ((Number.isFinite(feet) ? feet : 0) * 12 + (Number.isFinite(inches) ? inches : 0)) * 2.54;
      })()
    : (data.get('heightCm') ? displayToCm(data.get('heightCm'), 'metric') : null);
  const weightKg = data.get('weight') ? displayToKg(data.get('weight'), currentUnits) : null;
  const targetWeightKg = data.get('targetWeight') ? displayToKg(data.get('targetWeight'), currentUnits) : null;
  const weeklyTarget = Number(data.get('weeklyTarget'));
  return {
    name: String(data.get('name') || '').trim(),
    dob: String(data.get('dob') || ''),
    heightCm: Number.isFinite(heightCm) ? heightCm : null,
    weightKg: Number.isFinite(weightKg) ? weightKg : null,
    targetWeightKg: Number.isFinite(targetWeightKg) ? targetWeightKg : null,
    unitSystem: currentUnits,
    experience: String(data.get('experience') || 'beginner'),
    goals: data.getAll('goals').map(String),
    equipment: data.getAll('equipment').map(String),
    weeklyTarget: Number.isFinite(weeklyTarget) ? weeklyTarget : 3,
    trainingDays: data.getAll('trainingDays').map(Number)
  };
}

function openOnboarding(draft = profileOnboardingDraft()) {
  onboardingDraft = draft;
  const dialog = openModal({
    title: 'Welcome to Cozy Strength',
    subtitle: 'A calm, local-first home for home strength training.',
    body: onboardingBody(draft),
    footer: onboardingFooter(),
    size: 'wide',
    onClose: () => {
      if (!suppressOnboardClose && !state.profile?.onboarded) {
        prefs.set('onboardSkipped', true);
      }
      onboardingDraft = null;
    }
  });
  dialog.addEventListener('change', (event) => {
    if (!event.target.matches('[data-onboarding-units]')) return;
    const form = dialog.querySelector('#onboarding-form');
    if (!form) return;
    const currentUnits = form.dataset.units === 'imperial' ? 'imperial' : 'metric';
    const collected = collectOnboarding(form, currentUnits);
    collected.unitSystem = event.target.value === 'imperial' ? 'imperial' : 'metric';
    suppressOnboardClose = true;
    closeModal();
    suppressOnboardClose = false;
    openOnboarding(collected);
  });
}

function maybeOnboarding() {
  if (onboardingShown) return;
  if (!state.profile || state.profile.onboarded) return;
  if (prefs.get('onboardSkipped')) return;
  if (document.querySelector('.modal-backdrop')) return;
  onboardingShown = true;
  setTimeout(() => openOnboarding(), 60);
}

function setFieldError(form, name, message) {
  if (!form) return;
  const err = form.querySelector(`[data-error-for="${name}"]`);
  if (err) err.textContent = message || '';
  form.querySelectorAll(`[name="${name}"]`).forEach((field) => {
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  });
}

function clearFormErrors(form) {
  if (!form) return;
  form.querySelectorAll('[data-error-for]').forEach((el) => { el.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

// ---------------- toast wrapper ----------------

function showError(error) {
  console.error(error);
  toast(error?.message || 'Something went wrong. Please try again.', 'error', 4200);
}

// ---------------- modal builders ----------------

function openWorkoutModal(id) {
  const workout = workoutById(id);
  if (!workout) {
    toast('Workout not found.', 'error');
    return;
  }
  openModal({
    title: 'Workout details',
    subtitle: fmtDate(workout.date, { weekday: 'long', month: 'long', day: 'numeric' }),
    body: workoutDetailBody(workout),
    size: 'wide',
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-action="repeat-workout" data-workout="${workout.id}">${icon('reset', 14)} Repeat</button>
      <button class="btn btn-danger-ghost btn-sm" type="button" data-action="delete-workout" data-workout="${workout.id}">Delete</button>
      <button class="btn btn-ghost btn-sm" type="button" data-action="edit-workout" data-workout="${workout.id}">Edit</button>
      <button class="btn btn-primary btn-sm" type="button" data-modal-close>Close</button>`
  });
}

function openExerciseModal(id) {
  const exercise = exerciseById(id);
  if (!exercise) {
    toast('That exercise is no longer in your library.', 'error');
    return;
  }
  openModal({
    title: 'Exercise details',
    subtitle: `${exercise.isCustom ? 'Your custom exercise' : 'Built-in library exercise'} · ${exercise.difficulty}`,
    body: exerciseDetailBody(exercise),
    size: 'wide',
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Close</button>`,
    onClose: () => { if (currentModalExerciseId === id) currentModalExerciseId = null; }
  });
  currentModalExerciseId = id;
}

function openExercisePicker() {
  const session = currentSessionWorkout();
  if (!session) {
    toast('Start a workout first.', 'info');
    return;
  }
  const dialog = openModal({
    title: 'Add exercise',
    subtitle: 'Choose from your library. Sets will be prefilled from the last session when available.',
    body: exercisePickerBody(),
    size: 'wide',
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Close</button>`
  });
  const input = dialog.querySelector('[data-picker-search]');
  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      dialog.querySelectorAll('.picker-item').forEach((item) => {
        item.hidden = Boolean(q) && !(item.dataset.search || '').includes(q);
      });
    });
  }
}

function openRoutinePickerModal() {
  openModal({
    title: 'Start a routine',
    subtitle: 'A new editable workout will be created. Nothing already logged is changed.',
    body: routinePickerBody(),
    size: '',
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancel</button>`
  });
}

function openMoreMenu() {
  const tpl = document.getElementById('more-menu-template');
  if (!tpl) return;
  openModal({
    title: 'More',
    subtitle: 'Library, progress, planning and settings.',
    body: tpl.innerHTML,
    size: 'narrow',
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Close</button>`
  });
}

function openWeightModal(entry = null) {
  openModal({
    title: entry ? 'Edit weigh-in' : 'Add a weigh-in',
    subtitle: 'A dated, honest data point. Entries can be edited or removed later.',
    body: weightFormBody(entry),
    footer: formFooter('Save weight', 'weight-form'),
    size: ''
  });
}

function openMeasurementModal(entry = null) {
  openModal({
    title: entry ? 'Edit measurements' : 'Add measurements',
    subtitle: 'Leave blank any site you are not measuring today.',
    body: measurementFormBody(entry),
    footer: formFooter('Save measurements', 'measurement-form'),
    size: 'wide'
  });
}

function openPlanModal({ plan = null, date = todayISO() } = {}) {
  const selectedRoutine = plan?.routineId || '';
  const body = `<form id="plan-form" class="stack" novalidate>
    <input type="hidden" name="id" value="${escapeHTML(plan?.id || '')}">
    <div class="field-grid">
      <div class="field">
        <label for="plan-date">Date</label>
        <input class="input" id="plan-date" name="date" type="date" required value="${escapeHTML(plan?.date || date)}">
        <span class="field-error" data-error-for="date"></span>
      </div>
      <div class="field">
        <label for="plan-routine">Routine</label>
        <select class="select" id="plan-routine" name="routineId">
          <option value="">Custom session</option>
          ${state.routines.map((r) => `<option value="${escapeHTML(r.id)}" ${selectedRoutine === r.id ? 'selected' : ''}>${escapeHTML(r.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field">
      <label for="plan-name">Session name</label>
      <input class="input" id="plan-name" name="name" maxlength="70" value="${escapeHTML(plan?.name || '')}" placeholder="Leave blank to use the routine name">
      <span class="field-error" data-error-for="name"></span>
    </div>
    <div class="notice">${icon('info', 15)}<span>Plan a future session or backfill one in the past. A planned workload that is not completed stays planned unless you explicitly mark it skipped.</span></div>
  </form>`;
  openModal({
    title: plan ? 'Edit planned session' : 'Plan a session',
    subtitle: 'Plans live separately from workout history.',
    body,
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancel</button><button class="btn btn-primary btn-sm" type="submit" form="plan-form">${plan ? 'Save changes' : 'Add to plan'}</button>`,
    size: ''
  });
}

function openMovePlanModal({ id, date, auto, routineId }) {
  const body = `<form id="move-plan-form" class="stack" novalidate>
    <input type="hidden" name="id" value="${escapeHTML(id)}">
    <input type="hidden" name="auto" value="${auto ? '1' : '0'}">
    <input type="hidden" name="routineId" value="${escapeHTML(routineId || '')}">
    <div class="field">
      <label for="move-date">Move this session to</label>
      <input class="input" id="move-date" name="date" type="date" required value="${escapeHTML(addDays(date, 1))}">
      <span class="field-error" data-error-for="date"></span>
    </div>
    <div class="notice">${icon('info', 15)}<span>The weekly template is not changed. Only this scheduled session moves.</span></div>
  </form>`;
  openModal({
    title: 'Move planned session',
    subtitle: 'Choose a different date for this plan.',
    body,
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancel</button><button class="btn btn-primary btn-sm" type="submit" form="move-plan-form">Move session</button>`,
    size: 'narrow'
  });
}

function openPhotoViewer(photo) {
  if (!photo?.blob) {
    toast('The full photo is not available in this browser.', 'error');
    return;
  }
  const url = URL.createObjectURL(photo.blob);
  openModal({
    title: 'Progress photo',
    body: photoViewerBody(photo, url),
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Close</button>`,
    size: ''
  });
  trackModalUrl(url);
}

function openComparePhotos() {
  const a = photoById(state.ui.progress.photoA);
  const b = photoById(state.ui.progress.photoB);
  if (!a || !b || !a.blob || !b.blob) {
    toast('Choose two available photos to compare.', 'info');
    return;
  }
  const urlA = URL.createObjectURL(a.blob);
  const urlB = URL.createObjectURL(b.blob);
  openModal({
    title: 'Compare progress photos',
    subtitle: `${fmtDate(a.date, { month: 'short', day: 'numeric', year: 'numeric' })} → ${fmtDate(b.date, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    body: photoCompareBody(a, b, urlA, urlB),
    footer: `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Close</button>`,
    size: 'wide'
  });
  trackModalUrl(urlA);
  trackModalUrl(urlB);
}

function openCustomExerciseModal(exercise = null) {
  openModal({
    title: exercise ? 'Edit custom exercise' : 'Create a custom exercise',
    subtitle: 'Custom movements behave like library exercises, with their own history and muscle mapping.',
    body: customExerciseFormBody(exercise),
    footer: exerciseFormFooter(exercise),
    size: 'wide'
  });
}

// ---------------- workout flows ----------------

function guardActiveSession() {
  const active = activeWorkout();
  if (!active) return false;
  openSession(active.id);
  toast('You already have an open session. Pick it up here, or discard it to start fresh.', 'info', 3600);
  return true;
}

async function startBlank(date = todayISO()) {
  if (guardActiveSession()) return;
  if (!isValidISO(date) || date > TODAY()) {
    toast('Choose today or an earlier date for a workout.', 'error');
    return;
  }
  try {
    const workout = makeWorkout({ name: 'Training session', date });
    await saveWorkout(workout);
    openSession(workout.id);
    toast('Blank session ready. Add your first exercise.', 'success', 2200);
  } catch (error) {
    showError(error);
  }
}

async function startRoutine(id) {
  if (guardActiveSession()) return;
  const routine = routineById(id);
  if (!routine) {
    toast('That routine no longer exists.', 'error');
    return;
  }
  try {
    const workout = makeWorkout({ name: routine.name, routine, date: TODAY() });
    await saveWorkout(workout);
    closeModal();
    openSession(workout.id);
  } catch (error) {
    showError(error);
  }
}

async function startPlan({ date, routineId, planId, auto }) {
  if (guardActiveSession()) return;
  if (!isValidISO(date)) {
    toast('That planned date is invalid.', 'error');
    return;
  }
  if (date > TODAY()) {
    toast('This session is scheduled for a future day. You can start it then, or move it to today.', 'info', 3800);
    return;
  }
  let plan = !auto && planId ? state.plans.find((p) => p.id === planId) : null;
  const routine = routineById(routineId) || (plan?.routineId ? routineById(plan.routineId) : null);
  if (!routine && !plan) {
    toast('The routine for this session could not be found.', 'error');
    return;
  }
  if (plan?.workoutId) {
    const linked = workoutById(plan.workoutId);
    if (linked?.status === 'in-progress') {
      openSession(linked.id);
      return;
    }
    if (linked?.status === 'completed') {
      toast('This planned session is already completed.', 'info');
      return;
    }
  }
  try {
    if (!plan) {
      plan = makePlan({ date, routine, name: routine?.name, source: auto ? 'template' : 'manual' });
      await savePlan(plan);
    }
    const workout = makeWorkout({
      name: plan.name || routine?.name || 'Planned session',
      routine,
      date,
      planId: plan.id
    });
    await saveWorkout(workout);
    await savePlan({ ...plan, status: 'in-progress', workoutId: workout.id });
    closeModal();
    openSession(workout.id);
  } catch (error) {
    showError(error);
  }
}

async function repeatWorkout(id) {
  const source = workoutById(id);
  if (!source) {
    toast('Workout not found.', 'error');
    return;
  }
  if (guardActiveSession()) return;
  try {
    const copy = {
      ...source,
      id: uid('workout'),
      name: `${source.name} (repeat)`,
      date: TODAY(),
      status: 'in-progress',
      startedAt: Date.now(),
      finishedAt: null,
      durationSec: null,
      durationManual: false,
      planId: null,
      notes: source.notes || '',
      exercises: (source.exercises || []).map((wex) => ({
        ...wex,
        uid: uid('wex'),
        notes: wex.notes || '',
        sets: (wex.sets || []).map((set) => ({
          ...set,
          id: uid('set'),
          completed: false
        }))
      }))
    };
    await saveWorkout(copy);
    closeModal();
    openSession(copy.id);
    toast('A fresh copy is ready — your original workout is untouched.', 'success', 2600);
  } catch (error) {
    showError(error);
  }
}

async function finishWorkout() {
  if (finishing) return;
  const session = currentSessionWorkout();
  if (!session) return;
  const completedWorking = workingSets(session).length;
  if (!completedWorking) {
    toast('Mark at least one working set complete before finishing.', 'error', 3600);
    return;
  }
  finishing = true;
  clearSaveTimer();
  const wasEditing = session.status === 'completed';
  const previousFinishedAt = session.finishedAt;
  const now = Date.now();
  const final = {
    ...session,
    status: 'completed',
    finishedAt: wasEditing && previousFinishedAt ? previousFinishedAt : now
  };
  if (!wasEditing && !final.durationManual) {
    const elapsed = Math.round((now - (session.startedAt || now)) / 1000);
    final.durationSec = elapsed > 30 && elapsed < 6 * 3600 ? elapsed : (final.durationSec || null);
  }
  if (!final.date || !isValidISO(final.date)) final.date = TODAY();
  try {
    await saveWorkout(final);
    if (final.planId) {
      const plan = state.plans.find((p) => p.id === final.planId);
      if (plan) {
        try {
          await savePlan({ ...plan, status: 'completed', workoutId: final.id });
        } catch (planError) {
          console.error(planError);
          toast('The workout saved, but its planned session could not be updated.', 'warn', 4200);
        }
      }
    }
    saveStatus = 'saved';
    openWorkoutId = null;
    state.route = 'workouts';
    renderCurrent({ scroll: true });
    openModal({
      title: 'Session summary',
      body: summaryModalBody(final, { justFinished: !wasEditing }),
      size: 'wide',
      footer: `<button class="btn btn-ghost btn-sm" type="button" data-action="goto-progress">View progress</button><button class="btn btn-primary btn-sm" type="button" data-modal-close>Done</button>`
    });
    toast(wasEditing ? 'Workout changes saved.' : 'Session saved locally.', 'success', 2400);
  } catch (error) {
    saveStatus = 'error';
    syncSaveIndicator();
    showError(error);
  } finally {
    finishing = false;
  }
}

async function closeSession() {
  const session = currentSessionWorkout();
  if (session) {
    clearSaveTimer();
    const saved = await persistWorkout(session.id);
    if (!saved) return;
  }
  openWorkoutId = null;
  state.route = 'workouts';
  renderCurrent({ scroll: true });
}

async function discardWorkout(id) {
  const session = workoutById(id) || currentSessionWorkout();
  if (!session) return;
  const ok = await confirmDialog({
    title: 'Discard this session?',
    message: 'The workout and its unfinished sets will be deleted from this browser. A linked planned session returns to planned. This cannot be undone.',
    confirmLabel: 'Discard session',
    danger: true
  });
  if (!ok) return;
  try {
    clearSaveTimer();
    await deleteWorkoutRecord(session.id);
    openWorkoutId = null;
    state.route = 'workouts';
    renderCurrent({ scroll: true });
    toast('Session discarded.', 'info');
  } catch (error) {
    showError(error);
  }
}

async function deleteWorkout(id) {
  const workout = workoutById(id);
  if (!workout) return;
  const ok = await confirmDialog({
    title: 'Delete this workout?',
    message: 'It will be removed from history and every derived score, chart and record will be recalculated. This cannot be undone.',
    confirmLabel: 'Delete workout',
    danger: true
  });
  if (!ok) return;
  try {
    clearSaveTimer();
    await deleteWorkoutRecord(id);
    closeModal();
    if (state.route === 'session') {
      openWorkoutId = null;
      state.route = 'workouts';
    }
    renderCurrent();
    toast('Workout deleted.', 'info');
  } catch (error) {
    showError(error);
  }
}

// ---------------- session mutations ----------------

function getSet(workout, wexUid, setId) {
  const wex = workout?.exercises?.find((e) => e.uid === wexUid);
  const set = wex?.sets?.find((s) => s.id === setId);
  return { wex, set };
}

function handleWorkoutNumericChange(input, silent = false) {
  const workout = currentSessionWorkout();
  if (!workout) return;
  const { wex, set } = getSet(workout, input.dataset.wex, input.dataset.set);
  if (!wex || !set) return;
  const field = input.dataset.field;
  const raw = input.value.trim();
  const unitsSystem = state.profile?.unitSystem === 'imperial' ? 'imperial' : 'metric';
  if (raw === '') {
    if (field === 'rpe') set.rpe = null;
    else if (field === 'weight') set.weightKg = null;
    else if (field === 'reps') set.reps = null;
    else if (field === 'duration') set.durationSec = null;
    input.removeAttribute('aria-invalid');
    scheduleSave(workout);
    refreshSessionSummary(workout);
    return;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) {
    input.setAttribute('aria-invalid', 'true');
    if (!silent) toast('Use a number of zero or more.', 'error', 2800);
    return;
  }
  if (field === 'weight') {
    const max = unitsSystem === 'imperial' ? 1100 : 500;
    if (num > max) { input.setAttribute('aria-invalid', 'true'); if (!silent) toast('That weight looks too large.', 'error'); return; }
    set.weightKg = roundTo(displayToKg(num, unitsSystem), 2);
  } else if (field === 'reps') {
    if (num > 999) { input.setAttribute('aria-invalid', 'true'); if (!silent) toast('Repetitions must be 999 or fewer.', 'error'); return; }
    set.reps = Math.round(num);
  } else if (field === 'duration') {
    if (num > 86400) { input.setAttribute('aria-invalid', 'true'); if (!silent) toast('That duration is too long.', 'error'); return; }
    set.durationSec = Math.round(num);
  } else if (field === 'rpe') {
    if (num < 1 || num > 10) { input.setAttribute('aria-invalid', 'true'); if (!silent) toast('RPE is 1–10, or leave it blank.', 'error'); return; }
    set.rpe = num;
  }
  input.removeAttribute('aria-invalid');
  scheduleSave(workout);
  refreshSessionSummary(workout);
}

function refreshSessionSummary(workout) {
  const holder = document.getElementById('session-summary');
  if (holder) holder.innerHTML = sessionSummaryHTML(workout);
}

function toggleSet(wexUid, setId) {
  const workout = currentSessionWorkout();
  if (!workout) return;
  const { wex, set } = getSet(workout, wexUid, setId);
  if (!wex || !set) return;
  if (!set.completed) {
    const flags = trackingFlags(wex.tracking);
    if (flags.reps && !(Number(set.reps) > 0)) {
      toast('Add repetitions before marking this set complete.', 'error');
      return;
    }
    if (flags.duration && !(Number(set.durationSec) > 0)) {
      toast('Add a duration before marking this set complete.', 'error');
      return;
    }
  }
  set.completed = !set.completed;
  scheduleSave(workout);
  renderCurrent();
  if (set.completed && prefs.get('autoRest') && set.type !== 'warmup') {
    startTimer(defaultRest());
  }
}

function addSet(wexUid) {
  const workout = currentSessionWorkout();
  if (!workout) return;
  const wex = workout.exercises?.find((e) => e.uid === wexUid);
  if (!wex) return;
  const last = wex.sets[wex.sets.length - 1] || {};
  wex.sets.push({
    id: uid('set'),
    type: 'working',
    completed: false,
    reps: last.reps ?? null,
    weightKg: last.weightKg ?? null,
    durationSec: last.durationSec ?? null,
    rpe: null
  });
  scheduleSave(workout);
  renderCurrent();
}

function copyLastSet(wexUid) {
  const workout = currentSessionWorkout();
  const wex = workout?.exercises?.find((e) => e.uid === wexUid);
  if (!wex || !wex.sets.length) return;
  const last = wex.sets[wex.sets.length - 1];
  wex.sets.push({ ...last, id: uid('set'), completed: false });
  scheduleSave(workout);
  renderCurrent();
}

async function removeSet(wexUid, setId) {
  const workout = currentSessionWorkout();
  const { wex, set } = getSet(workout, wexUid, setId);
  if (!wex || !set) return;
  if (set.completed) {
    const ok = await confirmDialog({
      title: 'Remove a completed set?',
      message: 'It will stop counting toward volume, records and your muscle map.',
      confirmLabel: 'Remove set',
      danger: true
    });
    if (!ok) return;
  }
  wex.sets = wex.sets.filter((s) => s.id !== setId);
  scheduleSave(workout);
  renderCurrent();
}

function toggleWarmup(wexUid, setId) {
  const workout = currentSessionWorkout();
  const { wex, set } = getSet(workout, wexUid, setId);
  if (!wex || !set) return;
  set.type = set.type === 'warmup' ? 'working' : 'warmup';
  scheduleSave(workout);
  renderCurrent();
}

async function removeExercise(wexUid) {
  const workout = currentSessionWorkout();
  if (!workout) return;
  const wex = workout.exercises?.find((e) => e.uid === wexUid);
  if (!wex) return;
  const hasCompleted = wex.sets?.some((s) => s.completed);
  if (hasCompleted) {
    const ok = await confirmDialog({
      title: `Remove ${wex.name}?`,
      message: 'Its completed sets will no longer count toward this workout.',
      confirmLabel: 'Remove exercise',
      danger: true
    });
    if (!ok) return;
  }
  workout.exercises = workout.exercises.filter((e) => e.uid !== wexUid);
  scheduleSave(workout);
  renderCurrent();
}

function moveExercise(wexUid, dir) {
  const workout = currentSessionWorkout();
  if (!workout?.exercises) return;
  const index = workout.exercises.findIndex((e) => e.uid === wexUid);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= workout.exercises.length) return;
  const [item] = workout.exercises.splice(index, 1);
  workout.exercises.splice(target, 0, item);
  scheduleSave(workout);
  renderCurrent();
}

async function addExerciseToWorkout(exerciseId) {
  const workout = currentSessionWorkout();
  const exercise = exerciseById(exerciseId);
  if (!workout || !exercise) {
    toast('That exercise is unavailable.', 'error');
    return;
  }
  if (workout.exercises?.some((e) => e.exerciseId === exerciseId)) {
    toast('That exercise is already in this session. Add a set to it instead.', 'info');
    return;
  }
  try {
    const wex = makeWorkoutExercise(exercise);
    workout.exercises = workout.exercises || [];
    workout.exercises.push(wex);
    await saveWorkout(workout);
    closeModal();
    openSession(workout.id);
    toast(`${exercise.name} added.`, 'success', 1800);
  } catch (error) {
    showError(error);
  }
}

async function toggleFavouriteAction(id) {
  const exercise = exerciseById(id);
  if (!exercise) return;
  try {
    await toggleFavourite(id);
    toast(exercise.favourite ? 'Removed from favourites.' : 'Added to favourites.', 'success', 1700);
    if (currentModalExerciseId === id) {
      openExerciseModal(id);
    } else if (state.route === 'library') {
      const container = document.getElementById('library-results');
      if (container) {
        container.innerHTML = libraryResultsHTML();
        hydrateIcons(container);
      }
    }
  } catch (error) {
    showError(error);
  }
}

// ---------------- calendar & plan actions ----------------

async function skipPlan({ planId, auto, date, routineId }) {
  const ok = await confirmDialog({
    title: 'Mark this session as skipped?',
    message: 'Skipped is different from missed: this records a deliberate decision. You can restore it later. Nothing in your workout history changes.',
    confirmLabel: 'Mark skipped',
    danger: false
  });
  if (!ok) return;
  try {
    let plan = !auto ? state.plans.find((p) => p.id === planId) : null;
    if (auto) {
      const routine = routineById(routineId);
      plan = makePlan({ date, routine, name: routine?.name || 'Planned session', source: 'template' });
      await savePlan(plan);
    }
    if (!plan) { toast('Plan not found.', 'error'); return; }
    if (plan.workoutId) {
      const linked = workoutById(plan.workoutId);
      if (linked?.status === 'in-progress') {
        toast('Finish or discard the open workout before skipping this session.', 'info');
        return;
      }
    }
    await savePlan({ ...plan, status: 'skipped', workoutId: null });
    renderCurrent();
    toast('Session marked skipped.', 'success', 2200);
  } catch (error) {
    showError(error);
  }
}

async function restorePlan(planId) {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) return;
  try {
    await savePlan({ ...plan, status: 'planned', workoutId: null });
    renderCurrent();
    toast('Planned session restored.', 'success', 2000);
  } catch (error) {
    showError(error);
  }
}

async function deletePlanAction(planId) {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) return;
  const ok = await confirmDialog({
    title: 'Delete this planned session?',
    message: 'The plan will be removed. Completed workouts stay in your history unchanged.',
    confirmLabel: 'Delete plan',
    danger: true
  });
  if (!ok) return;
  try {
    await deletePlan(planId);
    renderCurrent();
    toast('Planned session deleted.', 'info');
  } catch (error) {
    showError(error);
  }
}

// ---------------- library custom exercises ----------------

async function saveCustomExerciseForm(form) {
  clearFormErrors(form);
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const primary = data.getAll('primary').map(String);
  const secondary = data.getAll('secondary').map(String).filter((m) => !primary.includes(m));
  const equipment = data.getAll('equipment').map(String);
  const instructions = String(data.get('instructions') || '').trim();
  const editingId = String(data.get('id') || '');
  const existing = editingId ? exerciseById(editingId) : null;
  let valid = true;
  if (name.length < 2) { setFieldError(form, 'name', 'Give the exercise a name of at least 2 characters.'); valid = false; }
  if (!primary.length) { setFieldError(form, 'primary', 'Choose at least one primary muscle.'); valid = false; }
  if (!equipment.length) { setFieldError(form, 'equipment', 'Choose at least one equipment option.'); valid = false; }
  if (!instructions) { setFieldError(form, 'instructions', 'Add a short instruction so future-you knows what to do.'); valid = false; }
  if (!valid) return;

  const sets = Math.max(1, Math.min(12, Number(data.get('sets')) || 3));
  const rest = Math.max(0, Math.min(600, Number(data.get('rest')) || 0));
  const tracking = String(data.get('tracking') || 'reps-weight');
  const flags = trackingFlags(tracking);
  const repMinRaw = data.get('repMin');
  const repMaxRaw = data.get('repMax');
  const repMin = flags.reps && repMinRaw !== '' ? Math.max(0, Math.min(100, Number(repMinRaw))) : null;
  const repMax = flags.reps && repMaxRaw !== '' ? Math.max(0, Math.min(100, Number(repMaxRaw))) : null;
  if (flags.reps && repMin != null && repMax != null && repMin > repMax) {
    setFieldError(form, 'instructions', 'Rep minimum cannot be greater than rep maximum.');
    return;
  }
  const duration = flags.duration ? Math.max(1, Math.min(7200, Number(data.get('duration')) || 30)) : null;
  const doc = {
    ...(existing || {}),
    id: existing?.id || uid('custom'),
    name,
    primary,
    secondary,
    equipment,
    pattern: String(data.get('pattern') || 'isolation'),
    difficulty: ['beginner', 'intermediate', 'advanced'].includes(String(data.get('difficulty'))) ? String(data.get('difficulty')) : 'beginner',
    tracking,
    instructions,
    tip: String(data.get('tip') || '').trim(),
    sets,
    repMin,
    repMax,
    rest,
    duration,
    isCustom: true,
    favourite: existing?.favourite || false,
    createdAt: existing?.createdAt || Date.now()
  };
  try {
    await saveExercise(doc);
    closeModal();
    currentModalExerciseId = null;
    if (['home', 'workouts', 'settings', 'planner'].includes(state.route)) {
      // keep context; library learns of it immediately
    }
    renderCurrent();
    toast(existing ? 'Custom exercise updated.' : 'Custom exercise created.', 'success', 2200);
  } catch (error) {
    showError(error);
  }
}

// ---------------- photo handling ----------------

async function handlePhotoInput(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const processed = await readPhotoFile(file);
    photoDraft = { ...processed, file };
    openModal({
      title: 'Save a progress photo',
      subtitle: 'Keep it dated and private in this browser.',
      body: photoFormBody(processed.thumb),
      footer: formFooter('Save photo', 'photo-form'),
      size: '',
      onClose: () => { photoDraft = null; }
    });
  } catch (error) {
    showError(error);
  }
}

// ---------------- settings ----------------

async function fillStorageInfo() {
  const numbers = document.getElementById('storage-numbers');
  const note = document.getElementById('storage-note');
  const fill = document.getElementById('storage-meter-fill');
  if (!numbers) return;
  if (!navigator.storage?.estimate) {
    numbers.textContent = 'Estimate unavailable in this browser';
    if (note) note.textContent = 'Your records are still stored locally. The browser does not expose a storage estimate here.';
    return;
  }
  try {
    const estimate = await navigator.storage.estimate();
    const usage = Number(estimate.usage) || 0;
    const quota = Number(estimate.quota) || 0;
    numbers.textContent = `${formatBytes(usage)}${quota ? ` of ~${formatBytes(quota)} available` : ''}`;
    if (fill) fill.style.width = `${quota ? Math.min(100, Math.max(1, (usage / quota) * 100)) : 0}%`;
    if (note) note.textContent = 'Browsers report approximate totals for this site, including photos and app caching.';
  } catch {
    numbers.textContent = 'Estimate unavailable';
  }
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${roundTo(n / 1024, 1)} KB`;
  if (n < 1024 ** 3) return `${roundTo(n / 1024 ** 2, 1)} MB`;
  return `${roundTo(n / 1024 ** 3, 1)} GB`;
}

// ---------------- routine editor ----------------

function newRoutineDraft(routine = null) {
  return {
    isNew: !routine,
    id: routine?.id || null,
    name: routine?.name || '',
    notes: routine?.notes || '',
    exercises: (routine?.exercises || []).map((row) => ({ ...row }))
  };
}

function openRoutineEditor(routine = null) {
  closeModal();
  state.ui.planner.draft = newRoutineDraft(routine);
  state.route = 'planner';
  renderCurrent({ scroll: true });
  setTimeout(() => document.getElementById('routine-name')?.focus(), 80);
}

function updateRoutineDraftFromInput(input) {
  const draft = state.ui.planner.draft;
  if (!draft) return;
  if (input.dataset.routineField) {
    draft[input.dataset.routineField] = input.value;
    return;
  }
  if (input.dataset.routineExerciseField) {
    const index = Number(input.dataset.index);
    const row = draft.exercises[index];
    if (!row) return;
    const field = input.dataset.routineExerciseField;
    const raw = input.value;
    if (field === 'weight') {
      row.weightKg = raw === '' ? null : roundTo(displayToKg(Number(raw), state.profile?.unitSystem || 'metric'), 2);
    } else {
      row[field] = raw === '' ? null : Number(raw);
    }
  }
}

async function saveRoutineDraft() {
  const draft = state.ui.planner.draft;
  if (!draft) return;
  const form = document.getElementById('routine-name');
  const nameError = document.getElementById('routine-name-error');
  const exercisesError = document.getElementById('routine-exercises-error');
  if (nameError) nameError.textContent = '';
  if (exercisesError) exercisesError.textContent = '';
  const name = String(draft.name || '').trim();
  if (name.length < 2) {
    if (nameError) nameError.textContent = 'Give the routine a name of at least 2 characters.';
    return;
  }
  if (!draft.exercises.length) {
    if (exercisesError) exercisesError.textContent = 'Add at least one exercise before saving.';
    return;
  }
  const missing = draft.exercises.find((row) => !exerciseById(row.exerciseId));
  if (missing) {
    if (exercisesError) exercisesError.textContent = 'One of the exercises is no longer in your library. Remove it and add another.';
    return;
  }
  const invalid = draft.exercises.find((row) => {
    const ex = exerciseById(row.exerciseId);
    const flags = trackingFlags(ex.tracking);
    if (!(Number(row.sets) >= 1 && Number(row.sets) <= 12)) return true;
    if (!(Number(row.rest) >= 0 && Number(row.rest) <= 600)) return true;
    if (flags.reps) {
      if (row.repMin == null || row.repMax == null) return true;
      if (Number(row.repMin) < 0 || Number(row.repMax) < 1 || Number(row.repMin) > Number(row.repMax)) return true;
    }
    if (flags.duration && !(Number(row.duration) >= 1)) return true;
    return false;
  });
  if (invalid) {
    if (exercisesError) exercisesError.textContent = 'Check the sets, rep range, duration or rest values for each exercise.';
    return;
  }
  const base = draft.isNew ? null : routineById(draft.id);
  const doc = {
    ...(base || {}),
    id: draft.id || undefined,
    name,
    notes: String(draft.notes || '').trim(),
    exercises: draft.exercises.map((row) => ({
      exerciseId: row.exerciseId,
      sets: Number(row.sets),
      repMin: row.repMin != null ? Number(row.repMin) : null,
      repMax: row.repMax != null ? Number(row.repMax) : null,
      rest: Number(row.rest),
      duration: row.duration != null ? Number(row.duration) : null,
      weightKg: row.weightKg != null ? Number(row.weightKg) : null
    })),
    order: base?.order ?? (state.routines.length * 10 + 10),
    seed: base?.seed ?? false
  };
  try {
    await saveRoutine(doc);
    state.ui.planner.draft = null;
    renderCurrent({ scroll: true });
    toast(draft.isNew ? 'Routine created.' : 'Routine updated.', 'success', 2200);
  } catch (error) {
    showError(error);
  }
}

async function moveRoutine(id, dir) {
  const index = state.routines.findIndex((r) => r.id === id);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= state.routines.length) return;
  const list = [...state.routines];
  const [item] = list.splice(index, 1);
  list.splice(target, 0, item);
  try {
    for (const [i, routine] of list.entries()) {
      await saveRoutine({ ...routine, order: i * 10 });
    }
    renderCurrent();
  } catch (error) {
    showError(error);
  }
}

// ---------------- action router ----------------

async function handleAction(action, el) {
  switch (action) {
    case 'start-blank':
      await startBlank(el.dataset.date || TODAY());
      break;
    case 'start-routine':
      await startRoutine(el.dataset.routine);
      break;
    case 'start-plan':
      await startPlan({ date: el.dataset.date || TODAY(), routineId: el.dataset.routine, planId: el.dataset.plan, auto: el.dataset.auto === '1' });
      break;
    case 'resume-workout': {
      const id = el.dataset.workout;
      const workout = workoutById(id);
      if (workout) openSession(workout.id);
      break;
    }
    case 'edit-workout': {
      const workout = workoutById(el.dataset.workout);
      closeModal();
      if (workout) openSession(workout.id);
      break;
    }
    case 'open-workout':
      openWorkoutModal(el.dataset.workout);
      break;
    case 'delete-workout':
      await deleteWorkout(el.dataset.workout);
      break;
    case 'repeat-workout':
      await repeatWorkout(el.dataset.workout);
      break;
    case 'discard-workout':
      await discardWorkout(el.dataset.workout);
      break;
    case 'leave-logger':
    case 'save-exit':
      await closeSession();
      break;
    case 'finish-workout':
      await finishWorkout();
      break;
    case 'retry-save': {
      const session = currentSessionWorkout();
      if (session) await persistWorkout(session.id);
      break;
    }
    case 'open-exercise-picker':
      openExercisePicker();
      break;
    case 'add-exercise-to-workout':
      await addExerciseToWorkout(el.dataset.exercise);
      break;
    case 'add-exercise-from-library':
      await addExerciseToWorkout(el.dataset.exercise);
      break;
    case 'add-set':
      addSet(el.dataset.wex);
      break;
    case 'copy-last-set':
      copyLastSet(el.dataset.wex);
      break;
    case 'remove-set':
      await removeSet(el.dataset.wex, el.dataset.set);
      break;
    case 'toggle-warmup':
      toggleWarmup(el.dataset.wex, el.dataset.set);
      break;
    case 'toggle-set':
      toggleSet(el.dataset.wex, el.dataset.set);
      break;
    case 'remove-exercise':
      await removeExercise(el.dataset.wex);
      break;
    case 'move-exercise':
      moveExercise(el.dataset.wex, Number(el.dataset.dir));
      break;
    case 'dismiss-suggestion': {
      const dismissed = { ...(prefs.get('overloadDismissed') || {}) };
      dismissed[el.dataset.key] = true;
      prefs.set('overloadDismissed', dismissed);
      renderCurrent();
      break;
    }
    case 'toggle-autorest':
      prefs.set('autoRest', !prefs.get('autoRest'));
      el.textContent = `Auto-start rest: ${prefs.get('autoRest') ? 'on' : 'off'}`;
      break;
    case 'toggle-favourite':
      await toggleFavouriteAction(el.dataset.exercise);
      break;
    case 'toggle-library-fav':
      state.ui.library.favOnly = !state.ui.library.favOnly;
      renderCurrent();
      break;
    case 'reset-library-filters':
      state.ui.library = { q: '', muscle: 'all', equipment: 'all', favOnly: false };
      renderCurrent();
      break;
    case 'open-exercise':
      openExerciseModal(el.dataset.exercise);
      break;
    case 'new-custom-exercise':
      openCustomExerciseModal();
      break;
    case 'edit-custom-exercise': {
      const exercise = exerciseById(el.dataset.exercise);
      if (exercise) openCustomExerciseModal(exercise);
      break;
    }
    case 'delete-custom-exercise': {
      const exercise = exerciseById(el.dataset.exercise);
      if (!exercise) break;
      const ok = await confirmDialog({
        title: `Delete ${exercise.name}?`,
        message: 'The custom exercise will leave your library. Past workouts and their recorded values are preserved using their own snapshot.',
        confirmLabel: 'Delete exercise',
        danger: true
      });
      if (!ok) break;
      try {
        await deleteExercise(exercise.id);
        closeModal();
        renderCurrent();
        toast('Custom exercise deleted. History was preserved.', 'info', 2600);
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'new-routine':
      openRoutineEditor();
      break;
    case 'edit-routine': {
      const routine = routineById(el.dataset.routine);
      if (routine) openRoutineEditor(routine);
      break;
    }
    case 'cancel-routine-editor':
      state.ui.planner.draft = null;
      renderCurrent({ scroll: true });
      break;
    case 'save-routine':
      await saveRoutineDraft();
      break;
    case 'add-routine-exercise': {
      const select = document.getElementById('routine-exercise-select');
      const draft = state.ui.planner.draft;
      if (!select || !draft) break;
      const exercise = exerciseById(select.value);
      if (!exercise) break;
      const flags = trackingFlags(exercise.tracking);
      draft.exercises.push({
        exerciseId: exercise.id,
        name: exercise.name,
        primary: [...(exercise.primary || [])],
        sets: exercise.sets || 3,
        repMin: flags.reps ? (exercise.repMin ?? 8) : null,
        repMax: flags.reps ? (exercise.repMax ?? 12) : null,
        rest: exercise.rest ?? 90,
        duration: flags.duration ? (exercise.duration ?? 30) : null,
        weightKg: null
      });
      renderCurrent();
      break;
    }
    case 'remove-routine-exercise': {
      const draft = state.ui.planner.draft;
      if (!draft) break;
      draft.exercises.splice(Number(el.dataset.index), 1);
      renderCurrent();
      break;
    }
    case 'move-routine-exercise': {
      const draft = state.ui.planner.draft;
      if (!draft) break;
      const index = Number(el.dataset.index);
      const target = index + Number(el.dataset.dir);
      if (target < 0 || target >= draft.exercises.length) break;
      const [row] = draft.exercises.splice(index, 1);
      draft.exercises.splice(target, 0, row);
      renderCurrent();
      break;
    }
    case 'duplicate-routine': {
      const routine = routineById(el.dataset.routine);
      if (!routine) break;
      try {
        const copy = await saveRoutine({
          ...routine,
          id: undefined,
          name: `${routine.name} copy`,
          seed: false,
          order: state.routines.length * 10 + 10,
          createdAt: Date.now(),
          exercises: (routine.exercises || []).map((row) => ({ ...row }))
        });
        renderCurrent();
        toast(`“${copy.name}” created.`, 'success', 2200);
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'delete-routine': {
      const routine = routineById(el.dataset.routine);
      if (!routine) break;
      const ok = await confirmDialog({
        title: `Delete “${routine.name}”?`,
        message: 'The routine and its weekly assignments will be removed. Completed workouts are not changed.',
        confirmLabel: 'Delete routine',
        danger: true
      });
      if (!ok) break;
      try {
        await deleteRoutine(routine.id);
        renderCurrent();
        toast('Routine deleted.', 'info');
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'move-routine':
      await moveRoutine(el.dataset.routine, Number(el.dataset.dir));
      break;
    case 'open-routine-picker':
      openRoutinePickerModal();
      break;
    case 'open-plan-dialog':
      openPlanModal({ date: el.dataset.date || state.ui.calendar.selected || TODAY() });
      break;
    case 'edit-plan': {
      const plan = state.plans.find((p) => p.id === el.dataset.plan);
      if (plan) openPlanModal({ plan });
      break;
    }
    case 'skip-plan':
      await skipPlan({ planId: el.dataset.plan, auto: el.dataset.auto === '1', date: el.dataset.date, routineId: el.dataset.routine });
      break;
    case 'restore-plan':
      await restorePlan(el.dataset.plan);
      break;
    case 'delete-plan':
      await deletePlanAction(el.dataset.plan);
      break;
    case 'move-plan':
      openMovePlanModal({ id: el.dataset.plan, date: el.dataset.date || TODAY(), auto: el.dataset.auto === '1', routineId: el.dataset.routine });
      break;
    case 'calendar-prev':
    case 'calendar-next': {
      const dir = action === 'calendar-prev' ? -1 : 1;
      if (state.ui.calendar.mode === 'week') {
        const selected = addDays(state.ui.calendar.selected || TODAY(), dir * 7);
        state.ui.calendar.selected = selected;
        state.ui.calendar.anchor = selected;
      } else {
        const anchor = parseISO(state.ui.calendar.anchor || TODAY());
        const next = new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1, 12);
        const iso = toISO(next);
        state.ui.calendar.anchor = iso;
        state.ui.calendar.selected = iso;
      }
      renderCurrent();
      break;
    }
    case 'calendar-today':
      state.ui.calendar.anchor = TODAY();
      state.ui.calendar.selected = TODAY();
      renderCurrent();
      break;
    case 'calendar-mode':
      state.ui.calendar.mode = el.dataset.mode === 'week' ? 'week' : 'month';
      if (state.ui.calendar.mode === 'week') {
        state.ui.calendar.anchor = startOfWeekISO(state.ui.calendar.selected || TODAY(), Number(prefs.get('weekStart')) || 1);
      }
      renderCurrent();
      break;
    case 'select-date': {
      const date = el.dataset.date;
      if (!isValidISO(date)) break;
      state.ui.calendar.selected = date;
      state.ui.calendar.anchor = date;
      state.route = 'calendar';
      renderCurrent({ scroll: true });
      break;
    }
    case 'goto-calendar':
      if (el.dataset.date && isValidISO(el.dataset.date)) {
        state.ui.calendar.selected = el.dataset.date;
        state.ui.calendar.anchor = el.dataset.date;
      }
      navigate('calendar');
      break;
    case 'goto-workouts':
      navigate('workouts');
      break;
    case 'goto-library':
      navigate('library');
      break;
    case 'goto-strength':
      navigate('strength');
      break;
    case 'goto-strength-muscle':
      if (el.dataset.muscle) state.ui.strength.muscle = el.dataset.muscle;
      navigate('strength');
      break;
    case 'goto-progress':
      if (el.dataset.progressTab) state.ui.progress.tab = el.dataset.progressTab;
      navigate('progress');
      break;
    case 'goto-progress-photos':
      state.ui.progress.tab = 'photos';
      navigate('progress');
      break;
    case 'goto-planner':
      navigate('planner');
      break;
    case 'select-muscle':
      if (el.dataset.muscle) {
        state.ui.strength.muscle = el.dataset.muscle;
        if (state.route !== 'strength') navigate('strength');
        else renderCurrent();
      }
      break;
    case 'progress-tab':
      state.ui.progress.tab = el.dataset.tab;
      renderCurrent();
      break;
    case 'weight-range':
      state.ui.progress.range = Number(el.dataset.range) || 0;
      renderCurrent();
      break;
    case 'open-weight-modal':
      openWeightModal();
      break;
    case 'edit-weight': {
      const entry = state.weights.find((w) => w.id === el.dataset.entry);
      if (entry) openWeightModal(entry);
      break;
    }
    case 'delete-weight': {
      const entry = state.weights.find((w) => w.id === el.dataset.entry);
      if (!entry) break;
      const ok = await confirmDialog({
        title: 'Delete this weigh-in?',
        message: 'The entry will be removed from your trend and relative-strength estimates.',
        confirmLabel: 'Delete entry',
        danger: true
      });
      if (!ok) break;
      try {
        await deleteWeight(entry.id);
        renderCurrent();
        toast('Weigh-in deleted.', 'info');
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'open-measurement':
      openMeasurementModal();
      break;
    case 'edit-measurement': {
      const entry = state.measurements.find((m) => m.id === el.dataset.entry);
      if (entry) openMeasurementModal(entry);
      break;
    }
    case 'delete-measurement': {
      const entry = state.measurements.find((m) => m.id === el.dataset.entry);
      if (!entry) break;
      const ok = await confirmDialog({
        title: 'Delete these measurements?',
        message: 'The whole dated measurement entry will be removed.',
        confirmLabel: 'Delete entry',
        danger: true
      });
      if (!ok) break;
      try {
        await deleteMeasurement(entry.id);
        renderCurrent();
        toast('Measurement entry deleted.', 'info');
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'toggle-photo-select': {
      const id = el.dataset.photo;
      const ui = state.ui.progress;
      if (ui.photoA === id) ui.photoA = '';
      else if (ui.photoB === id) ui.photoB = '';
      else if (!ui.photoA) ui.photoA = id;
      else if (!ui.photoB) ui.photoB = id;
      else { ui.photoA = ui.photoB; ui.photoB = id; }
      renderCurrent();
      break;
    }
    case 'clear-photo-selection':
      state.ui.progress.photoA = '';
      state.ui.progress.photoB = '';
      renderCurrent();
      break;
    case 'compare-photos':
      openComparePhotos();
      break;
    case 'open-photo': {
      const photo = photoById(el.dataset.photo);
      if (photo) openPhotoViewer(photo);
      break;
    }
    case 'delete-photo': {
      const photo = photoById(el.dataset.photo);
      if (!photo) break;
      const ok = await confirmDialog({
        title: 'Delete this progress photo?',
        message: 'The photo blob and thumbnail will be removed from this browser. This cannot be undone.',
        confirmLabel: 'Delete photo',
        danger: true
      });
      if (!ok) break;
      try {
        await deletePhoto(photo.id);
        if (state.ui.progress.photoA === photo.id) state.ui.progress.photoA = '';
        if (state.ui.progress.photoB === photo.id) state.ui.progress.photoB = '';
        closeModal();
        renderCurrent();
        toast('Photo deleted.', 'info');
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'scroll-settings': {
      const section = document.getElementById(el.dataset.section);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.querySelector('input, select, button, textarea')?.focus({ preventScroll: true });
      }
      break;
    }
    case 'open-profile-edit':
      navigate('settings');
      setTimeout(() => {
        const section = document.getElementById('settings-profile');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      break;
    case 'clear-data': {
      const ok = await confirmDialog({
        title: 'Clear all personal data?',
        message: 'This permanently removes your profile, every workout, routine, planned session, weight, measurement and local photo from this browser. Built-in exercises return and preferences reset. This cannot be undone.',
        confirmLabel: 'Clear everything',
        danger: true
      });
      if (!ok) break;
      try {
        clearSaveTimer();
        photoDraft = null;
        await clearAllPersonalData();
        timer = emptyTimer();
        persistTimer();
        openWorkoutId = null;
        onboardingShown = false;
        applyTheme();
        renderCurrent({ scroll: true });
        maybeOnboarding();
        toast('Personal data cleared. A fresh space is ready.', 'info', 3200);
      } catch (error) {
        showError(error);
      }
      break;
    }
    case 'skip-onboarding':
      prefs.set('onboardSkipped', true);
      closeModal();
      toast('You can finish your profile any time in Settings.', 'info', 3000);
      renderCurrent();
      break;
    default:
      break;
  }
}

// ---------------- form submissions ----------------

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  // Read the attribute: a form control named "id" shadows form.id in JS.
  const id = form.getAttribute('id') || '';
  if (id === 'onboarding-form') {
    event.preventDefault();
    clearFormErrors(form);
    const draft = collectOnboarding(form, form.dataset.units === 'imperial' ? 'imperial' : 'metric');
    let valid = true;
    if (draft.heightCm != null && (draft.heightCm < 50 || draft.heightCm > 260)) {
      setFieldError(form, 'height', 'Enter a height between 50 and 260 cm (about 3′4″–8′6″).');
      valid = false;
    }
    if (draft.weightKg != null && (!(draft.weightKg > 0) || draft.weightKg > 500)) {
      setFieldError(form, 'weight', 'Enter a weight between 0 and 500 kg.');
      valid = false;
    }
    if (draft.targetWeightKg != null && (!(draft.targetWeightKg > 0) || draft.targetWeightKg > 500)) {
      setFieldError(form, 'weight', 'Target weight should be a positive, realistic number.');
      valid = false;
    }
    if (!(draft.weeklyTarget >= 1 && draft.weeklyTarget <= 7)) {
      setFieldError(form, 'weeklyTarget', 'Choose between 1 and 7 sessions per week.');
      valid = false;
    }
    if (draft.dob && (!isValidISO(draft.dob) || draft.dob > TODAY())) {
      setFieldError(form, 'dob', 'Choose a valid birth date that is not in the future.');
      valid = false;
    }
    if (!valid) return;
    try {
      await saveProfile({
        ...state.profile,
        name: draft.name,
        dob: draft.dob,
        heightCm: draft.heightCm,
        targetWeightKg: draft.targetWeightKg,
        unitSystem: draft.unitSystem,
        experience: draft.experience,
        goals: draft.goals,
        equipment: draft.equipment,
        weeklyTarget: draft.weeklyTarget,
        trainingDays: draft.trainingDays,
        onboarded: true
      });
      if (draft.weightKg) {
        const existing = state.weights.find((w) => w.date === TODAY());
        await saveWeight({
          ...(existing || {}),
          id: existing?.id || uid('weight'),
          date: TODAY(),
          weightKg: draft.weightKg,
          note: existing?.note || 'Starting weight'
        });
      }
      prefs.set('onboardSkipped', true);
      closeModal();
      renderCurrent({ scroll: true });
      toast('Your space is ready. Start with one small session.', 'success', 3200);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'profile-form') {
    event.preventDefault();
    clearFormErrors(form);
    const data = new FormData(form);
    const unitsSystem = state.profile?.unitSystem === 'imperial' ? 'imperial' : 'metric';
    let heightCm = null;
    let valid = true;
    if (unitsSystem === 'imperial') {
      const feetRaw = String(data.get('heightFeet') || '').trim();
      const inchesRaw = String(data.get('heightInches') || '').trim();
      if (feetRaw || inchesRaw) {
        const feet = Number(feetRaw || 0);
        const inches = Number(inchesRaw || 0);
        if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches < 0 || inches > 11) {
          setFieldError(form, 'height', 'Enter feet and inches as numbers (inches 0–11).');
          valid = false;
        } else {
          heightCm = (feet * 12 + inches) * 2.54;
          if (heightCm < 50 || heightCm > 260) {
            setFieldError(form, 'height', 'Enter a height between 50 and 260 cm.');
            valid = false;
          }
        }
      }
    } else {
      const raw = String(data.get('heightCm') || '').trim();
      if (raw) {
        heightCm = Number(raw);
        if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260) {
          setFieldError(form, 'height', 'Enter a height between 50 and 260 cm.');
          valid = false;
        }
      }
    }
    const targetRaw = String(data.get('targetWeight') || '').trim();
    let targetWeightKg = null;
    if (targetRaw) {
      targetWeightKg = displayToKg(Number(targetRaw), unitsSystem);
      if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0 || targetWeightKg > 500) {
        setFieldError(form, 'targetWeight', 'Enter a realistic target weight.');
        valid = false;
      }
    }
    const weeklyTarget = Number(data.get('weeklyTarget'));
    if (!(weeklyTarget >= 1 && weeklyTarget <= 7)) {
      setFieldError(form, 'weeklyTarget', 'Choose 1–7 sessions per week.');
      valid = false;
    }
    const dob = String(data.get('dob') || '');
    if (dob && (!isValidISO(dob) || dob > TODAY())) {
      setFieldError(form, 'dob', 'Choose a valid birth date.');
      valid = false;
    }
    if (!valid) return;
    try {
      await saveProfile({
        ...state.profile,
        name: String(data.get('name') || '').trim(),
        dob,
        heightCm,
        targetWeightKg,
        experience: String(data.get('experience') || 'beginner'),
        weeklyTarget,
        goals: data.getAll('goals').map(String),
        equipment: data.getAll('equipment').map(String),
        trainingDays: data.getAll('trainingDays').map(Number)
      });
      renderCurrent();
      toast('Profile saved.', 'success', 2000);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'units-form') {
    event.preventDefault();
    const value = new FormData(form).get('unitSystem') === 'imperial' ? 'imperial' : 'metric';
    try {
      await saveProfile({ ...state.profile, unitSystem: value });
      renderCurrent();
      toast(`Units switched to ${value === 'imperial' ? 'imperial' : 'metric'}.`, 'success', 2000);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'weight-form') {
    event.preventDefault();
    clearFormErrors(form);
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    const unitsSystem = state.profile?.unitSystem === 'imperial' ? 'imperial' : 'metric';
    let valid = true;
    if (!isValidISO(date) || date > TODAY()) {
      setFieldError(form, 'date', 'Choose a valid date that is not in the future.');
      valid = false;
    }
    const raw = String(data.get('weight') || '').trim();
    const weightKg = raw ? displayToKg(Number(raw), unitsSystem) : NaN;
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      setFieldError(form, 'weight', 'Enter a positive weight.');
      valid = false;
    }
    if (!valid) return;
    const existing = String(data.get('id') || '') ? state.weights.find((w) => w.id === String(data.get('id'))) : null;
    try {
      await saveWeight({
        ...(existing || {}),
        id: existing?.id || uid('weight'),
        date,
        weightKg: roundTo(weightKg, 2),
        note: String(data.get('note') || '').trim()
      });
      closeModal();
      renderCurrent();
      toast('Weigh-in saved.', 'success', 2000);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'measurement-form') {
    event.preventDefault();
    clearFormErrors(form);
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    const unitsSystem = state.profile?.unitSystem === 'imperial' ? 'imperial' : 'metric';
    let valid = true;
    if (!isValidISO(date) || date > TODAY()) {
      setFieldError(form, 'date', 'Choose a valid date that is not in the future.');
      valid = false;
    }
    const values = {};
    for (const { key } of MEASUREMENT_KEYS) {
      const raw = String(data.get(key) || '').trim();
      if (!raw) continue;
      const cm = displayToCm(Number(raw), unitsSystem);
      if (!Number.isFinite(cm) || cm <= 0 || cm > 300) {
        setFieldError(form, 'values', `Check the ${key} value — it should be a positive measurement.`);
        valid = false;
        break;
      }
      values[key] = roundTo(cm, 2);
    }
    if (!valid) return;
    if (!Object.keys(values).length) {
      setFieldError(form, 'values', 'Add at least one measurement, or cancel.');
      return;
    }
    const existing = String(data.get('id') || '') ? state.measurements.find((m) => m.id === String(data.get('id'))) : null;
    try {
      await saveMeasurement({
        ...(existing || {}),
        id: existing?.id || uid('measure'),
        date,
        values
      });
      closeModal();
      state.ui.progress.tab = 'measurements';
      state.route = 'progress';
      renderCurrent({ scroll: true });
      toast('Measurements saved.', 'success', 2000);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'photo-form') {
    event.preventDefault();
    clearFormErrors(form);
    if (!photoDraft) {
      toast('The selected photo is no longer available. Please choose it again.', 'error');
      return;
    }
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    if (!isValidISO(date) || date > TODAY()) {
      setFieldError(form, 'date', 'Choose a valid date that is not in the future.');
      return;
    }
    try {
      await savePhoto({
        id: uid('photo'),
        date,
        category: String(data.get('category') || 'Progress'),
        note: String(data.get('note') || '').trim(),
        mime: photoDraft.mime || photoDraft.file?.type || 'image/jpeg',
        blob: photoDraft.file,
        thumb: photoDraft.thumb,
        width: photoDraft.width,
        height: photoDraft.height,
        createdAt: Date.now()
      });
      photoDraft = null;
      closeModal();
      state.ui.progress.tab = 'photos';
      state.route = 'progress';
      renderCurrent({ scroll: true });
      toast('Photo saved locally.', 'success', 2200);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'custom-exercise-form') {
    event.preventDefault();
    await saveCustomExerciseForm(form);
    return;
  }

  if (id === 'plan-form') {
    event.preventDefault();
    clearFormErrors(form);
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    if (!isValidISO(date)) {
      setFieldError(form, 'date', 'Choose a valid date.');
      return;
    }
    const routine = routineById(String(data.get('routineId') || ''));
    const name = String(data.get('name') || '').trim() || routine?.name || '';
    if (!name) {
      setFieldError(form, 'name', 'Give the session a name or choose a routine.');
      return;
    }
    const planId = String(data.get('id') || '');
    const existing = planId ? state.plans.find((p) => p.id === planId) : null;
    try {
      if (existing) {
        await savePlan({ ...existing, date, routineId: routine?.id || null, name });
      } else {
        await savePlan(makePlan({ date, routine, name, source: 'manual' }));
      }
      closeModal();
      renderCurrent();
      toast(existing ? 'Planned session updated.' : 'Session added to your plan.', 'success', 2200);
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (id === 'move-plan-form') {
    event.preventDefault();
    clearFormErrors(form);
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    if (!isValidISO(date)) {
      setFieldError(form, 'date', 'Choose a valid date.');
      return;
    }
    const auto = data.get('auto') === '1';
    const existing = !auto ? state.plans.find((p) => p.id === String(data.get('id') || '')) : null;
    try {
      if (auto) {
        const routine = routineById(String(data.get('routineId') || ''));
        await savePlan(makePlan({ date, routine, name: routine?.name || 'Planned session', source: 'template' }));
      } else if (existing) {
        await savePlan({ ...existing, date });
      } else {
        setFieldError(form, 'date', 'This planned session no longer exists.');
        return;
      }
      closeModal();
      renderCurrent();
      toast('Planned session moved.', 'success', 2000);
    } catch (error) {
      showError(error);
    }
  }
}

// ---------------- event wiring ----------------

document.addEventListener('click', async (event) => {
  const routeEl = event.target.closest('[data-route]');
  if (routeEl) {
    event.preventDefault();
    if (routeEl.closest('.modal-backdrop')) closeModal();
    navigate(routeEl.dataset.route);
    return;
  }
  const timerBtn = event.target.closest('[data-timer]');
  if (timerBtn) {
    event.preventDefault();
    const kind = timerBtn.dataset.timer;
    if (kind === 'start') pauseResumeTimer();
    else if (kind === 'pause') pauseResumeTimer();
    else if (kind === 'add') addTimerTime(15);
    else if (kind === 'reset' || kind === 'close') resetTimer();
    else if (kind === 'quick') startTimer(Number(timerBtn.dataset.seconds) || defaultRest());
    return;
  }
  const muscle = event.target.closest('.muscle[data-muscle]');
  if (muscle) {
    state.ui.strength.muscle = muscle.dataset.muscle;
    renderCurrent();
    return;
  }
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  event.preventDefault();
  try {
    await handleAction(actionEl.dataset.action, actionEl);
  } catch (error) {
    showError(error);
  }
});

document.addEventListener('keydown', (event) => {
  const muscle = event.target.closest?.('.muscle[data-muscle]');
  if (muscle && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    state.ui.strength.muscle = muscle.dataset.muscle;
    renderCurrent();
  }
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.matches('[data-library-search]')) {
    state.ui.library.q = target.value;
    const results = document.getElementById('library-results');
    if (results) {
      results.innerHTML = libraryResultsHTML();
      hydrateIcons(results);
    }
    return;
  }
  if (target.matches('[data-routine-field], [data-routine-exercise-field]')) {
    updateRoutineDraftFromInput(target);
    return;
  }
  if (target.matches('[data-field]')) {
    const workout = currentSessionWorkout();
    if (!workout) return;
    if (['weight', 'reps', 'duration', 'rpe'].includes(target.dataset.field)) {
      handleWorkoutNumericChange(target, true);
      return;
    }
    if (target.dataset.field === 'workout-name') {
      workout.name = target.value.slice(0, 80) || 'Training session';
      scheduleSave(workout);
    } else if (target.dataset.field === 'workout-notes') {
      workout.notes = target.value.slice(0, 600);
      scheduleSave(workout);
    } else if (target.dataset.field === 'exercise-notes') {
      const wex = workout.exercises?.find((e) => e.uid === target.dataset.wex);
      if (wex) {
        wex.notes = target.value.slice(0, 240);
        scheduleSave(workout);
      }
    }
  }
});

document.addEventListener('change', async (event) => {
  const target = event.target;
  try {
    if (target.matches('[data-pref]')) {
      const key = target.dataset.pref;
      if (key === 'restDefault') {
        const value = Number(target.value);
        if (!Number.isFinite(value) || value < 15 || value > 600) {
          toast('Rest timer must be between 15 and 600 seconds.', 'error');
          target.value = prefs.get('restDefault');
          target.setAttribute('aria-invalid', 'true');
          return;
        }
        prefs.set('restDefault', Math.round(value));
        target.removeAttribute('aria-invalid');
      } else if (key === 'weekStart') {
        prefs.set('weekStart', Number(target.value) === 0 ? 0 : 1);
      } else if (key === 'theme') {
        prefs.set('theme', target.value);
        applyTheme();
      } else {
        prefs.set(key, Boolean(target.checked));
      }
      return;
    }
    if (target.matches('[data-library-muscle]')) {
      state.ui.library.muscle = target.value;
      renderCurrent();
      return;
    }
    if (target.matches('[data-library-equipment]')) {
      state.ui.library.equipment = target.value;
      renderCurrent();
      return;
    }
    if (target.matches('[data-progress-measure]')) {
      state.ui.progress.measure = target.value;
      renderCurrent();
      return;
    }
    if (target.matches('[data-progress-exercise]')) {
      state.ui.progress.exerciseId = target.value;
      renderCurrent();
      return;
    }
    if (target.matches('[data-weekday]')) {
      const weekday = Number(target.dataset.weekday);
      const value = target.value;
      const entry = value === 'none'
        ? { type: 'none' }
        : value === 'rest'
          ? { type: 'rest' }
          : value.startsWith('routine:')
            ? { type: 'routine', routineId: value.slice(8) }
            : { type: 'none' };
      try {
        await saveWeekly({ ...state.weekly, days: { ...state.weekly.days, [weekday]: entry } });
        renderCurrent();
        toast('Weekly template updated.', 'success', 1800);
      } catch (error) {
        showError(error);
      }
      return;
    }
    if (target.matches('[data-photo-input]')) {
      await handlePhotoInput(target);
      return;
    }
    if (target.matches('[data-onboarding-units]')) {
      return; // handled directly by the onboarding dialog listener
    }
    if (target.matches('[data-field]')) {
      if (['weight', 'reps', 'duration', 'rpe'].includes(target.dataset.field)) {
        handleWorkoutNumericChange(target);
      } else if (target.dataset.field === 'workout-date') {
        const workout = currentSessionWorkout();
        if (!workout) return;
        const value = target.value;
        if (!isValidISO(value) || value > TODAY()) {
          toast('Workout dates must be valid and cannot be in the future.', 'error');
          target.value = workout.date;
          return;
        }
        workout.date = value;
        scheduleSave(workout);
        toast('Workout date updated. Reports will recalculate.', 'info', 2200);
      } else if (target.dataset.field === 'workout-duration') {
        const workout = currentSessionWorkout();
        if (!workout) return;
        const raw = target.value.trim();
        if (!raw) {
          workout.durationSec = null;
          workout.durationManual = false;
          scheduleSave(workout);
          return;
        }
        const minutes = Number(raw);
        if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
          toast('Duration must be between 0 and 1440 minutes.', 'error');
          target.value = workout.durationSec ? Math.round(workout.durationSec / 60) : '';
          return;
        }
        workout.durationSec = Math.round(minutes * 60);
        workout.durationManual = true;
        scheduleSave(workout);
      }
    }
  } catch (error) {
    showError(error);
  }
});

document.addEventListener('submit', async (event) => {
  try {
    await handleSubmit(event);
  } catch (error) {
    showError(error);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    persistTimer();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      const session = currentSessionWorkout();
      if (session) persistWorkout(session.id);
    }
  }
});

window.addEventListener('pagehide', () => {
  persistTimer();
});

setInterval(tickTimer, 250);

// ---------------- boot ----------------

async function boot() {
  applyTheme();
  hydrateIcons(document);
  await initStore();
  updateTopbar();
  syncNav();
  renderCurrent({ scroll: false });
  if (state.ready) {
    maybeOnboarding();
  }
  updateTimerSurfaces({ rebuildInline: false });
  document.getElementById('topbar-start')?.setAttribute('data-action', 'start-blank');
}

boot();
