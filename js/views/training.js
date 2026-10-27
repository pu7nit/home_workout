import { state, activeWorkout, exerciseById, prefs } from '../store.js';
import {
  totalWorkoutStats, summarizeWorkout, trackingFlags, overloadSuggestion,
  muscleLabel, lastExerciseSession
} from '../services.js';
import {
  fmtDate, escapeHTML, formatWeight, formatDuration, formatTimer, kgToDisplay,
  todayISO, fmtDateTime, weightUnit
} from '../utils.js';
import { icon, emptyState, statCard } from '../ui.js';
import { pageHead, units, workoutRow, exerciseSubtitle } from './common.js';

function previousLine(wex, workoutId) {
  const session = lastExerciseSession(wex.exerciseId, { excludeWorkoutId: workoutId });
  if (!session) return `<span>First time logging this — no history yet.</span>`;
  const flags = trackingFlags(wex.tracking);
  const parts = session.sets.map((s) => {
    if (flags.duration) return `${Math.round(Number(s.durationSec) || 0)}s`;
    if (flags.weight) return `${Number(s.reps) || 0} × ${s.weightKg ? formatWeight(s.weightKg, units()) : 'bodyweight'}`;
    return `${Number(s.reps) || 0} reps`;
  });
  return `<span><strong>Last time</strong> · ${fmtDate(session.workout.date, { month: 'short', day: 'numeric' })}</span><span>${escapeHTML(parts.join(' · '))}</span>`;
}

function renderSetRow(workout, wex, set, index) {
  const flags = trackingFlags(wex.tracking);
  const valueCols = (flags.weight ? 1 : 0) + (flags.reps ? 1 : 0) + (flags.duration ? 1 : 0);
  const single = valueCols === 1;
  const unitSystem = units();
  return `<div class="set-row ${single ? 'single-value' : ''} ${set.completed ? 'completed' : ''}" data-wex="${escapeHTML(wex.uid)}" data-set="${escapeHTML(set.id)}">
    <span class="set-num">${index + 1}</span>
    <button class="warmup-btn ${set.type === 'warmup' ? 'on' : ''}" type="button" data-action="toggle-warmup" data-wex="${wex.uid}" data-set="${set.id}" aria-pressed="${set.type === 'warmup'}" title="Toggle warm-up set (not counted in stats)">${set.type === 'warmup' ? 'Warm' : 'Set'}</button>
    ${flags.weight ? `<input class="input set-input" type="number" inputmode="decimal" step="0.5" min="0" max="999" placeholder="—" aria-label="Weight in ${weightUnit(unitSystem)} for set ${index + 1}" value="${set.weightKg ? escapeHTML(String(kgToDisplay(set.weightKg, unitSystem))) : ''}" data-field="weight" data-wex="${wex.uid}" data-set="${set.id}">` : ''}
    ${flags.reps ? `<input class="input set-input" type="number" inputmode="numeric" step="1" min="0" max="999" placeholder="—" aria-label="Repetitions for set ${index + 1}" value="${set.reps != null ? escapeHTML(String(set.reps)) : ''}" data-field="reps" data-wex="${wex.uid}" data-set="${set.id}">` : ''}
    ${flags.duration ? `<input class="input set-input" type="number" inputmode="numeric" step="1" min="0" max="7200" placeholder="—" aria-label="Duration in seconds for set ${index + 1}" value="${set.durationSec != null ? escapeHTML(String(set.durationSec)) : ''}" data-field="duration" data-wex="${wex.uid}" data-set="${set.id}">` : ''}
    <input class="input set-input" type="number" inputmode="decimal" step="0.5" min="1" max="10" placeholder="—" aria-label="RPE for set ${index + 1}" value="${set.rpe ? escapeHTML(String(set.rpe)) : ''}" data-field="rpe" data-wex="${wex.uid}" data-set="${set.id}">
    <button class="check-set ${set.completed ? 'on' : ''}" type="button" data-action="toggle-set" data-wex="${wex.uid}" data-set="${set.id}" aria-pressed="${set.completed}" aria-label="Mark set ${index + 1} ${set.completed ? 'incomplete' : 'complete'}">${icon('check', 14)}</button>
    <button class="mini-icon-btn remove-set" type="button" data-action="remove-set" data-wex="${wex.uid}" data-set="${set.id}" aria-label="Remove set ${index + 1}">${icon('close', 14)}</button>
  </div>`;
}

