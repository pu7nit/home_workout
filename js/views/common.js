// Small shared view fragments used by more than one screen.
import { state } from '../store.js';
import { icon } from '../ui.js';
import { escapeHTML, fmtDate, formatWeight, formatDuration, kgToDisplay, roundTo } from '../utils.js';
import { trackingFlags, totalWorkoutStats, muscleLabel } from '../services.js';
import { EQUIPMENT_LABELS } from '../data/muscles.js';

export function units() {
  return state.profile?.unitSystem === 'imperial' ? 'imperial' : 'metric';
}

export function pageHead({ eyebrow = '', title = '', sub = '', actions = '' }) {
  return `<div class="page-head">
    <div>
      ${eyebrow ? `<span class="eyebrow">${escapeHTML(eyebrow)}</span>` : ''}
      <h1>${escapeHTML(title)}</h1>
      ${sub ? `<p class="sub">${escapeHTML(sub)}</p>` : ''}
    </div>
    ${actions ? `<div class="page-head-actions">${actions}</div>` : ''}
  </div>`;
}

export function equipmentLabels(equipment = []) {
  return equipment.map((e) => EQUIPMENT_LABELS[e] || e).join(' · ');
}

export function muscleList(ids = []) {
  return ids.map((id) => muscleLabel(id)).join(', ');
}

export function exerciseSubtitle(exercise) {
  return `${muscleList(exercise.primary || [])} · ${equipmentLabels(exercise.equipment || []) || 'Bodyweight'}`;
}

export function trackingSummary(exercise) {
  const flags = trackingFlags(exercise.tracking);
  if (flags.duration) return `${exercise.sets || 3} sets · ${exercise.duration || 30}s target`;
  return `${exercise.sets || 3} sets · ${exercise.repMin || 8}–${exercise.repMax || 12} reps`;
}

export function favoriteButton(exercise) {
  return `<button class="fav-star ${exercise.favourite ? 'on' : ''}" type="button" data-action="toggle-favourite" data-exercise="${escapeHTML(exercise.id)}" aria-label="${exercise.favourite ? 'Remove from favourites' : 'Add to favourites'}" aria-pressed="${exercise.favourite ? 'true' : 'false'}">
    ${icon('star', 16)}
  </button>`;
}

export function exerciseCard(exercise) {
  return `<article class="exercise-card">
    <button class="ex-open" type="button" data-action="open-exercise" data-exercise="${escapeHTML(exercise.id)}">
      <span class="ex-title"><h3>${escapeHTML(exercise.name)}</h3></span>
      <span class="ex-meta">
        <span class="pill ${exercise.isCustom ? 'lav' : 'sage'}">${exercise.isCustom ? 'Custom' : exercise.difficulty}</span>
        <span class="pill">${escapeHTML(trackingFlags(exercise.tracking).duration ? 'Timed' : exercise.tracking === 'reps' ? 'Bodyweight' : 'Loadable')}</span>
      </span>
      <span class="ex-muscles">${escapeHTML(muscleList(exercise.primary || []))}${exercise.secondary?.length ? ` · ${escapeHTML(muscleList(exercise.secondary))}` : ''}</span>
      <span class="ex-muscles">${escapeHTML(equipmentLabels(exercise.equipment || []) || 'Bodyweight')} · ${escapeHTML(trackingSummary(exercise))}</span>
    </button>
    ${favoriteButton(exercise)}
  </article>`;
}

export function workoutRow(workout, { showActions = false } = {}) {
  const stats = totalWorkoutStats(workout);
  const date = workout.date;
  const day = date ? fmtDate(date, { day: 'numeric' }) : '?';
  const month = date ? fmtDate(date, { month: 'short' }) : '';
  const dur = stats.duration ? formatDuration(stats.duration) : '';
  return `<div class="workout-row">
    <span class="date-block" aria-hidden="true"><span class="d">${escapeHTML(day)}</span><span class="m">${escapeHTML(month)}</span></span>
    <span class="grow">
      <span class="strong" style="display:block;font-size:.84rem">${escapeHTML(workout.name || 'Workout')}</span>
      <span class="meta">${stats.sets} sets · ${stats.reps} reps${stats.volume > 0 ? ` · ${formatWeight(stats.volume, units())} volume` : ''}${dur ? ` · ${escapeHTML(dur)}` : ''}</span>
    </span>
    <button class="mini-icon-btn" type="button" data-action="open-workout" data-workout="${escapeHTML(workout.id)}" aria-label="View ${escapeHTML(workout.name)}">${icon('chevronRight', 16)}</button>
    ${showActions ? `<button class="mini-icon-btn" type="button" data-action="edit-workout" data-workout="${escapeHTML(workout.id)}" aria-label="Edit workout">${icon('edit', 15)}</button>
      <button class="mini-icon-btn" type="button" data-action="delete-workout" data-workout="${escapeHTML(workout.id)}" aria-label="Delete workout">${icon('trash', 15)}</button>` : ''}
  </div>`;
}

export function setValueLine(wex, set, unitsSystem = units()) {
  const flags = trackingFlags(wex.tracking);
  const bits = [];
  if (flags.weight && set.weightKg) bits.push(formatWeight(set.weightKg, unitsSystem));
  if (flags.reps) bits.push(`${Number(set.reps) || 0} reps`);
  if (flags.duration) bits.push(`${Math.round(Number(set.durationSec) || 0)}s`);
  return bits.join(' × ') || '—';
}

export function performanceSummary(wex) {
  const flags = trackingFlags(wex.tracking);
  if (flags.duration) {
    const best = Math.max(0, ...(wex.sets || []).filter((s) => s.completed).map((s) => Number(s.durationSec) || 0));
    return `${best}s best hold`;
  }
  if (flags.weight) {
    const best = Math.max(0, ...(wex.sets || []).filter((s) => s.completed).map((s) => Number(s.weightKg) || 0));
    const reps = Math.max(0, ...(wex.sets || []).filter((s) => s.completed).map((s) => Number(s.reps) || 0));
    return `${best ? `${formatWeight(best, units())} best` : 'Bodyweight'}${reps ? ` · ${reps} reps` : ''}`;
  }
  const best = Math.max(0, ...(wex.sets || []).filter((s) => s.completed).map((s) => Number(s.reps) || 0));
  return best ? `${best} reps best` : 'No completed sets';
}

export function recordValue(record, unitsSystem = units()) {
  if (!record) return '—';
  return record.unit === 'kg' && unitsSystem === 'imperial'
    ? `${roundTo(kgToDisplay(record.value, 'imperial'), 1)} lb`
    : `${roundTo(record.value, 1)} ${record.unit}`;
}

export function formatTargetReps(wex) {
  if (!wex?.targetReps) return '';
  const { min, max } = wex.targetReps;
  if (min == null && max == null) return '';
  if (min != null && max != null) return `${min}–${max} reps`;
  return `${min ?? max} reps`;
}

export function notesBlock(notes) {
  if (!notes) return '';
  return `<div class="notice" style="margin-top:12px">${icon('info', 15)}<span>${escapeHTML(notes)}</span></div>`;
}
