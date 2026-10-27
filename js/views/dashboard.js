import { state, activeWorkout } from '../store.js';
import {
  weekStats, computeStreaks, resolveDay, recentPRs, strengthImprovements,
  frequentlyTrainedMuscles, workoutDurationLabel, muscleLabel, totalWorkoutStats
} from '../services.js';
import {
  fmtDate, todayISO, addDays, fmtMonthYear, parseISO, formatWeight, formatDuration,
  greeting, escapeHTML, kgToDisplay, roundTo, formatNumber, weightUnit
} from '../utils.js';
import { icon, barChart, lineChart, emptyState, statCard } from '../ui.js';
import { pageHead, units, workoutRow, muscleList } from './common.js';
import { prefs } from '../store.js';

function count(value, suffix = '') {
  return `<span data-count-to="${value}" data-count-suffix="${escapeHTML(suffix)}">0</span>`;
}

function weekDayStrip(week) {
  return `<div class="week-strip" aria-label="This week's schedule">
    ${week.days.map((day) => {
      const d = parseISO(day.date);
      const isToday = day.date === todayISO();
      const status = day.status;
      const label = day.plans[0]?.name || (status === 'rest' ? 'Rest' : status === 'unscheduled' ? 'Open' : '');
      return `<button class="week-strip-day ${isToday ? 'today' : ''}" type="button" data-action="select-date" data-date="${day.date}" data-goto-calendar="1" title="${escapeHTML(fmtDate(day.date, { weekday: 'long', month: 'short', day: 'numeric' }))}: ${escapeHTML(label || 'nothing planned')}">
        <span class="wd-name">${escapeHTML(fmtDate(day.date, { weekday: 'short' }).slice(0, 2))}</span>
        <span class="wd-num">${d.getDate()}</span>
        <span class="badge-dot ${status === 'completed' ? 'done' : status === 'planned' ? 'planned' : status === 'skipped' ? 'skipped' : status === 'in-progress' ? 'progress' : status === 'rest' ? 'rest' : ''}"></span>
      </button>`;
    }).join('')}
  </div>`;
}