function renderLoggerExercise(workout, wex, index, total) {
  const exercise = exerciseById(wex.exerciseId);
  const flags = trackingFlags(wex.tracking);
  const suggestion = exercise ? overloadSuggestion(wex) : null;
  const target = wex.targetReps?.min != null || wex.targetReps?.max != null
    ? `${wex.targetReps.min ?? '—'}–${wex.targetReps.max ?? '—'} reps`
    : wex.targetDuration ? `${wex.targetDuration}s` : '';
  const columns = [
    flags.weight ? 'Weight' : null,
    flags.reps ? 'Reps' : null,
    flags.duration ? 'Time (s)' : null
  ].filter(Boolean);
  return `<section class="exercise-log" data-wex="${escapeHTML(wex.uid)}" aria-label="${escapeHTML(wex.name)}">
    <div class="exercise-log-head">
      <div style="min-width:0">
        <div class="ex-name">${escapeHTML(wex.name)}</div>
        <div class="ex-info">
          <span>${escapeHTML((wex.primary || []).map(muscleLabel).join(', ') || 'Strength')}</span>
          ${target ? `<span>· Target ${escapeHTML(target)}</span>` : ''}
          <span>· ${escapeHTML(trackingFlags(wex.tracking).duration ? 'Timed' : trackingFlags(wex.tracking).weight ? 'Loadable' : 'Bodyweight')}</span>
        </div>
      </div>
      <div class="head-actions">
        <button class="mini-icon-btn" type="button" data-action="move-exercise" data-wex="${wex.uid}" data-dir="-1" aria-label="Move ${escapeHTML(wex.name)} up" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp', 14)}</button>
        <button class="mini-icon-btn" type="button" data-action="move-exercise" data-wex="${wex.uid}" data-dir="1" aria-label="Move ${escapeHTML(wex.name)} down" ${index === total - 1 ? 'disabled' : ''}>${icon('arrowDown', 14)}</button>
        ${exercise ? `<button class="mini-icon-btn" type="button" data-action="open-exercise" data-exercise="${escapeHTML(wex.exerciseId)}" aria-label="Exercise details and history">${icon('info', 15)}</button>` : ''}
        <button class="mini-icon-btn" type="button" data-action="remove-exercise" data-wex="${wex.uid}" aria-label="Remove ${escapeHTML(wex.name)} from workout">${icon('trash', 15)}</button>
      </div>
    </div>
    <div class="previous-line">${previousLine(wex, workout.id)}</div>
    ${suggestion && !suggestion.dismissed ? `<div style="padding:10px 14px 0"><div class="suggestion-box">
      <div class="suggestion-title">${icon('sparkle', 14)} ${escapeHTML(suggestion.headline)}</div>
      <div>${escapeHTML(suggestion.reason)}</div>
      <button class="link-btn dismiss" type="button" data-action="dismiss-suggestion" data-key="${escapeHTML(suggestion.dismissKey)}">Dismiss suggestion</button>
    </div></div>` : ''}
    <div class="set-table">
      <div class="set-row header ${columns.length === 1 ? 'single-value' : ''}">
        <span>Set</span><span>Type</span>${columns.map((c) => `<span style="text-align:center">${c}</span>`).join('')}<span style="text-align:center">RPE</span><span style="text-align:center">Done</span><span></span>
      </div>
      ${(wex.sets || []).map((set, i) => renderSetRow(workout, wex, set, i)).join('')}
    </div>
    <div class="set-foot">
      <button class="btn btn-ghost btn-xs" type="button" data-action="add-set" data-wex="${wex.uid}">${icon('plus', 13)} Add set</button>
      <button class="link-btn" type="button" data-action="copy-last-set" data-wex="${wex.uid}">Copy last set</button>
      <span class="target">${wex.targetReps?.min ? `Target ${wex.targetReps.min}–${wex.targetReps.max} reps · ` : ''}Rest ${Number(exercise?.rest) || 90}s</span>
    </div>
    <div class="exercise-log-notes">
      <input class="input" type="text" maxlength="240" placeholder="Notes for this exercise (optional)" aria-label="Notes for ${escapeHTML(wex.name)}" value="${escapeHTML(wex.notes || '')}" data-field="exercise-notes" data-wex="${wex.uid}">
    </div>
  </section>`;
}

