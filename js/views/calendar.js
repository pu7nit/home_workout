import { state, prefs, activeWorkout } from '../store.js';
import {
  resolveDay, monthStats, weekStats, totalWorkoutStats, workoutDurationLabel
} from '../services.js';
import {
  escapeHTML, fmtDate, fmtMonthYear, monthGrid, todayISO, addDays, startOfWeekISO,
  endOfWeekISO, parseISO, weekdayName, formatWeight, formatDuration
} from '../utils.js';
import { icon, emptyState } from '../ui.js';
import { pageHead, units } from './common.js';

function dayStatusLabel(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'planned') return 'Planned';
  if (status === 'skipped') return 'Skipped';
  if (status === 'rest') return 'Rest day';
  if (status === 'in-progress') return 'In progress';
  return 'Unscheduled';
}

function statusPill(status, extra = '') {
  const cls = status === 'completed' ? 'sage dot' : status === 'planned' ? 'lav dot' : status === 'skipped' ? 'blush dot' : status === 'rest' ? 'dot' : status === 'in-progress' ? 'peach dot' : '';
  return `<span class="pill ${cls}">${escapeHTML(extra || dayStatusLabel(status))}</span>`;
}

function dotClasses(day) {
  const out = [];
  const completed = day.sessions.filter((s) => s.status === 'completed').length;
  const inProgress = day.sessions.filter((s) => s.status === 'in-progress' || s.workout?.status === 'in-progress').length;
  const planned = day.sessions.filter((s) => s.status === 'planned').length;
  const skipped = day.sessions.filter((s) => s.status === 'skipped').length;
  if (completed) out.push('done');
  if (inProgress) out.push('progress');
  if (planned) out.push('planned');
  if (skipped && !completed && !planned) out.push('skipped');
  if (!out.length && day.rest) out.push('rest');
  return out.slice(0, 4);
}

function monthCell(cell, selected) {
  const day = resolveDay(cell.iso);
  const dots = dotClasses(day);
  const primarySession = day.sessions.find((s) => s.status === 'completed') || day.plans[0] || day.sessions[0];
  let label = '';
  if (day.rest) label = 'Rest';
  else if (primarySession) label = primarySession.name;
  const plansCount = day.plans.length;
  return `<button class="cal-day ${cell.inMonth ? '' : 'other'} ${cell.isToday ? 'today' : ''} ${cell.iso === selected ? 'selected' : ''} ${day.rest ? 'rest' : ''} ${day.plans.length ? 'has-plan' : ''}"
    type="button" data-action="select-date" data-date="${cell.iso}"
    aria-label="${escapeHTML(fmtDate(cell.iso, { weekday: 'long', month: 'long', day: 'numeric' }))}: ${escapeHTML(dots.length ? dots.map((d) => d === 'done' ? 'completed session' : d === 'planned' ? 'planned session' : d === 'skipped' ? 'skipped session' : d === 'rest' ? 'rest day' : 'in progress').join(', ') : 'unscheduled')}"
    ${cell.iso === selected ? 'aria-current="date"' : ''}>
    <span class="cal-num">${cell.day}</span>
    ${plansCount > 1 ? `<span class="mini-count">${plansCount}</span>` : ''}
    <span class="cal-dots" aria-hidden="true">${dots.map((d) => `<span class="badge-dot ${d}"></span>`).join('')}</span>
    <span class="cal-label">${escapeHTML(label)}</span>
  </button>`;
}

function weekStripView(selected) {
  const weekStart = startOfWeekISO(selected, Number(prefs.get('weekStart')) || 1);
  const rows = [];
  for (let i = 0; i < 7; i += 1) {
    const iso = addDays(weekStart, i);
    const day = resolveDay(iso);
    const isSelected = iso === state.ui.calendar.selected;
    const names = day.sessions.map((s) => `${s.name}${s.status === 'planned' ? ' (planned)' : s.status === 'skipped' ? ' (skipped)' : s.status === 'completed' ? ' (done)' : ''}`);
    rows.push(`<button class="week-day-card ${iso === todayISO() ? 'today' : ''} ${isSelected ? 'selected' : ''}" type="button" data-action="select-date" data-date="${iso}">
      <span class="wdc-date"><span class="wdc-dow">${escapeHTML(fmtDate(iso, { weekday: 'short' }))}</span><span class="wdc-num">${parseISO(iso).getDate()}</span></span>
      <span class="wdc-main">
        <span class="wdc-title">${escapeHTML(names.join(' · ') || (day.rest ? 'Planned rest day' : 'Unscheduled'))}</span>
        <span class="wdc-meta">${escapeHTML(fmtDate(iso, { month: 'short', day: 'numeric' }))}</span>
      </span>
      ${statusPill(day.status)}
    </button>`);
  }
  return `<div class="week-list">${rows.join('')}</div>`;
}