export function renderDashboard() {
  const profile = state.profile;
  const unitsSystem = units();
  const active = activeWorkout();
  const week = weekStats(todayISO());
  const streaks = computeStreaks();
  const today = resolveDay(todayISO());
  const bodyWeight = state.weights[0] || null;
  const targetWeight = profile?.targetWeightKg || null;
  const prs = recentPRs(4);
  const improvements = strengthImprovements(3);
  const focus = frequentlyTrainedMuscles(4);
  const recent = state.workouts.filter((w) => w.status === 'completed').slice(0, 4);
  const weeklySeries = state.workouts
    .filter((w) => w.status === 'completed')
    .slice(0);
  // Weekly sets for a small, honest chart.
  const weeks = [];
  let start = week.weekStart;
  for (let i = 5; i >= 0; i -= 1) {
    const ws = addDays(start, -7 * i);
    const we = addDays(ws, 6);
    let sets = 0;
    let workouts = 0;
    for (const w of weeklySeries) {
      if (w.date >= ws && w.date <= we) {
        workouts += 1;
        sets += totalWorkoutStats(w).sets;
      }
    }
    weeks.push({ label: fmtDate(ws, { month: 'short', day: 'numeric' }), sets, workouts });
  }
  const chartSets = weeks.map((w) => w.sets);
  const todayPlan = today.plans.find((p) => p.status === 'planned') || null;
  const todayCompleted = today.sessions.filter((s) => s.status === 'completed');
  const weightEntries = state.weights.slice(0, 16).reverse();
  const weightDelta = weightEntries.length > 1
    ? Number(weightEntries[weightEntries.length - 1].weightKg) - Number(weightEntries[0].weightKg)
    : null;

  const heroSub = active
    ? `You have “${active.name}” open. Pick up where you left off — nothing is lost.`
    : recent.length === 0
      ? 'A calm corner for getting stronger at home. Start with one small session; your strength map fills in as you train.'
      : `You’ve trained ${week.workoutCount} ${week.workoutCount === 1 ? 'time' : 'times'} this week. ${week.pct != null ? `${week.pct}% of planned sessions are complete.` : 'Add a routine to the planner when you want a little structure.'}`;

  let todayContent = '';
  if (active) {
    todayContent = `<div class="today-label"><span class="eyebrow">In progress</span><span class="pill peach dot">${escapeHTML(formatDuration(Math.max(0, Math.round((Date.now() - (active.startedAt || Date.now())) / 1000))))}</span></div>
      <h2>${escapeHTML(active.name)}</h2>
      <p class="today-detail">${active.exercises?.length || 0} exercises · ${active.exercises?.reduce((n, e) => n + (e.sets?.filter((s) => s.completed).length || 0), 0) || 0} sets done</p>
      <div class="today-actions"><button class="btn btn-primary btn-sm" type="button" data-action="resume-workout" data-workout="${active.id}">${icon('play', 15)} Resume session</button></div>`;
  } else if (todayPlan) {
    const exs = todayPlan.routine?.exercises || [];
    const estimated = exs.reduce((mins, e) => mins + ((Number(e.sets) || 3) * ((Number(e.rest) || 90) + 40)) / 60, 0);
    todayContent = `<div class="today-label"><span class="eyebrow">Planned for today</span><span class="pill lav dot">${todayPlan.auto ? 'From weekly plan' : 'Planned'}</span></div>
      <h2>${escapeHTML(todayPlan.name)}</h2>
      <p class="today-detail">${exs.length} exercises${estimated ? ` · about ${Math.max(10, Math.round(estimated / 5) * 5)} min` : ''}</p>
      <p class="today-detail">${escapeHTML(exs.slice(0, 3).map((e) => {
        const found = state.exercises.find((x) => x.id === e.exerciseId);
        return found?.name || 'Exercise';
      }).join(' · '))}${exs.length > 3 ? ' …' : ''}</p>
      <div class="today-actions">
        <button class="btn btn-primary btn-sm" type="button" data-action="start-plan" data-date="${today.date}" data-routine="${escapeHTML(todayPlan.routineId || '')}" data-auto="${todayPlan.auto ? '1' : '0'}" data-plan="${escapeHTML(todayPlan.id)}">${icon('play', 15)} Start workout</button>
        <button class="btn btn-ghost btn-sm" type="button" data-action="goto-calendar" data-date="${today.date}">View day</button>
      </div>`;
  } else if (todayCompleted.length) {
    const latest = todayCompleted[todayCompleted.length - 1];
    const workout = latest.workout;
    const stats = workout ? totalWorkoutStats(workout) : null;
    todayContent = `<div class="today-label"><span class="eyebrow">Today</span><span class="pill sage dot">Completed</span></div>
      <h2>${escapeHTML(latest.name || 'Session complete')}</h2>
      <p class="today-detail">${stats ? `${stats.sets} working sets · ${stats.reps} reps${stats.volume ? ` · ${formatWeight(stats.volume, unitsSystem)}` : ''}` : 'Nice work showing up.'}</p>
      <div class="today-actions">
        <button class="btn btn-soft btn-sm" type="button" data-action="open-workout" data-workout="${workout?.id || ''}">View summary</button>
        <button class="btn btn-ghost btn-sm" type="button" data-action="start-blank" data-date="${today.date}">Log another</button>
      </div>`;
  } else if (today.rest) {
    todayContent = `<div class="today-label"><span class="eyebrow">Today</span><span class="pill dot">Rest day</span></div>
      <h2>Rest is part of the plan.</h2>
      <p class="today-detail">Nothing scheduled today. A walk, a stretch, or simply doing less are all valid ways to train well.</p>
      <div class="today-actions"><button class="btn btn-ghost btn-sm" type="button" data-action="start-blank" data-date="${today.date}">Log something anyway</button><button class="btn btn-ghost btn-sm" type="button" data-action="goto-planner">Edit weekly plan</button></div>`;
  } else if (today.skipped.length) {
    todayContent = `<div class="today-label"><span class="eyebrow">Today</span><span class="pill blush dot">Skipped</span></div>
      <h2>You marked today’s session as skipped.</h2>
      <p class="today-detail">No guilt here. Rest, recover, or log something gentle if it feels right.</p>
      <div class="today-actions"><button class="btn btn-ghost btn-sm" type="button" data-action="start-blank" data-date="${today.date}">Log a workout</button></div>`;
  } else {
    todayContent = `<div class="today-label"><span class="eyebrow">Today</span><span class="pill">Unscheduled</span></div>
      <h2>An open day.</h2>
      <p class="today-detail">Nothing is planned — that doesn’t count as missed. Begin a blank session or assign a routine.</p>
      <div class="today-actions"><button class="btn btn-primary btn-sm" type="button" data-action="start-blank" data-date="${today.date}">${icon('plus', 15)} Start workout</button><button class="btn btn-ghost btn-sm" type="button" data-action="open-plan-dialog" data-date="${today.date}">Plan a session</button></div>`;
  }

  return `<div class="view-inner">
    ${pageHead({
      eyebrow: fmtDate(todayISO(), { weekday: 'long', month: 'long', day: 'numeric' }),
      title: `${greeting()}${profile?.name ? `, ${profile.name}` : ''}`,
      sub: '',
      actions: `<button class="btn btn-ghost btn-sm" type="button" data-action="goto-library">${icon('search', 15)} Browse exercises</button><button class="btn btn-primary btn-sm" type="button" data-action="start-blank" data-date="${todayISO()}">${icon('plus', 15)} Log workout</button>`
    })}
    <section class="hero" aria-label="Overview">
      <div class="hero-copy">
        <span class="eyebrow">A gentle training log</span>
        <h1>${active ? 'Welcome back to your session.' : recent.length === 0 ? 'Small steps build quiet strength.' : 'Steady work, honestly recorded.'}</h1>
        <p class="lede">${escapeHTML(heroSub)}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" data-action="${todayPlan ? 'start-plan' : 'start-blank'}" ${todayPlan ? `data-date="${today.date}" data-routine="${escapeHTML(todayPlan.routineId || '')}" data-auto="${todayPlan.auto ? '1' : '0'}" data-plan="${escapeHTML(todayPlan.id)}"` : `data-date="${todayISO()}"`}>${icon('play', 16)} ${todayPlan ? 'Start planned session' : 'Start a workout'}</button>
          <button class="btn btn-ghost" type="button" data-action="new-routine">${icon('clipboard', 16)} Create routine</button>
          <button class="btn btn-ghost" type="button" data-action="open-measurement">${icon('ruler', 16)} Add measurements</button>
        </div>
      </div>
      <div class="today-card">${todayContent}</div>
    </section>

    <section class="stat-grid" aria-label="Training statistics">
      ${statCard({ label: 'Sessions this week', value: count(week.workoutCount), foot: `Target: ${profile?.weeklyTarget || 3} per week`, iconName: 'calendar', accent: 'sage' })}
      ${statCard({ label: 'Weekly completion', value: week.pct == null ? '—' : count(week.pct, '%'), foot: week.due ? `${week.completed} of ${week.due} planned` : 'No planned sessions due yet', iconName: 'target', accent: 'lav' })}
      ${statCard({ label: 'Week streak', value: count(streaks.current), foot: `Best: ${streaks.longest} ${streaks.longest === 1 ? 'week' : 'weeks'} in a row`, iconName: 'flame', accent: 'peach' })}
      ${statCard({ label: 'Current weight', value: bodyWeight ? `<span data-count-to="${roundTo(kgToDisplay(bodyWeight.weightKg, unitsSystem), 1)}" data-count-decimals="1">0</span> <small>${weightUnit(unitsSystem)}</small>` : '—', foot: bodyWeight ? `Recorded ${fmtDate(bodyWeight.date, { month: 'short', day: 'numeric' })}${targetWeight ? ` · target ${formatWeight(targetWeight, unitsSystem)}` : ''}` : 'Add a weight entry in Progress', iconName: 'scale', accent: 'blush' })}
    </section>

    <div class="grid grid-main-side">
      <section class="stack">
        <div class="card">
          <div class="card-head">
            <div><span class="eyebrow">This week</span><h2 style="margin-top:3px">${fmtDate(week.weekStart, { month: 'long', day: 'numeric' })} – ${fmtDate(week.weekEnd, { month: 'short', day: 'numeric' })}</h2></div>
            <button class="head-link" type="button" data-action="goto-calendar">Open calendar ${icon('chevronRight', 13)}</button>
          </div>
          <div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:10px">
            <p class="small soft">${week.completed} completed ${week.completed === 1 ? 'session' : 'sessions'}${week.skipped ? ` · ${week.skipped} skipped` : ''}${week.due ? ` · ${week.due} planned so far` : ''}</p>
            <span class="pill ${week.pct != null && week.pct >= 80 ? 'sage' : 'lav'}">${week.pct == null ? 'Open week' : `${week.pct}%`}</span>
          </div>
          <div class="progress-track" role="progressbar" aria-label="Weekly completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${week.pct || 0}"><span style="width:${week.pct || 0}%"></span></div>
          <div style="margin-top:16px">${weekDayStrip(week)}</div>
          <div style="margin-top:18px">
            <div class="section-title-row" style="margin:0 0 8px"><h3 class="small soft">Working sets, last 6 weeks</h3><span class="tiny muted">${chartSets.reduce((a, b) => a + b, 0)} total</span></div>
            ${chartSets.some((v) => v > 0)
              ? barChart({ values: chartSets, labels: weeks.map((w) => w.label), height: 150, ariaLabel: 'Working sets over the last six weeks', formatValue: (v) => String(Math.round(v)) })
              : `<div class="empty-state" style="padding:14px"><p>Your weekly sets chart will appear after your first completed workout.</p></div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Recent workouts</h2><button class="head-link" type="button" data-action="goto-workouts">All workouts ${icon('chevronRight', 13)}</button></div>
          ${recent.length
            ? `<div class="list-clean">${recent.map((w) => `<li style="padding:4px 0;border:0">${workoutRow(w)}</li>`).join('')}</div>`
            : emptyState('dumbbell', 'No workouts yet', 'Your history will grow here as you log completed sessions. Start small — one exercise is a valid workout.', `<button class="btn btn-soft btn-sm" type="button" data-action="start-blank" data-date="${todayISO()}">Start your first session</button>`)}
        </div>
      </section>

      <aside class="stack">
        <div class="card tinted-sage">
          <div class="card-head"><h2>Body weight</h2><button class="head-link" type="button" data-action="open-weight-modal">${bodyWeight ? 'Update' : 'Add'}</button></div>
          ${bodyWeight
            ? `<div class="row" style="align-items:baseline;gap:8px">
                <span style="font-size:1.8rem;font-weight:700;letter-spacing:-.03em">${formatWeight(bodyWeight.weightKg, unitsSystem)}</span>
                ${weightDelta != null && Math.abs(weightDelta) > 0.05 ? `<span class="pill ${weightDelta < 0 ? 'sage' : 'peach'}">${weightDelta > 0 ? '+' : ''}${roundTo(kgToDisplay(weightDelta, unitsSystem), 1)} ${weightUnit(unitsSystem)}</span>` : ''}
              </div>
              <p class="tiny muted" style="margin:2px 0 8px">Latest entry · ${fmtDate(bodyWeight.date, { month: 'short', day: 'numeric' })}</p>
              ${weightEntries.length >= 2 ? lineChart({
                values: weightEntries.map((w) => roundTo(kgToDisplay(w.weightKg, unitsSystem), 1)),
                labels: weightEntries.map((w) => fmtDate(w.date, { month: 'short', day: 'numeric' })),
                height: 130, unit: weightUnit(unitsSystem),
                target: targetWeight ? roundTo(kgToDisplay(targetWeight, unitsSystem), 1) : null,
                formatValue: (v) => roundTo(v, 0),
                ariaLabel: 'Body weight trend'
              }) : `<p class="tiny muted">Add another entry to see a trend.</p>`}
              <div class="row" style="gap:6px;margin-top:10px"><button class="btn btn-ghost btn-xs" type="button" data-action="goto-progress">View progress</button>${targetWeight ? `<span class="tiny muted">Target ${formatWeight(targetWeight, unitsSystem)}</span>` : ''}</div>`
            : `<p class="small soft">No weight entries yet. Adding a weight is optional, but helps relative strength estimates.</p>
              <button class="btn btn-soft btn-sm" style="margin-top:12px" type="button" data-action="open-weight-modal">${icon('plus', 15)} Add weight</button>`}
        </div>

        <div class="card">
          <div class="card-head"><h2>Training focus</h2><button class="head-link" type="button" data-action="goto-strength">Strength map ${icon('chevronRight', 13)}</button></div>
          ${focus.length
            ? `<div class="muscle-focus">${focus.map((m) => {
                const max = Math.max(...focus.map((x) => x.totalSets), 1);
                return `<div class="muscle-bar-row">
                  <span>${escapeHTML(m.label)}</span>
                  <span class="bar"><span style="width:${Math.round((m.totalSets / max) * 100)}%"></span></span>
                  <span class="num">${Math.round(m.totalSets)}</span>
                </div>`;
              }).join('')}</div>
              <p class="tiny muted" style="margin-top:10px">By completed working sets, all time. Rest days and skipped sessions do not count.</p>`
            : `<p class="small soft">Once you log working sets, you’ll see which muscles you train most.</p>
              <button class="btn btn-soft btn-sm" style="margin-top:12px" type="button" data-action="start-blank" data-date="${todayISO()}">Log a session</button>`}
        </div>

        <div class="card tinted-lav">
          <div class="card-head"><h2>Recent records</h2><button class="head-link" type="button" data-action="goto-progress" data-progress-tab="charts">All progress</button></div>
          ${prs.length
            ? `<ul class="list-clean">${prs.map((pr) => `<li>
                <span class="pr-medal">${icon('trophy', 14)}</span>
                <span class="grow"><span class="strong small" style="display:block">${escapeHTML(pr.name)}</span><span class="tiny muted">${escapeHTML(pr.label)} · ${fmtDate(pr.date, { month: 'short', day: 'numeric' })}</span></span>
                <span class="small strong nowrap">${escapeHTML(pr.formatted)}</span>
              </li>`).join('')}</ul>`
            : emptyState('trophy', 'Records come from real sets', 'Complete a weighted or timed set and your honest bests will appear here.', '')}
        </div>
      </aside>
    </div>

    <div class="grid grid-2" style="margin-top:20px">
      <div class="card">
        <div class="card-head"><h2>Recent strength improvements</h2></div>
        ${improvements.length
          ? `<ul class="list-clean">${improvements.map((row) => `<li>
              <span class="stat-icon lav" style="margin:0">${icon('arrowUp', 15)}</span>
              <span class="grow"><span class="strong small" style="display:block">${escapeHTML(row.name)}</span><span class="tiny muted">Estimated 1RM compared with the previous 4 weeks</span></span>
              <span class="pill sage">+${roundTo(kgToDisplay(row.delta, unitsSystem), 1)} ${weightUnit(unitsSystem)}</span>
            </li>`).join('')}</ul>`
          : `<p class="small muted">Improvements are only shown when the same exercise has comparable sessions at least four weeks apart. No estimates are invented.</p>`}
      </div>
      <div class="card">
        <div class="card-head"><h2>Your training rhythm</h2></div>
        <div class="summary-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          <div class="summary-cell"><div class="v">${formatNumber(streaks.totalWorkouts)}</div><div class="l">Workouts</div></div>
          <div class="summary-cell"><div class="v">${formatNumber(state.workouts.reduce((n, w) => n + totalWorkoutStats(w).sets, 0))}</div><div class="l">Working sets</div></div>
          <div class="summary-cell"><div class="v">${formatNumber(computeStreaks().longest)}</div><div class="l">Best week streak</div></div>
        </div>
        <p class="tiny muted" style="margin-top:12px">Week streaks count consecutive weeks with at least one completed session. Planned rest days never break them. Today isn’t counted against you before it ends.</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:12px" type="button" data-action="goto-calendar">See the calendar</button>
      </div>
    </div>
  </div>`;
}