export function sessionSummaryHTML(workout) {
  const stats = totalWorkoutStats(workout);
  const totalSets = workout.exercises?.reduce((n, wex) => n + (wex.sets?.filter((s) => s.completed && s.type !== 'warmup').length || 0), 0) || 0;
  const muscles = [...new Set(workout.exercises?.flatMap((wex) => wex.primary || []) || [])];
  return `<div class="card">
    <div class="card-head"><h2>Session so far</h2><span class="pill ${stats.sets > 0 ? 'sage' : ''}">${stats.sets} sets</span></div>
    <div class="side-stat"><span>Exercises</span><span>${workout.exercises?.length || 0}</span></div>
    <div class="side-stat"><span>Working sets done</span><span>${totalSets}</span></div>
    <div class="side-stat"><span>Repetitions</span><span>${stats.reps}</span></div>
    <div class="side-stat"><span>External-load volume</span><span>${stats.volume > 0 ? formatWeight(stats.volume, units()) : '—'}</span></div>
    <div class="side-stat"><span>Started</span><span>${workout.startedAt ? new Date(workout.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span></div>
    <div class="side-stat"><span>Muscles</span><span style="text-align:right;max-width:150px">${escapeHTML(muscles.slice(0, 3).map(muscleLabel).join(', ') || '—')}${muscles.length > 3 ? '…' : ''}</span></div>
  </div>`;
}

export function restTimerCardHTML(timer, autoRest = false) {
  const duration = Number(prefs.get('restDefault')) || 90;
  return `<div class="card rest-timer-card" id="rest-timer-inline">
    <div class="card-head" style="margin-bottom:2px"><h2>${icon('timer', 15)} Rest timer</h2><span class="pill">${duration}s default</span></div>
    <div class="timer-time" id="inline-timer-time" aria-live="polite">${timer?.active ? formatTimer(timer.remaining) : formatTimer(duration)}</div>
    <div class="timer-quick">
      <button class="chip" type="button" data-timer="quick" data-seconds="30">30s</button>
      <button class="chip" type="button" data-timer="quick" data-seconds="60">60s</button>
      <button class="chip" type="button" data-timer="quick" data-seconds="90">90s</button>
      <button class="chip" type="button" data-timer="quick" data-seconds="120">2m</button>
    </div>
    <div class="timer-controls">
      <button class="btn btn-soft btn-xs" type="button" data-timer="${timer?.running ? 'pause' : 'start'}">${icon(timer?.running ? 'pause' : 'play', 13)} ${timer?.running ? 'Pause' : timer?.active ? 'Resume' : 'Start'}</button>
      <button class="btn btn-ghost btn-xs" type="button" data-timer="add">+15s</button>
      <button class="btn btn-ghost btn-xs" type="button" data-timer="reset">Reset</button>
    </div>
    <button class="link-btn" type="button" data-action="toggle-autorest" style="margin-top:8px">Auto-start rest: ${autoRest ? 'on' : 'off'}</button>
  </div>`;
}