function sessionCard(session, date) {
  const plan = !session.source || session.source !== 'workout' ? session : null;
  const workout = session.workout;
  const stats = workout ? totalWorkoutStats(workout) : null;
  const routineCount = session.routine?.exercises?.length;
  const overdue = session.status === 'planned' && date < todayISO();
  const meta = workout
    ? `${stats.sets} sets · ${stats.reps} reps${stats.volume > 0 ? ` · ${formatWeight(stats.volume, units())}` : ''}${stats.duration ? ` · ${formatDuration(stats.duration)}` : ''}`
    : `${routineCount ? `${routineCount} exercises · ` : ''}${session.source === 'template' ? 'From your weekly plan' : session.source === 'manual' ? 'Planned session' : ''}`;

  const actions = [];
  if (session.status === 'in-progress' || workout?.status === 'in-progress') {
    actions.push(`<button class="btn btn-primary btn-xs" type="button" data-action="resume-workout" data-workout="${workout?.id || session.workoutId}">${icon('play', 12)} Resume</button>`);
  } else if (session.status === 'completed' || workout?.status === 'completed') {
    actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="open-workout" data-workout="${workout?.id || session.workoutId}">View summary</button>`);
    actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="edit-workout" data-workout="${workout?.id || session.workoutId}">Edit</button>`);
  } else if (session.status === 'planned') {
    actions.push(`<button class="btn btn-primary btn-xs" type="button" data-action="start-plan" data-date="${date}" data-routine="${escapeHTML(session.routineId || '')}" data-auto="${session.auto ? '1' : '0'}" data-plan="${escapeHTML(session.id)}">${icon('play', 12)} Start</button>`);
    if (!session.auto) {
      actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="edit-plan" data-plan="${escapeHTML(session.id)}">Edit</button>`);
    }
    actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="move-plan" data-plan="${escapeHTML(session.id)}" data-date="${date}" data-auto="${session.auto ? '1' : '0'}">Move</button>`);
    actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="skip-plan" data-plan="${escapeHTML(session.id)}" data-date="${date}" data-routine="${escapeHTML(session.routineId || '')}" data-auto="${session.auto ? '1' : '0'}">Skip</button>`);
    if (!session.auto) actions.push(`<button class="mini-icon-btn" type="button" data-action="delete-plan" data-plan="${escapeHTML(session.id)}" aria-label="Delete planned session">${icon('trash', 14)}</button>`);
  } else if (session.status === 'skipped') {
    actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="restore-plan" data-plan="${escapeHTML(session.id)}">Mark as planned</button>`);
    actions.push(`<button class="btn btn-ghost btn-xs" type="button" data-action="delete-plan" data-plan="${escapeHTML(session.id)}">Delete</button>`);
  }

  return `<div class="day-session">
    <div class="s-title">${statusPill(session.status, overdue ? 'Planned · not logged' : undefined)} <span>${escapeHTML(session.name)}</span></div>
    <div class="s-meta">${escapeHTML(meta)}${overdue && session.status === 'planned' ? ' · Mark it skipped if you are moving on, or start it late.' : ''}</div>
    ${workout?.notes ? `<div class="tiny muted" style="margin-top:3px">${escapeHTML(workout.notes)}</div>` : ''}
    <div class="s-actions">${actions.join('')}</div>
  </div>`;
}

