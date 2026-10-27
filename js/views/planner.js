import { state, prefs } from '../store.js';
import { resolveDay, trackingFlags, weekStats } from '../services.js';
import { EQUIPMENT_LABELS } from '../data/muscles.js';
import {
  escapeHTML, fmtDate, todayISO, addDays, weekdayName, kgToDisplay, weightUnit,
  startOfWeekISO
} from '../utils.js';
import { icon, emptyState } from '../ui.js';
import { pageHead, units } from './common.js';

export function renderPlanner() {
  if (state.ui.planner.draft) return routineEditorView(state.ui.planner.draft);
  return plannerOverview();
}

function plannerOverview() {
  const week = weekStats();
  const trainingDays = Object.values(state.weekly?.days || {}).filter((d) => d?.type === 'routine').length;
  const upcoming = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(todayISO(), i);
    return resolveDay(iso);
  });

  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Routines & schedule',
      title: 'Planner',
      sub: 'Build routines, assign them to weekdays, and shape future sessions. Editing the plan never rewrites past workouts.',
      actions: `<button class="btn btn-ghost btn-sm" type="button" data-action="goto-calendar">${icon('calendar', 15)} Calendar</button><button class="btn btn-primary btn-sm" type="button" data-action="new-routine">${icon('plus', 15)} New routine</button>`
    })}
    <div class="grid grid-main-side">
      <div class="stack">
        <div class="card">
          <div class="card-head"><div><span class="eyebrow">Templates</span><h2 style="margin-top:2px">Your routines</h2></div><span class="pill">${state.routines.length}</span></div>
          ${state.routines.length
            ? `<div class="routine-grid">${state.routines.map((routine, index) => {
                const exerciseNames = (routine.exercises || []).map((e) => state.exercises.find((ex) => ex.id === e.exerciseId)?.name || 'Removed exercise');
                return `<div class="routine-card">
                  <div class="row between" style="gap:6px;align-items:flex-start">
                    <h3>${escapeHTML(routine.name)}</h3>
                    <span class="pill">${routine.exercises?.length || 0} ex</span>
                  </div>
                  <p class="r-meta">${escapeHTML(routine.notes || 'No notes')}</p>
                  <p class="r-ex">${escapeHTML(exerciseNames.slice(0, 4).join(' · ') || 'No exercises yet')}${exerciseNames.length > 4 ? ' …' : ''}</p>
                  <div class="r-actions">
                    <button class="btn btn-primary btn-xs" type="button" data-action="start-routine" data-routine="${escapeHTML(routine.id)}">${icon('play', 12)} Start</button>
                    <button class="btn btn-ghost btn-xs" type="button" data-action="edit-routine" data-routine="${escapeHTML(routine.id)}">Edit</button>
                    <button class="btn btn-ghost btn-xs" type="button" data-action="duplicate-routine" data-routine="${escapeHTML(routine.id)}">Duplicate</button>
                    <button class="mini-icon-btn" type="button" data-action="move-routine" data-routine="${escapeHTML(routine.id)}" data-dir="-1" aria-label="Move routine up" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp', 13)}</button>
                    <button class="mini-icon-btn" type="button" data-action="move-routine" data-routine="${escapeHTML(routine.id)}" data-dir="1" aria-label="Move routine down" ${index === state.routines.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 13)}</button>
                    <button class="mini-icon-btn" type="button" data-action="delete-routine" data-routine="${escapeHTML(routine.id)}" aria-label="Delete routine">${icon('trash', 13)}</button>
                  </div>
                </div>`;
              }).join('')}</div>`
            : emptyState('clipboard', 'No routines yet', 'Create a routine once, then start it whenever you like. Editable starter routines normally live here; you can add your own from scratch.', `<button class="btn btn-primary btn-sm" type="button" data-action="new-routine">Create your first routine</button>`)}
        </div>

        <div class="card">
          <div class="card-head"><div><span class="eyebrow">Next seven days</span><h2 style="margin-top:2px">Upcoming sessions</h2></div><button class="head-link" type="button" data-action="goto-calendar">Open calendar ${icon('chevronRight', 12)}</button></div>
          <div class="week-sessions">
            ${upcoming.map((day) => {
              const has = day.sessions.length > 0;
              return `<div class="week-day-row">
                <div class="wd">${escapeHTML(fmtDate(day.date, { weekday: 'short' }))}<small>${fmtDate(day.date, { month: 'short', day: 'numeric' })}</small></div>
                <div class="row between" style="gap:6px">
                  <button class="link-btn" type="button" data-action="select-date" data-date="${day.date}">${escapeHTML(has ? day.sessions.map((s) => s.name).join(' · ') : day.rest ? 'Rest day' : 'Unscheduled')}</button>
                  ${day.auto ? `<button class="btn btn-soft btn-xs" type="button" data-action="start-plan" data-date="${day.date}" data-routine="${escapeHTML(day.auto.routineId || '')}" data-auto="1" data-plan="${escapeHTML(day.auto.id)}">${icon('play', 11)} Start</button>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <aside class="stack">
        <div class="card">
          <div class="card-head"><h2>Weekly rhythm</h2><span class="pill sage">${trainingDays} training days</span></div>
          <div class="week-plan">
            ${[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
              const entry = state.weekly?.days?.[weekday] || { type: 'none' };
              const value = entry.type === 'routine' ? `routine:${entry.routineId}` : entry.type === 'rest' ? 'rest' : 'none';
              return `<div class="week-plan-row">
                <div class="day-name">${escapeHTML(weekdayName(weekday))}<small>${weekday === new Date().getDay() ? 'Today' : 'Weekly template'}</small></div>
                <select class="select" aria-label="Plan for ${escapeHTML(weekdayName(weekday))}" data-weekday="${weekday}">
                  <option value="none" ${value === 'none' ? 'selected' : ''}>Unscheduled / open</option>
                  <option value="rest" ${value === 'rest' ? 'selected' : ''}>Rest day</option>
                  ${state.routines.map((r) => `<option value="routine:${escapeHTML(r.id)}" ${value === `routine:${r.id}` ? 'selected' : ''}>${escapeHTML(r.name)}</option>`).join('')}
                </select>
                <span class="tiny muted">${value === 'rest' ? 'rest' : value === 'none' ? 'open' : 'plan'}</span>
              </div>`;
            }).join('')}
          </div>
          <p class="tiny muted" style="margin-top:10px">The weekly template shapes future and current days. Rest days are intentional and never counted as missed; open days are simply unscheduled.</p>
        </div>
        <div class="card tinted-sage">
          <div class="card-head"><h2>This week</h2></div>
          <p class="small soft">${week.completed} of ${week.due} planned sessions complete${week.pct != null ? ` · ${week.pct}%` : ''}.</p>
          <div class="progress-track" style="margin:10px 0 8px"><span style="width:${week.pct || 0}%"></span></div>
          <p class="tiny muted">Target: ${state.profile?.weeklyTarget || 3} sessions per week. Adjust it in Settings.</p>
        </div>
        <div class="card">
          <div class="card-head"><h2>Planning notes</h2></div>
          <ul class="list-clean" style="font-size:.77rem;color:var(--text-soft);gap:0">
            <li style="padding:8px 0">A planned session you miss stays “planned” unless you explicitly skip it.</li>
            <li style="padding:8px 0">Moving or editing a plan only changes the schedule; historical workouts keep their own records.</li>
            <li style="padding:8px 0">Starting a routine creates a fresh editable workout with prefilled, uncompleted sets.</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>`;
}

function routineEditorView(draft) {
  const unitSystem = units();
  return `<div class="view-inner">
    <div class="page-head">
      <div>
        <button class="link-btn" type="button" data-action="cancel-routine-editor">← Planner</button>
        <h1 style="margin-top:7px">${draft.isNew ? 'New routine' : 'Edit routine'}</h1>
        <p class="sub">Order the movements, set gentle targets, and save. Nothing starts until you choose Start.</p>
      </div>
      <div class="page-head-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="cancel-routine-editor">Cancel</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="save-routine">${icon('check', 15)} Save routine</button>
      </div>
    </div>
    <div class="grid grid-main-side">
      <div class="stack">
        <div class="card">
          <div class="field-grid">
            <div class="field span-2">
              <label for="routine-name">Routine name</label>
              <input class="input" id="routine-name" maxlength="60" value="${escapeHTML(draft.name || '')}" placeholder="e.g. Cozy upper body" data-routine-field="name">
              <span class="field-error" id="routine-name-error"></span>
            </div>
            <div class="field span-2">
              <label for="routine-notes">Notes <span class="muted" style="font-weight:400">(optional)</span></label>
              <textarea class="textarea" id="routine-notes" maxlength="400" placeholder="Intent, pacing, anything you want to remember." data-routine-field="notes">${escapeHTML(draft.notes || '')}</textarea>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><span class="eyebrow">Ordered exercises</span><h2 style="margin-top:2px">${draft.exercises.length} ${draft.exercises.length === 1 ? 'movement' : 'movements'}</h2></div><span class="pill">${draft.exercises.reduce((n, e) => n + (Number(e.sets) || 0), 0)} planned sets</span></div>
          ${draft.exercises.length
            ? `<div class="routine-editor-list">${draft.exercises.map((row, index) => {
                const exercise = state.exercises.find((e) => e.id === row.exerciseId);
                const flags = trackingFlags(exercise?.tracking || 'reps-weight');
                return `<div class="routine-editor-row" data-index="${index}">
                  <div class="rex-top">
                    <div class="rex-name">${escapeHTML(exercise?.name || row.name || 'Removed exercise')}<small>${escapeHTML((exercise?.primary || row.primary || []).join(', '))}</small></div>
                    <div class="row tight">
                      <button class="mini-icon-btn" type="button" data-action="move-routine-exercise" data-index="${index}" data-dir="-1" aria-label="Move exercise up" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp', 13)}</button>
                      <button class="mini-icon-btn" type="button" data-action="move-routine-exercise" data-index="${index}" data-dir="1" aria-label="Move exercise down" ${index === draft.exercises.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 13)}</button>
                      <button class="mini-icon-btn" type="button" data-action="remove-routine-exercise" data-index="${index}" aria-label="Remove exercise">${icon('trash', 13)}</button>
                    </div>
                  </div>
                  <div class="rex-fields">
                    <label class="mini-field">Sets <input class="input input-sm" type="number" min="1" max="12" step="1" value="${row.sets}" data-routine-exercise-field="sets" data-index="${index}"></label>
                    ${flags.duration
                      ? `<label class="mini-field">Hold (s) <input class="input input-sm" type="number" min="1" max="7200" step="5" value="${row.duration ?? ''}" data-routine-exercise-field="duration" data-index="${index}"></label>`
                      : `<label class="mini-field">Rep min <input class="input input-sm" type="number" min="0" max="100" step="1" value="${row.repMin ?? ''}" data-routine-exercise-field="repMin" data-index="${index}"></label>
                         <label class="mini-field">Rep max <input class="input input-sm" type="number" min="0" max="100" step="1" value="${row.repMax ?? ''}" data-routine-exercise-field="repMax" data-index="${index}"></label>`}
                    <label class="mini-field">Rest (s) <input class="input input-sm" type="number" min="0" max="600" step="5" value="${row.rest ?? 90}" data-routine-exercise-field="rest" data-index="${index}"></label>
                    ${flags.weight ? `<label class="mini-field">Load (${weightUnit(unitSystem)}) <input class="input input-sm" type="number" min="0" max="999" step="0.5" value="${row.weightKg != null ? kgToDisplay(row.weightKg, unitSystem) : ''}" placeholder="optional" data-routine-exercise-field="weight" data-index="${index}"></label>` : ''}
                  </div>
                </div>`;
              }).join('')}</div>`
            : emptyState('dumbbell', 'No movements yet', 'Add exercises from your library below. You can reorder them once they are in the routine.', '')}
          <div class="row" style="margin-top:14px;gap:7px;flex-wrap:wrap">
            <select class="select" id="routine-exercise-select" aria-label="Exercise to add" style="flex:1 1 220px">
              ${state.exercises.map((ex) => `<option value="${escapeHTML(ex.id)}">${escapeHTML(ex.name)} — ${escapeHTML(EQUIPMENT_LABELS[ex.equipment?.[0]] || 'Bodyweight')}</option>`).join('')}
            </select>
            <button class="btn btn-soft btn-sm" type="button" data-action="add-routine-exercise">${icon('plus', 15)} Add exercise</button>
          </div>
          <span class="field-error" id="routine-exercises-error"></span>
        </div>
      </div>
      <aside class="stack">
        <div class="card tinted-sage">
          <div class="card-head"><h2>Routine preview</h2></div>
          <p class="small soft"><strong>${escapeHTML(draft.name || 'Untitled routine')}</strong>${draft.notes ? `<br />${escapeHTML(draft.notes)}` : ''}</p>
          <div class="side-stat" style="margin-top:8px"><span>Exercises</span><span>${draft.exercises.length}</span></div>
          <div class="side-stat"><span>Planned sets</span><span>${draft.exercises.reduce((n, e) => n + (Number(e.sets) || 0), 0)}</span></div>
          <div class="side-stat"><span>Typical rest</span><span>${draft.exercises.length ? `~${Math.round(draft.exercises.reduce((n, e) => n + (Number(e.rest) || 90), 0) / draft.exercises.length)}s` : '—'}</span></div>
          <p class="tiny muted" style="margin-top:10px">Targets are starting points. Prefilled values from your last session are never counted as completed until you mark them.</p>
        </div>
        <div class="card">
          <div class="card-head"><h2>Tips for kind planning</h2></div>
          <ul class="list-clean" style="font-size:.77rem;color:var(--text-soft)">
            <li style="padding:8px 0">Two to four sets per exercise is plenty for most home sessions.</li>
            <li style="padding:8px 0">Leave a rep or two in reserve, especially on new movements.</li>
            <li style="padding:8px 0">Rest days belong in the plan, not outside it.</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>`;
}