export function renderLogger(workout) {
  if (!workout) return `<div class="view-inner">${emptyState('dumbbell', 'No session open', 'Start a blank workout or choose a routine to begin.', `<button class="btn btn-primary btn-sm" type="button" data-action="start-blank" data-date="${todayISO()}">Start workout</button>`)}</div>`;
  const editing = workout.status === 'completed';
  const completedSets = workout.exercises?.reduce((n, wex) => n + (wex.sets?.filter((s) => s.completed && s.type !== 'warmup').length || 0), 0) || 0;
  const timer = window.__cozyTimer || null;
  const autoRest = Boolean(prefs.get('autoRest'));
  return `<div class="view-inner">
    <div class="logger-head">
      <div class="title-wrap">
        <div class="row tight" style="margin-bottom:4px">
          <button class="link-btn" type="button" data-action="leave-logger">← Workouts</button>
          <span class="pill ${editing ? 'lav' : 'sage dot'}">${editing ? 'Editing saved workout' : 'In progress'}</span>
        </div>
        <input class="logger-title-input" type="text" maxlength="80" aria-label="Workout name" data-field="workout-name" value="${escapeHTML(workout.name || 'Training session')}">
        <div class="row tight" style="margin-top:4px">
          <span class="save-state" id="save-state"><span class="save-dot"></span><span>${editing ? 'All changes save as you go' : 'Saving locally as you go'}</span></span>
          <span class="tiny muted">·</span>
          <span class="tiny muted">${completedSets} sets marked complete</span>
        </div>
      </div>
      <div class="logger-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="save-exit">Save &amp; close</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="finish-workout">${icon('check', 15)} ${editing ? 'Save changes' : 'Finish workout'}</button>
      </div>
    </div>

    <div class="logger-grid">
      <div>
        ${editing ? `<div class="notice" style="margin-bottom:14px">${icon('info', 15)}<span>This session is already saved. Edits update your records and strength map when you save changes.</span></div>` : ''}
        <div id="logger-exercises">
          ${workout.exercises?.length
            ? workout.exercises.map((wex, i) => renderLoggerExercise(workout, wex, i, workout.exercises.length)).join('')
            : `<div class="card">${emptyState('dumbbell', 'Add your first exercise', 'Choose from the built-in home strength library or one of your own exercises.', `<button class="btn btn-primary btn-sm" type="button" data-action="open-exercise-picker">${icon('plus', 15)} Add exercise</button>`)}</div>`}
        </div>
        <button class="add-exercise-bar" type="button" data-action="open-exercise-picker">${icon('plus', 16)} Add exercise</button>
        <div class="card" style="margin-top:16px">
          <div class="card-head"><h2>Session notes</h2></div>
          <textarea class="textarea" maxlength="600" placeholder="How did it feel? Anything worth remembering next time?" aria-label="Session notes" data-field="workout-notes">${escapeHTML(workout.notes || '')}</textarea>
          <div class="field-grid" style="margin-top:12px;grid-template-columns:repeat(2,minmax(0,1fr))">
            <div class="field">
              <label for="session-date">Workout date</label>
              <input class="input" id="session-date" type="date" max="${todayISO()}" value="${escapeHTML(workout.date)}" data-field="workout-date">
              <span class="hint">Changing the date recalculates your history.</span>
            </div>
            <div class="field">
              <label>Session duration</label>
              <div class="input-group"><input class="input" type="number" min="0" max="1440" step="1" value="${workout.durationSec ? Math.round(workout.durationSec / 60) : ''}" placeholder="—" aria-label="Session duration in minutes" data-field="workout-duration"><span class="unit">min</span></div>
              <span class="hint">Optional; estimated from start and finish when left blank.</span>
            </div>
          </div>
        </div>
        <div class="row between" style="margin-top:16px">
          <button class="btn btn-danger-ghost btn-sm" type="button" data-action="${editing ? 'delete-workout' : 'discard-workout'}" data-workout="${workout.id}">${icon('trash', 14)} ${editing ? 'Delete workout' : 'Discard session'}</button>
          <span class="tiny muted">Data stays in this browser.</span>
        </div>
      </div>
      <aside class="logger-side">
        <div id="session-summary">${sessionSummaryHTML(workout)}</div>
        ${restTimerCardHTML(timer, autoRest)}
        <div class="card">
          <div class="card-head"><h2>Add another movement</h2></div>
          <p class="small muted">Build the session as you go. Changes save automatically after each edit.</p>
          <button class="btn btn-soft btn-sm btn-block" style="margin-top:10px" type="button" data-action="open-exercise-picker">${icon('plus', 15)} Exercise library</button>
        </div>
      </aside>
    </div>
  </div>`;
}