function dayPanel(selected) {
  const day = resolveDay(selected);
  const completedAnything = day.sessions.some((s) => s.status === 'completed');
  const month = monthStats(selected);
  return `<div class="card day-panel" aria-label="Sessions on ${escapeHTML(fmtDate(selected, { weekday: 'long', month: 'long', day: 'numeric' }))}">
    <div class="card-head" style="align-items:flex-start">
      <div>
        <span class="eyebrow">${escapeHTML(fmtDate(selected, { weekday: 'long' }))}</span>
        <h2 style="margin-top:2px">${escapeHTML(fmtDate(selected, { month: 'long', day: 'numeric', year: 'numeric' }))}</h2>
        <div class="row tight" style="margin-top:6px">${statusPill(day.status)}${day.sessions.length > 1 ? `<span class="pill">${day.sessions.length} sessions</span>` : ''}</div>
      </div>
      <div class="row tight">
        <button class="btn btn-ghost btn-xs" type="button" data-action="start-blank" data-date="${selected}">${icon('plus', 12)} Log</button>
        <button class="btn btn-soft btn-xs" type="button" data-action="open-plan-dialog" data-date="${selected}">Plan</button>
      </div>
    </div>
    ${day.sessions.length
      ? day.sessions.map((s) => sessionCard(s, selected)).join('')
      : `<div class="status-note" style="margin-bottom:12px">${icon(day.rest ? 'heart' : 'calendar', 15)}<span>${day.rest ? 'This is a planned rest day. Rest days never count as missed, and you can still add a session if you feel like moving.' : 'Nothing planned here. Unscheduled days are not marked as missed.'}</span></div>`}
    ${day.sessions.length ? `<div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px"><button class="link-btn" type="button" data-action="open-plan-dialog" data-date="${selected}">${icon('plus', 12)} Add another planned session</button></div>` : ''}
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
      <div class="row between" style="align-items:baseline"><span class="eyebrow">${escapeHTML(fmtDate(selected, { month: 'long' }))} consistency</span><span class="pill ${month.pct != null && month.pct >= 80 ? 'sage' : ''}">${month.pct == null ? 'No plan due' : `${month.pct}%`}</span></div>
      <p class="tiny muted" style="margin-top:5px">${month.due ? `${month.completed} of ${month.due} planned sessions completed.` : 'No planned sessions have come due this month yet.'} ${month.skipped ? `${month.skipped} explicitly skipped.` : ''} ${month.workoutDays} ${month.workoutDays === 1 ? 'day' : 'days'} with a workout.</p>
      <div class="progress-track" style="margin-top:7px"><span style="width:${month.pct || 0}%"></span></div>
    </div>
  </div>`;
}

export function renderCalendar() {
  const ui = state.ui.calendar;
  const weekStart = Number(prefs.get('weekStart')) || 1;
  const weekLabels = Array.from({ length: 7 }, (_, i) => weekdayName((weekStart + i) % 7, 'short'));
  const selected = ui.selected;
  const monthAnchor = ui.anchor || selected;
  const cells = monthGrid(monthAnchor, weekStart);
  const stats = monthStats(monthAnchor);
  const isWeek = ui.mode === 'week';
  const rangeStart = isWeek ? startOfWeekISO(selected, weekStart) : `${monthAnchor.slice(0, 7)}-01`;
  const rangeEnd = isWeek ? endOfWeekISO(selected, weekStart) : addDays(`${monthAnchor.slice(0, 7)}-01`, 40);
  const week = weekStats(selected);

  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Plan & rhythm',
      title: 'Calendar',
      sub: 'Completed, planned, skipped, rest and unscheduled days are deliberately different things here.',
      actions: `<button class="btn btn-ghost btn-sm" type="button" data-action="calendar-today">Today</button><button class="btn btn-soft btn-sm" type="button" data-action="open-plan-dialog" data-date="${selected}">${icon('plus', 15)} Plan session</button>`
    })}
    <div class="calendar-layout">
      <div class="card calendar-card">
        <div class="calendar-head">
          <div class="calendar-nav">
            <button class="icon-btn" type="button" data-action="calendar-prev" aria-label="Previous ${isWeek ? 'week' : 'month'}">${icon('chevronLeft')}</button>
            <h2>${escapeHTML(isWeek ? `${fmtDate(rangeStart, { month: 'short', day: 'numeric' })} – ${fmtDate(rangeEnd, { month: 'short', day: 'numeric', year: 'numeric' })}` : fmtMonthYear(monthAnchor))}</h2>
            <button class="icon-btn" type="button" data-action="calendar-next" aria-label="Next ${isWeek ? 'week' : 'month'}">${icon('chevronRight')}</button>
          </div>
          <div class="segmented" role="group" aria-label="Calendar view">
            <button type="button" class="${!isWeek ? 'active' : ''}" data-action="calendar-mode" data-mode="month" aria-pressed="${!isWeek}">Month</button>
            <button type="button" class="${isWeek ? 'active' : ''}" data-action="calendar-mode" data-mode="week" aria-pressed="${isWeek}">Week</button>
          </div>
        </div>
        ${isWeek
          ? weekStripView(selected)
          : `<div class="calendar-weekdays" aria-hidden="true">${weekLabels.map((d) => `<span>${escapeHTML(d)}</span>`).join('')}</div>
            <div class="calendar-grid">${cells.map((cell) => monthCell(cell, selected)).join('')}</div>`}
        <div class="calendar-legend">
          <span><span class="badge-dot done"></span>Completed</span>
          <span><span class="badge-dot planned"></span>Planned</span>
          <span><span class="badge-dot skipped"></span>Skipped</span>
          <span><span class="badge-dot progress"></span>In progress</span>
          <span><span class="badge-dot rest"></span>Rest</span>
        </div>
        <div class="row between" style="margin-top:12px;flex-wrap:wrap;gap:6px">
          <p class="tiny muted">Month: ${stats.due ? `${stats.completed}/${stats.due} planned complete` : 'no plan due'}${stats.pct != null ? ` · ${stats.pct}%` : ''}</p>
          <button class="link-btn" type="button" data-action="goto-planner">Edit weekly plan</button>
        </div>
      </div>
      <div>
        ${dayPanel(selected)}
        <div class="card" style="margin-top:12px">
          <div class="card-head"><h3>Week at a glance</h3><span class="pill ${week.pct != null && week.pct >= 80 ? 'sage' : ''}">${week.pct == null ? 'Open' : `${week.pct}%`}</span></div>
          <p class="tiny muted">${week.completed} of ${week.due} sessions due so far${week.extraWorkouts ? ` · ${week.extraWorkouts} extra workout${week.extraWorkouts === 1 ? '' : 's'}` : ''}.</p>
          <div class="progress-track" style="margin-top:8px"><span style="width:${week.pct || 0}%"></span></div>
          <p class="tiny muted" style="margin-top:9px">Streaks count consecutive weeks with at least one completed session, so planned rest days and open days never break them.</p>
        </div>
      </div>
    </div>
  </div>`;
}
