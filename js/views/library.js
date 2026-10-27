import { state, activeWorkout } from '../store.js';
import {
  trackingFlags, exerciseRecords, exerciseSessions, strengthBenchmark, muscleLabel
} from '../services.js';
import { MUSCLES, EQUIPMENT_LABELS, MOVEMENT_LABELS, TRACKING_LABELS } from '../data/muscles.js';
import {
  escapeHTML, fmtDate, formatWeight, roundTo, kgToDisplay
} from '../utils.js';
import { icon, emptyState } from '../ui.js';
import { pageHead, units, muscleList, equipmentLabels, exerciseCard } from './common.js';

export function recentExerciseIds(limit = 6) {
  const ids = [];
  const sorted = [...state.workouts].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  for (const workout of sorted) {
    for (const wex of workout.exercises || []) {
      if (!ids.includes(wex.exerciseId)) ids.push(wex.exerciseId);
    }
    if (ids.length >= limit) break;
  }
  return ids.slice(0, limit);
}

export function filterExercises(ui = state.ui.library) {
  const q = (ui.q || '').trim().toLowerCase();
  const ratedEquipment = ui.equipment || 'all';
  return state.exercises.filter((exercise) => {
    if (ui.favOnly && !exercise.favourite) return false;
    if (ui.muscle && ui.muscle !== 'all' && ![...(exercise.primary || []), ...(exercise.secondary || [])].includes(ui.muscle)) return false;
    if (ratedEquipment !== 'all' && !(exercise.equipment || []).includes(ratedEquipment)) return false;
    if (!q) return true;
    const haystack = [
      exercise.name,
      ...(exercise.primary || []).map(muscleLabel),
      ...(exercise.secondary || []).map(muscleLabel),
      ...(exercise.equipment || []).map((e) => EQUIPMENT_LABELS[e] || e),
      exercise.pattern,
      exercise.difficulty
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function libraryResultsHTML() {
  const results = filterExercises();
  const recent = recentExerciseIds(6).map((id) => state.exercises.find((e) => e.id === id)).filter(Boolean);
  return `<div class="row between" style="margin-bottom:12px">
      <p class="small muted" aria-live="polite">${results.length} ${results.length === 1 ? 'exercise' : 'exercises'}${state.ui.library.q ? ` matching “${escapeHTML(state.ui.library.q)}”` : ''}</p>
      ${(state.ui.library.muscle !== 'all' || state.ui.library.equipment !== 'all' || state.ui.library.favOnly || state.ui.library.q) ? `<button class="link-btn" type="button" data-action="reset-library-filters">Clear filters</button>` : ''}
    </div>
    ${recent.length && !state.ui.library.q && state.ui.library.muscle === 'all' ? `<div class="recent-exercises" style="margin-bottom:18px">
      <span class="eyebrow" style="display:block;margin-bottom:6px">Recently used</span>
      <div class="row tight">${recent.map((ex) => `<button class="chip" type="button" data-action="open-exercise" data-exercise="${escapeHTML(ex.id)}">${escapeHTML(ex.name)}</button>`).join('')}</div>
    </div>` : ''}
    ${results.length
      ? `<div class="exercise-list">${results.map(exerciseCard).join('')}</div>`
      : `<div class="card">${emptyState('search', 'No exercises match', 'Try a different search, clear a filter, or create your own exercise for equipment the library does not cover.', `<div class="row tight"><button class="btn btn-ghost btn-sm" type="button" data-action="reset-library-filters">Clear filters</button><button class="btn btn-soft btn-sm" type="button" data-action="new-custom-exercise">Create exercise</button></div>`)}</div>`}`;
}

export function renderLibrary() {
  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Movement catalogue',
      title: 'Exercise library',
      sub: 'Home strength movements with honest muscle mappings, technique notes and your own performance history.',
      actions: `<button class="btn btn-primary btn-sm" type="button" data-action="new-custom-exercise">${icon('plus', 15)} Custom exercise</button>`
    })}
    <div class="card" style="margin-bottom:16px">
      <div class="library-toolbar">
        <div class="search-box">${icon('search', 16, 'search-icon')}<input class="input" type="search" value="${escapeHTML(state.ui.library.q)}" placeholder="Search by name, muscle, equipment…" aria-label="Search exercise library" data-library-search></div>
        <select class="select" style="width:auto;min-height:40px" aria-label="Filter by muscle" data-library-muscle>
          <option value="all">All muscles</option>
          ${MUSCLES.map((m) => `<option value="${m.id}" ${state.ui.library.muscle === m.id ? 'selected' : ''}>${escapeHTML(m.label)}</option>`).join('')}
        </select>
        <select class="select" style="width:auto;min-height:40px" aria-label="Filter by equipment" data-library-equipment>
          <option value="all">All equipment</option>
          ${Object.entries(EQUIPMENT_LABELS).map(([id, label]) => `<option value="${id}" ${state.ui.library.equipment === id ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('')}
        </select>
        <button class="chip ${state.ui.library.favOnly ? 'active' : ''}" type="button" data-action="toggle-library-fav" aria-pressed="${state.ui.library.favOnly}">${icon('star', 14)} Favourites</button>
      </div>
      <div id="library-results">${libraryResultsHTML()}</div>
    </div>
  </div>`;
}

function recordGrid(exercise) {
  const records = exerciseRecords(exercise.id);
  const unitSystem = units();
  const flags = trackingFlags(exercise.tracking);
  const items = [];
  if (records.bestE1RM) items.push({ label: 'Est. 1RM', value: formatWeight(records.bestE1RM.value, unitSystem), date: records.bestE1RM.date });
  if (records.bestWeight) items.push({ label: 'Heaviest set', value: formatWeight(records.bestWeight.value, unitSystem), date: records.bestWeight.date });
  if (flags.reps && records.bestReps) items.push({ label: 'Most reps', value: `${records.bestReps.value} reps`, date: records.bestReps.date });
  if (flags.duration && records.bestDuration) items.push({ label: 'Longest hold', value: `${records.bestDuration.value}s`, date: records.bestDuration.date });
  if (!items.length) return `<p class="small muted">No records yet. Complete a working set to start your history.</p>`;
  return `<div class="detail-stats">${items.map((item) => `<div class="detail-stat"><div class="k">${escapeHTML(item.label)}</div><div class="v">${escapeHTML(item.value)}</div><div class="tiny muted">${fmtDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>`).join('')}</div>`;
}

export function exerciseDetailBody(exercise) {
  if (!exercise) return `<p class="small muted">This exercise is no longer in your library, but past workouts keep their recorded values.</p>`;
  const sessions = exerciseSessions(exercise.id).slice(-6).reverse();
  const benchmark = strengthBenchmark(exercise.id);
  const unitSystem = units();
  const flags = trackingFlags(exercise.tracking);
  const canAdd = Boolean(activeWorkout());
  return `<div class="detail-ex">
    <div>
      <div class="row between" style="align-items:flex-start">
        <div>
          <span class="eyebrow">${escapeHTML(exercise.isCustom ? 'Your exercise' : 'Built-in exercise')}</span>
          <h2 style="margin-top:2px">${escapeHTML(exercise.name)}</h2>
        </div>
        <button class="icon-btn plain" type="button" data-action="toggle-favourite" data-exercise="${escapeHTML(exercise.id)}" aria-label="Toggle favourite" aria-pressed="${exercise.favourite ? 'true' : 'false'}">${icon('star', 18)}</button>
      </div>
      <div class="row tight" style="margin-top:6px">
        <span class="pill sage">${escapeHTML(MOVEMENT_LABELS[exercise.pattern] || exercise.pattern)}</span>
        <span class="pill">${escapeHTML(exercise.difficulty)}</span>
        <span class="pill">${escapeHTML(TRACKING_LABELS[exercise.tracking] || 'Reps')}</span>
      </div>
    </div>
    <div class="row" style="gap:18px">
      <div><span class="eyebrow">Primary</span><p class="small strong" style="margin-top:2px">${escapeHTML(muscleList(exercise.primary || []) || '—')}</p></div>
      <div><span class="eyebrow">Secondary</span><p class="small soft" style="margin-top:2px">${escapeHTML(muscleList(exercise.secondary || []) || '—')}</p></div>
    </div>
    <div>
      <div class="detail-section-title">How to do it</div>
      <p class="small soft" style="white-space:pre-wrap;line-height:1.65">${escapeHTML(exercise.instructions || 'No instructions saved.')}</p>
      ${exercise.tip ? `<div class="tip-note" style="margin-top:10px">${icon('sparkle', 15)}<span>${escapeHTML(exercise.tip)}</span></div>` : ''}
      <div class="row tight" style="margin-top:10px">
        <span class="pill">${escapeHTML(equipmentLabels(exercise.equipment) || 'Bodyweight')}</span>
        <span class="pill">Default ${exercise.sets || 3} sets</span>
        ${flags.reps ? `<span class="pill">${exercise.repMin || 8}–${exercise.repMax || 12} reps</span>` : ''}
        ${flags.duration ? `<span class="pill">${exercise.duration || 30}s</span>` : ''}
        <span class="pill">${exercise.rest || 90}s rest</span>
      </div>
    </div>
    <div>
      <div class="detail-section-title">Your records</div>
      ${recordGrid(exercise)}
      ${benchmark ? `<div class="notice" style="margin-top:10px">${icon('chart', 15)}<span><strong>Heuristic strength band: ${escapeHTML(benchmark.label)}.</strong> Best estimated 1RM is ${formatWeight(benchmark.e1rm.value, unitSystem)} (${benchmark.ratio}× body weight). ${escapeHTML(benchmark.note)}</span></div>` : ''}
    </div>
    <div>
      <div class="detail-section-title">Recent performance <span class="tiny muted" style="text-transform:none;letter-spacing:0">${sessions.length ? 'Last 6 sessions' : ''}</span></div>
      ${sessions.length
        ? `<div class="history-mini">${sessions.map(({ workout, sets, wex }) => {
            const values = sets.map((s) => {
              if (flags.duration) return `${Math.round(Number(s.durationSec) || 0)}s`;
              if (flags.weight) return `${Number(s.reps) || 0}×${s.weightKg ? roundTo(kgToDisplay(s.weightKg, unitSystem), 1) : 'BW'}`;
              return `${Number(s.reps) || 0}`;
            });
            return `<div class="history-mini-row">
              <span class="d">${escapeHTML(fmtDate(workout.date, { month: 'short', day: 'numeric' }))}</span>
              <span>${escapeHTML(values.join(' · '))}</span>
              <span class="v">${sets.length} sets</span>
            </div>`;
          }).join('')}</div>`
        : `<p class="small muted">No completed working sets for this exercise yet.</p>`}
    </div>
    <div class="row between">
      <span class="tiny muted">${exercise.isCustom ? 'Your custom exercise' : 'Built-in library exercise'}</span>
      <div class="row tight">
        ${canAdd ? `<button class="btn btn-soft btn-sm" type="button" data-action="add-exercise-from-library" data-exercise="${escapeHTML(exercise.id)}">${icon('plus', 14)} Add to open session</button>` : ''}
        ${exercise.isCustom ? `<button class="btn btn-ghost btn-sm" type="button" data-action="edit-custom-exercise" data-exercise="${escapeHTML(exercise.id)}">Edit</button><button class="btn btn-danger-ghost btn-sm" type="button" data-action="delete-custom-exercise" data-exercise="${escapeHTML(exercise.id)}">Delete</button>` : ''}
      </div>
    </div>
  </div>`;
}

export function customExerciseFormBody(exercise = null) {
  const ex = exercise || {
    name: '', primary: [], secondary: [], equipment: ['dumbbells'], pattern: 'isolation',
    difficulty: 'beginner', tracking: 'reps-weight', instructions: '', tip: '',
    sets: 3, repMin: 8, repMax: 12, rest: 90, duration: 30
  };
  const selectedEquipment = ex.equipment || ['bodyweight'];
  return `<form id="custom-exercise-form" class="stack" novalidate>
    <input type="hidden" name="id" value="${escapeHTML(ex.id || '')}">
    <div class="field">
      <label for="ce-name">Exercise name</label>
      <input class="input" id="ce-name" name="name" maxlength="80" required value="${escapeHTML(ex.name)}" placeholder="e.g. Banded high-to-low row" autofocus>
      <span class="field-error" data-error-for="name"></span>
    </div>
    <div class="field">
      <span class="field-label">Primary muscles <small class="muted">(choose at least one)</small></span>
      <div class="check-list" style="max-height:126px;overflow:auto">
        ${MUSCLES.map((m) => `<label class="check"><input type="checkbox" name="primary" value="${m.id}" ${(ex.primary || []).includes(m.id) ? 'checked' : ''}> ${escapeHTML(m.label)}</label>`).join('')}
      </div>
      <span class="field-error" data-error-for="primary"></span>
    </div>
    <details>
      <summary class="field-label" style="cursor:pointer;padding:2px 0">Secondary muscles <span class="muted" style="font-weight:400">(optional)</span></summary>
      <div class="check-list" style="max-height:126px;overflow:auto;margin-top:7px">
        ${MUSCLES.map((m) => `<label class="check"><input type="checkbox" name="secondary" value="${m.id}" ${(ex.secondary || []).includes(m.id) ? 'checked' : ''}> ${escapeHTML(m.label)}</label>`).join('')}
      </div>
    </details>
    <div class="field">
      <span class="field-label">Equipment</span>
      <div class="check-list">
        ${Object.entries(EQUIPMENT_LABELS).map(([id, label]) => `<label class="check"><input type="checkbox" name="equipment" value="${id}" ${selectedEquipment.includes(id) ? 'checked' : ''}> ${escapeHTML(label)}</label>`).join('')}
      </div>
      <span class="field-error" data-error-for="equipment"></span>
    </div>
    <div class="field-grid">
      <div class="field"><label for="ce-pattern">Movement pattern</label>
        <select class="select" id="ce-pattern" name="pattern">${Object.entries(MOVEMENT_LABELS).map(([id, label]) => `<option value="${id}" ${ex.pattern === id ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="ce-difficulty">Difficulty</label>
        <select class="select" id="ce-difficulty" name="difficulty">${['beginner', 'intermediate', 'advanced'].map((d) => `<option value="${d}" ${ex.difficulty === d ? 'selected' : ''}>${d[0].toUpperCase() + d.slice(1)}</option>`).join('')}</select>
      </div>
      <div class="field span-2"><label for="ce-tracking">Tracking type</label>
        <select class="select" id="ce-tracking" name="tracking">${Object.entries(TRACKING_LABELS).map(([id, label]) => `<option value="${id}" ${ex.tracking === id ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('')}</select>
        <span class="hint">Weighted sets count toward external-load volume; timed holds count duration instead of reps.</span>
      </div>
    </div>
    <div class="field-grid three">
      <div class="field"><label for="ce-sets">Default sets</label><input class="input" id="ce-sets" name="sets" type="number" min="1" max="12" step="1" value="${ex.sets || 3}"></div>
      <div class="field"><label for="ce-repmin">Rep min</label><input class="input" id="ce-repmin" name="repMin" type="number" min="0" max="100" step="1" value="${ex.repMin ?? ''}"></div>
      <div class="field"><label for="ce-repmax">Rep max</label><input class="input" id="ce-repmax" name="repMax" type="number" min="0" max="100" step="1" value="${ex.repMax ?? ''}"></div>
      <div class="field"><label for="ce-rest">Rest (seconds)</label><input class="input" id="ce-rest" name="rest" type="number" min="0" max="600" step="5" value="${ex.rest ?? 90}"></div>
      <div class="field"><label for="ce-duration">Hold target (sec)</label><input class="input" id="ce-duration" name="duration" type="number" min="0" max="7200" step="5" value="${ex.duration ?? ''}"></div>
      <div class="field"></div>
    </div>
    <div class="field">
      <label for="ce-instructions">Instructions</label>
      <textarea class="textarea" id="ce-instructions" name="instructions" maxlength="800" required placeholder="A clear sentence or two about setup and movement.">${escapeHTML(ex.instructions || '')}</textarea>
      <span class="field-error" data-error-for="instructions"></span>
    </div>
    <div class="field">
      <label for="ce-tip">Technique note <span class="muted" style="font-weight:400">(optional)</span></label>
      <input class="input" id="ce-tip" name="tip" maxlength="240" value="${escapeHTML(ex.tip || '')}">
    </div>
    <div class="notice">${icon('info', 15)}<span>Custom exercises live only in this browser. Deleting one keeps its name and values inside historical workouts.</span></div>
  </form>`;
}

export function exerciseFormFooter(exercise = null) {
  return `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancel</button>
    <button class="btn btn-primary btn-sm" type="submit" form="custom-exercise-form">${exercise ? 'Save exercise' : 'Create exercise'}</button>`;
}