export function renderWorkouts() {
  const active = activeWorkout();
  const completed = state.workouts.filter((w) => w.status === 'completed');
  const totals = completed.reduce((acc, w) => {
    const stats = totalWorkoutStats(w);
    acc.sets += stats.sets;
    acc.reps += stats.reps;
    acc.volume += stats.volume;
    acc.seconds += stats.duration || 0;
    return acc;
  }, { sets: 0, reps: 0, volume: 0, seconds: 0 });
  const groups = {};
  for (const workout of completed) {
    const key = workout.date?.slice(0, 7) || 'Unknown';
    (groups[key] ||= []).push(workout);
  }
  const monthKeys = Object.keys(groups).sort().reverse();

  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Training log',
      title: 'Workouts',
      sub: 'Everything you have actually completed. Start a planned routine, a blank session, or repeat something that felt good.',
      actions: `<button class="btn btn-ghost btn-sm" type="button" data-action="open-routine-picker">${icon('clipboard', 15)} Start routine</button><button class="btn btn-primary btn-sm" type="button" data-action="start-blank" data-date="${todayISO()}">${icon('plus', 15)} Blank workout</button>`
    })}

    ${active ? `<div class="card tinted-sage" style="margin-bottom:18px">
      <div class="row between">
        <div>
          <span class="eyebrow">Session open</span>
          <h2 style="margin-top:3px">${escapeHTML(active.name)}</h2>
          <p class="small muted">Started ${fmtDateTime(active.startedAt)} · ${active.exercises?.length || 0} exercises · ${active.exercises?.reduce((n, e) => n + (e.sets?.filter((s) => s.completed).length || 0), 0) || 0} sets done</p>
        </div>
        <div class="row tight">
          <button class="btn btn-ghost btn-sm" type="button" data-action="discard-workout" data-workout="${active.id}">Discard</button>
          <button class="btn btn-primary btn-sm" type="button" data-action="resume-workout" data-workout="${active.id}">${icon('play', 15)} Resume</button>
        </div>
      </div>
    </div>` : ''}

    <div class="stat-grid">
      ${statCard({ label: 'Completed workouts', value: `<span data-count-to="${completed.length}">0</span>`, foot: completed.length ? `Last on ${fmtDate(completed[0].date, { month: 'short', day: 'numeric' })}` : 'None yet', iconName: 'dumbbell' })}
      ${statCard({ label: 'Working sets', value: `<span data-count-to="${totals.sets}">0</span>`, foot: 'Warm-up sets excluded', iconName: 'check', accent: 'lav' })}
      ${statCard({ label: 'Repetitions', value: `<span data-count-to="${totals.reps}">0</span>`, foot: 'Across completed working sets', iconName: 'chart', accent: 'blue' })}
      ${statCard({ label: 'Training time', value: totals.seconds ? escapeHTML(formatDuration(totals.seconds)) : '—', foot: 'Recorded session durations', iconName: 'clock', accent: 'blush' })}
    </div>

    ${completed.length
      ? monthKeys.map((key) => `<section class="card" style="margin-bottom:16px">
          <div class="card-head"><h2>${escapeHTML(fmtDate(`${key}-01`, { month: 'long', year: 'numeric' }))}</h2><span class="tiny muted">${groups[key].length} ${groups[key].length === 1 ? 'workout' : 'workouts'}</span></div>
          <div>${groups[key].map((w) => `<div style="border-bottom:1px solid var(--border);padding:2px 0">${workoutRow(w, { showActions: true })}</div>`).join('')}</div>
        </section>`).join('')
      : `<div class="card">${emptyState('dumbbell', 'Your log starts empty', 'No fabricated history here. Start a blank workout or a routine and your real sessions will fill this page.', `<div class="row tight"><button class="btn btn-primary btn-sm" type="button" data-action="start-blank" data-date="${todayISO()}">Start a workout</button><button class="btn btn-ghost btn-sm" type="button" data-action="open-routine-picker">Choose a routine</button></div>`)}</div>`}
  </div>`;
}

export function workoutDetailBody(workout) {
  const summary = summarizeWorkout(workout);
  const unitSystem = units();
  return `<div class="detail-ex">
    <div class="row between">
      <div><span class="eyebrow">${escapeHTML(fmtDate(workout.date, { weekday: 'long', month: 'long', day: 'numeric' }))}</span><h2 style="margin-top:3px">${escapeHTML(workout.name)}</h2></div>
      <span class="pill sage dot">Completed</span>
    </div>
    <div class="summary-grid">
      <div class="summary-cell"><div class="v">${escapeHTML(summary.duration ? formatDuration(summary.duration) : '—')}</div><div class="l">Duration</div></div>
      <div class="summary-cell"><div class="v">${workout.exercises?.length || 0}</div><div class="l">Exercises</div></div>
      <div class="summary-cell"><div class="v">${summary.sets}</div><div class="l">Working sets</div></div>
      <div class="summary-cell"><div class="v">${summary.reps}</div><div class="l">Reps</div></div>
      <div class="summary-cell"><div class="v">${summary.volume > 0 ? formatWeight(summary.volume, unitSystem) : '—'}</div><div class="l">Volume</div></div>
      <div class="summary-cell"><div class="v">${summary.muscles.length}</div><div class="l">Muscles</div></div>
    </div>
    <div>
      <div class="detail-section-title">Exercises</div>
      <div class="stack-sm">
        ${(workout.exercises || []).map((wex) => {
          const sets = (wex.sets || []).filter((s) => s.completed && s.type !== 'warmup');
          const flags = trackingFlags(wex.tracking);
          const parts = sets.map((s) => {
            if (flags.duration) return `${Math.round(Number(s.durationSec) || 0)}s`;
            if (flags.weight) return `${Number(s.reps) || 0} × ${s.weightKg ? formatWeight(s.weightKg, unitSystem) : 'bodyweight'}`;
            return `${Number(s.reps) || 0}`;
          });
          return `<div style="padding:7px 0;border-bottom:1px solid var(--border)">
            <div class="row between"><span class="small strong">${escapeHTML(wex.name)}</span><span class="tiny muted">${sets.length} sets</span></div>
            <div class="tiny muted">${escapeHTML(parts.join(' · ') || 'No completed working sets')}</div>
            ${wex.notes ? `<div class="tiny muted" style="font-style:italic">${escapeHTML(wex.notes)}</div>` : ''}
          </div>`;
        }).join('') || '<p class="small muted">No exercises recorded.</p>'}
      </div>
    </div>
    ${workout.notes ? `<div><div class="detail-section-title">Notes</div><p class="small soft" style="white-space:pre-wrap">${escapeHTML(workout.notes)}</p></div>` : ''}
    ${summary.newPRs.length ? `<div><div class="detail-section-title">Records from this session</div><ul class="list-clean">${summary.newPRs.map((pr) => `<li><span class="pr-medal">${icon('trophy', 13)}</span><span class="grow small strong">${escapeHTML(pr.exerciseName)}</span><span class="small">${escapeHTML(pr.type)}${pr.unit === 'kg' ? ` · ${formatWeight(pr.value, unitSystem)}` : pr.unit === 'sec' ? ` · ${pr.value}s` : ` · ${pr.value}`}</span></li>`).join('')}</ul></div>` : ''}
    <div class="notice">${icon('info', 15)}<span>Source records are kept locally in this browser. Deleting a workout removes it from all derived stats and strength scores.</span></div>
  </div>`;
}

export function summaryModalBody(workout, { justFinished = false } = {}) {
  const summary = summarizeWorkout(workout);
  const unitSystem = units();
  return `<div class="detail-ex">
    <div class="summary-hero">
      <div class="summary-check">${icon('check', 28)}</div>
      <h2>${justFinished ? 'Session recorded' : 'Session details'}</h2>
      <p class="small muted">${escapeHTML(fmtDate(workout.date, { weekday: 'long', month: 'long', day: 'numeric' }))} · ${escapeHTML(workout.name)}</p>
    </div>
    <div class="summary-grid">
      <div class="summary-cell"><div class="v">${summary.duration ? escapeHTML(formatDuration(summary.duration)) : '—'}</div><div class="l">Duration</div></div>
      <div class="summary-cell"><div class="v">${summary.sets}</div><div class="l">Working sets</div></div>
      <div class="summary-cell"><div class="v">${summary.reps}</div><div class="l">Reps</div></div>
      <div class="summary-cell"><div class="v">${workout.exercises?.filter((e) => e.sets?.some((s) => s.completed)).length || 0}</div><div class="l">Exercises</div></div>
      <div class="summary-cell"><div class="v">${summary.volume > 0 ? formatWeight(summary.volume, unitSystem) : '—'}</div><div class="l">Load volume</div></div>
      <div class="summary-cell"><div class="v">${summary.muscles.length}</div><div class="l">Muscles</div></div>
    </div>
    ${summary.muscles.length ? `<div><div class="detail-section-title">Muscle groups trained</div><div class="row tight">${summary.muscles.map((m) => `<span class="pill">${escapeHTML(muscleLabel(m))}</span>`).join('')}</div></div>` : ''}
    ${summary.newPRs.length ? `<div><div class="detail-section-title">Honest personal records</div><ul class="list-clean">${summary.newPRs.map((pr) => `<li><span class="pr-medal">${icon('trophy', 13)}</span><span class="grow"><span class="small strong" style="display:block">${escapeHTML(pr.exerciseName)}</span><span class="tiny muted">${escapeHTML(pr.type)}</span></span><span class="small strong">${pr.unit === 'kg' ? formatWeight(pr.value, unitSystem) : pr.unit === 'sec' ? `${pr.value}s` : `${pr.value} reps`}</span></li>`).join('')}</ul></div>` : `<p class="small muted">No new comparable records this session. That’s fine — consistent sets still count.</p>`}
    ${summary.comparison ? `<div><div class="detail-section-title">Compared with a previous session</div>
      <p class="small soft">${escapeHTML(summary.comparison.previous.name)} · ${escapeHTML(fmtDate(summary.comparison.previous.date, { month: 'short', day: 'numeric' }))}</p>
      <div class="row tight" style="margin-top:6px">
        <span class="pill ${summary.comparison.delta.sets >= 0 ? 'sage' : 'peach'}">${summary.comparison.delta.sets >= 0 ? '+' : ''}${summary.comparison.delta.sets} sets</span>
        <span class="pill ${summary.comparison.delta.reps >= 0 ? 'sage' : 'peach'}">${summary.comparison.delta.reps >= 0 ? '+' : ''}${summary.comparison.delta.reps} reps</span>
        ${summary.comparison.delta.volume !== 0 ? `<span class="pill ${summary.comparison.delta.volume >= 0 ? 'sage' : 'peach'}">${summary.comparison.delta.volume >= 0 ? '+' : ''}${formatWeight(Math.abs(summary.comparison.delta.volume), unitSystem)} volume</span>` : ''}
      </div>
    </div>` : ''}
    <div class="notice">${icon('info', 15)}<span>Muscle scores and recovery estimates were updated from this saved session. These are training estimates, not medical measurements.</span></div>
  </div>`;
}

export function exercisePickerBody() {
  const recentIds = [];
  for (const workout of state.workouts) {
    for (const wex of workout.exercises || []) {
      if (!recentIds.includes(wex.exerciseId)) recentIds.push(wex.exerciseId);
    }
    if (recentIds.length >= 6) break;
  }
  const recent = recentIds.map((id) => exerciseById(id)).filter(Boolean).slice(0, 5);
  const all = [...state.exercises].sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="stack-sm">
    <div class="search-box">${icon('search', 16, 'search-icon')}<input class="input" type="search" placeholder="Search exercises…" aria-label="Search exercises to add" data-picker-search></div>
    <div class="picker-list" id="picker-list">
      ${recent.length ? `<div class="detail-section-title" style="margin-top:4px">Recently used</div>${recent.map(pickerRow).join('')}<div class="detail-section-title">All exercises</div>` : ''}
      ${all.map(pickerRow).join('')}
    </div>
    <div class="row between" style="padding-top:4px">
      <span class="tiny muted">${all.length} movements in your library</span>
      <button class="link-btn" type="button" data-action="new-custom-exercise">Create a custom exercise</button>
    </div>
  </div>`;
}

function pickerRow(exercise) {
  return `<button class="picker-item" type="button" data-action="add-exercise-to-workout" data-exercise="${escapeHTML(exercise.id)}" data-search="${escapeHTML(`${exercise.name} ${(exercise.primary || []).join(' ')} ${(exercise.equipment || []).join(' ')}`.toLowerCase())}">
    <span><span style="display:block">${escapeHTML(exercise.name)}</span><span class="p-meta">${escapeHTML(exerciseSubtitle(exercise))}</span></span>
    <span class="add-mark">${icon('plus', 15)}</span>
  </button>`;
}

export function routinePickerBody() {
  return `<div class="stack-sm">
    <p class="small muted">Starting a routine creates a new editable session with its exercises and targets. Your history stays untouched.</p>
    ${state.routines.length
      ? state.routines.map((routine) => `<button class="picker-item" type="button" data-action="start-routine" data-routine="${escapeHTML(routine.id)}">
          <span><span style="display:block;font-weight:600">${escapeHTML(routine.name)}</span><span class="p-meta">${routine.exercises?.length || 0} exercises · ${escapeHTML(routine.notes || 'No notes')}</span></span>
          <span class="add-mark">${icon('play', 15)}</span>
        </button>`).join('')
      : `<p class="small muted">You have no routines yet. Create one in the Planner.</p>`}
    <button class="btn btn-ghost btn-sm" type="button" data-action="new-routine">${icon('plus', 15)} Create routine</button>
  </div>`;
}
