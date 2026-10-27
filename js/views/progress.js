import { state } from '../store.js';
import {
  MEASUREMENT_KEYS, MEASUREMENT_LABELS, muscleStats, weeklySeries, exerciseSessions,
  exerciseProgressSeries, progressMetricFor, exerciseRecords, totalWorkoutStats,
  trackingFlags
} from '../services.js';
import {
  escapeHTML, fmtDate, todayISO, addDays, formatWeight, formatLength, formatHeight,
  kgToDisplay, displayToKg, cmToDisplay, roundTo, weightUnit, lengthUnit, formatNumber,
  formatDuration
} from '../utils.js';
import { icon, emptyState, lineChart, barChart, dateChip } from '../ui.js';
import { pageHead, units, muscleList } from './common.js';
import { MUSCLE_BY_ID } from '../data/muscles.js';

const TABS = [
  { id: 'weight', label: 'Body weight' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'photos', label: 'Photos' },
  { id: 'charts', label: 'Charts' }
];

function rangeStart(days) {
  return days ? addDays(todayISO(), -days) : '0000-01-01';
}

function tabsHTML() {
  const activeTab = state.ui.progress.tab;
  return `<div class="tabs" role="tablist" aria-label="Progress sections">
    ${TABS.map((tab) => `<button class="tab ${activeTab === tab.id ? 'active' : ''}" type="button" role="tab" aria-selected="${activeTab === tab.id}" data-action="progress-tab" data-tab="${tab.id}">${escapeHTML(tab.label)}</button>`).join('')}
  </div>`;
}

// ---------- weight ----------

function weightTab() {
  const ui = state.ui.progress;
  const unitSystem = units();
  const entriesDesc = state.weights;
  const start = rangeStart(ui.range);
  const entriesAsc = [...entriesDesc].filter((e) => e.date >= start).sort((a, b) => a.date.localeCompare(b.date));
  const latest = entriesDesc[0] || null;
  const rangeDelta = entriesAsc.length > 1 ? Number(entriesAsc[entriesAsc.length - 1].weightKg) - Number(entriesAsc[0].weightKg) : null;
  const target = state.profile?.targetWeightKg || null;
  return `<div class="weight-layout">
    <div class="stack">
      <div class="card">
        <div class="card-head">
          <div><span class="eyebrow">Trend</span><h2 style="margin-top:2px">Body weight over time</h2></div>
          <div class="row tight">
            <div class="segmented">${[{ d: 30, l: '30d' }, { d: 90, l: '90d' }, { d: 365, l: '1y' }, { d: 0, l: 'All' }].map((range) => `<button type="button" class="${ui.range === range.d ? 'active' : ''}" data-action="weight-range" data-range="${range.d}">${range.l}</button>`).join('')}</div>
            <button class="btn btn-primary btn-xs" type="button" data-action="open-weight-modal">${icon('plus', 13)} Add</button>
          </div>
        </div>
        <div class="row" style="gap:20px;align-items:baseline;flex-wrap:wrap">
          <div><span class="eyebrow">Latest</span><div style="font-size:1.8rem;font-weight:700;letter-spacing:-.03em">${latest ? formatWeight(latest.weightKg, unitSystem) : '—'}</div><p class="tiny muted">${latest ? fmtDate(latest.date, { month: 'long', day: 'numeric', year: 'numeric' }) : 'No entries yet'}</p></div>
          ${rangeDelta != null ? `<div><span class="eyebrow">Change in range</span><div class="strong" style="margin-top:4px;color:${rangeDelta < 0 ? 'var(--sage-strong)' : 'var(--text)'}">${rangeDelta > 0 ? '+' : ''}${roundTo(kgToDisplay(rangeDelta, unitSystem), 1)} ${weightUnit(unitSystem)}</div><p class="tiny muted">Across ${entriesAsc.length} entries</p></div>` : ''}
          ${target ? `<div><span class="eyebrow">Target</span><div class="strong" style="margin-top:4px">${formatWeight(target, unitSystem)}</div><p class="tiny muted">${latest ? `${roundTo(Math.abs(kgToDisplay(Number(latest.weightKg) - Number(target), unitSystem)), 1)} ${weightUnit(unitSystem)} ${Number(latest.weightKg) > Number(target) ? 'above' : 'below'}` : 'Optional'}</p></div>` : ''}
        </div>
        <div style="margin-top:16px">
          ${entriesAsc.length
            ? lineChart({
                values: entriesAsc.map((e) => roundTo(kgToDisplay(e.weightKg, unitSystem), 1)),
                labels: entriesAsc.map((e) => fmtDate(e.date, { month: 'short', day: 'numeric' })),
                height: 235, unit: weightUnit(unitSystem),
                target: target ? roundTo(kgToDisplay(target, unitSystem), 1) : null,
                formatValue: (v) => roundTo(v, 0),
                ariaLabel: 'Body weight trend with dates'
              })
            : emptyState('scale', 'No weight entries in this range', 'Add a dated weight entry to start an honest trend line. Weight is optional and removable.', `<button class="btn btn-soft btn-sm" type="button" data-action="open-weight-modal">Add weight</button>`)}
        </div>
        <p class="tiny muted" style="margin-top:4px">Each point is a saved entry. No interpolated or made-up measurements are shown.</p>
      </div>
      <div class="card">
        <div class="card-head"><h2>Weight history</h2><span class="tiny muted">${entriesDesc.length} entries</span></div>
        ${entriesDesc.length
          ? `<div class="entries-scroll">${entriesDesc.map((entry) => `<div class="entry-row">
              <span class="date">${fmtDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span class="val">${formatWeight(entry.weightKg, unitSystem)}</span>
              <span class="note">${escapeHTML(entry.note || '')}</span>
              <span class="acts">
                <button class="mini-icon-btn" type="button" data-action="edit-weight" data-entry="${entry.id}" aria-label="Edit weight entry">${icon('edit', 14)}</button>
                <button class="mini-icon-btn" type="button" data-action="delete-weight" data-entry="${entry.id}" aria-label="Delete weight entry">${icon('trash', 14)}</button>
              </span>
            </div>`).join('')}</div>`
          : `<p class="small muted">No entries yet. The first entry becomes your starting point for relative strength estimates.</p>`}
      </div>
    </div>
    <div class="stack">
      <div class="card tinted-sage">
        <div class="card-head"><h2>Add an entry</h2></div>
        <p class="small soft">Track as often or as rarely as feels useful. Weighing daily can be noisy — weekly trends tell a calmer story.</p>
        <button class="btn btn-primary btn-sm btn-block" style="margin-top:12px" type="button" data-action="open-weight-modal">${icon('plus', 15)} Add weight</button>
        <button class="btn btn-ghost btn-sm btn-block" style="margin-top:6px" type="button" data-action="open-profile-edit">Edit profile & target</button>
      </div>
      <div class="card">
        <div class="card-head"><h2>Stored locally</h2></div>
        <p class="small muted">Weight entries live in this browser’s IndexedDB. Nothing is uploaded, synchronised or shared. Clearing browser data removes it.</p>
      </div>
    </div>
  </div>`;
}

// ---------- measurements ----------

function measurementTab() {
  const unitSystem = units();
  const latest = state.measurements[0] || null;
  const previous = state.measurements[1] || null;
  const selectedKey = state.ui.progress.measure || 'waist';
  const series = [...state.measurements]
    .filter((entry) => entry.values && entry.values[selectedKey] != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return `<div class="stack">
    <div class="card">
      <div class="card-head"><div><span class="eyebrow">Optional measurements</span><h2 style="margin-top:2px">Body measurements</h2></div><button class="btn btn-primary btn-xs" type="button" data-action="open-measurement">${icon('plus', 13)} Add entry</button></div>
      ${latest
        ? `<div class="measure-grid">${MEASUREMENT_KEYS.map(({ key, label }) => {
            const value = latest.values?.[key];
            const prev = previous?.values?.[key];
            const delta = value != null && prev != null ? Number(value) - Number(prev) : null;
            return `<div class="measure-item">
              <div class="name">${escapeHTML(label)}</div>
              <div class="v">${value != null ? formatLength(value, unitSystem) : '—'}</div>
              <div class="delta ${delta != null ? (delta < 0 ? 'up' : 'down') : ''}">${delta != null ? `${delta > 0 ? '+' : ''}${roundTo(cmToDisplay(delta, unitSystem), 1)} ${lengthUnit(unitSystem)} vs previous` : value != null ? 'First reading' : 'Not recorded'}</div>
            </div>`;
          }).join('')}</div>
          <p class="tiny muted" style="margin-top:10px">Latest entry: ${fmtDate(latest.date, { month: 'long', day: 'numeric', year: 'numeric' })}. Measurements are optional and only compared when the same site has an earlier value.</p>`
        : emptyState('ruler', 'No measurements yet', 'Measure consistently (same time of day, relaxed posture) and treat the trend as information, not a verdict.', `<button class="btn btn-soft btn-sm" type="button" data-action="open-measurement">Add your first measurements</button>`)}
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head">
          <h2>Trend</h2>
          <select class="select input-sm" style="width:auto" aria-label="Measurement to chart" data-progress-measure>
            ${MEASUREMENT_KEYS.map((m) => `<option value="${m.key}" ${selectedKey === m.key ? 'selected' : ''}>${escapeHTML(m.label)}</option>`).join('')}
          </select>
        </div>
        ${series.length >= 2
          ? lineChart({
              values: series.map((e) => roundTo(cmToDisplay(e.values[selectedKey], unitSystem), 1)),
              labels: series.map((e) => fmtDate(e.date, { month: 'short', day: 'numeric' })),
              height: 210, unit: lengthUnit(unitSystem),
              formatValue: (v) => roundTo(v, 0),
              ariaLabel: `${MEASUREMENT_LABELS[selectedKey]} trend`
            })
          : emptyState('ruler', 'A trend needs two points', `Add at least two dated ${MEASUREMENT_LABELS[selectedKey].toLowerCase()} entries to see a chart.`, '')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Measurement history</h2><span class="tiny muted">${state.measurements.length} entries</span></div>
        ${state.measurements.length
          ? `<div class="entries-scroll">${state.measurements.map((entry) => {
              const vals = Object.entries(entry.values || {}).filter(([, v]) => v != null);
              return `<div class="entry-row">
                <span class="date">${fmtDate(entry.date, { month: 'short', day: 'numeric' })}</span>
                <span class="note">${vals.length ? escapeHTML(vals.slice(0, 3).map(([k, v]) => `${MEASUREMENT_LABELS[k] || k} ${formatLength(v, unitSystem)}`).join(' · ')) + (vals.length > 3 ? ` +${vals.length - 3}` : '') : 'No values'}</span>
                <span class="acts">
                  <button class="mini-icon-btn" type="button" data-action="edit-measurement" data-entry="${entry.id}" aria-label="Edit measurement entry">${icon('edit', 14)}</button>
                  <button class="mini-icon-btn" type="button" data-action="delete-measurement" data-entry="${entry.id}" aria-label="Delete measurement entry">${icon('trash', 14)}</button>
                </span>
              </div>`;
            }).join('')}</div>`
          : `<p class="small muted">No entries yet.</p>`}
      </div>
    </div>
    <div class="notice">${icon('info', 15)}<span>Measurements are personal reference points, not diagnostic data. Bodies change for many reasons; a single number never tells the whole story.</span></div>
  </div>`;
}

// ---------- photos ----------

function photosTab() {
  const photos = state.photos;
  const selected = state.ui.progress.photoA && state.ui.progress.photoB
    ? [state.ui.progress.photoA, state.ui.progress.photoB]
    : [state.ui.progress.photoA, state.ui.progress.photoB].filter(Boolean);
  return `<div class="stack">
    <div class="card">
      <div class="card-head">
        <div><span class="eyebrow">Private gallery</span><h2 style="margin-top:2px">Progress photos</h2></div>
        <div class="row tight">
          ${selected.length === 2 ? `<button class="btn btn-soft btn-xs" type="button" data-action="compare-photos">${icon('compare', 14)} Compare</button>` : ''}
          ${selected.length > 0 ? `<button class="btn btn-ghost btn-xs" type="button" data-action="clear-photo-selection">Clear selection</button>` : ''}
          <label class="btn btn-primary btn-xs" style="cursor:pointer">${icon('camera', 14)} Add photo
            <input type="file" accept="image/*" data-photo-input hidden>
          </label>
        </div>
      </div>
      <p class="small muted" style="margin-bottom:12px">Choose up to two photos to compare. Photos and thumbnails are stored only in this browser’s IndexedDB — they are never uploaded.</p>
      ${photos.length
        ? `<div class="photo-grid">${photos.map((photo) => {
            const isSelected = state.ui.progress.photoA === photo.id || state.ui.progress.photoB === photo.id;
            return `<div class="photo-card ${isSelected ? 'selected' : ''}">
              <button class="photo-select ${isSelected ? 'on' : ''}" type="button" data-action="toggle-photo-select" data-photo="${photo.id}" aria-label="${isSelected ? 'Remove from comparison' : 'Select for comparison'}" aria-pressed="${isSelected}">${icon('check', 12)}</button>
              <button type="button" data-action="open-photo" data-photo="${photo.id}" style="border:0;background:none;padding:0;width:100%;text-align:left">
                <img class="photo-thumb" src="${escapeHTML(photo.thumb)}" alt="${escapeHTML(`${photo.category} progress photo from ${fmtDate(photo.date, { month: 'long', day: 'numeric', year: 'numeric' })}`)}" loading="lazy">
                <span class="photo-meta"><span>${fmtDate(photo.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span><span class="pill">${escapeHTML(photo.category)}</span></span>
              </button>
            </div>`;
          }).join('')}</div>`
        : emptyState('camera', 'No progress photos yet', 'Add a dated photo to compare your own visual history. Choose a category, add a note, and keep everything on this device.', `<label class="btn btn-soft btn-sm" style="cursor:pointer">${icon('camera', 15)} Add your first photo<input type="file" accept="image/*" data-photo-input hidden></label>`)}
    </div>
    <div class="notice">${icon('info', 15)}<span>Photo blobs are saved locally without encryption. Anyone with access to this unlocked browser profile could view them. There is no cloud upload or sync.</span></div>
  </div>`;
}

// ---------- charts ----------

function chartsTab() {
  const unitSystem = units();
  const weekly = weeklySeries(12);
  const setsWeeks = weekly.slice(-8);
  const stats = muscleStats();
  const trained = Object.values(stats).filter((m) => m.enough).sort((a, b) => b.score - a.score);
  const exerciseChoices = state.exercises
    .map((ex) => ({ ex, sessions: exerciseSessions(ex.id).length }))
    .filter((row) => row.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);
  const selectedExerciseId = state.ui.progress.exerciseId && exerciseChoices.some((row) => row.ex.id === state.ui.progress.exerciseId)
    ? state.ui.progress.exerciseId
    : exerciseChoices[0]?.ex.id || '';
  const selectedExercise = state.exercises.find((e) => e.id === selectedExerciseId) || null;
  const metric = progressMetricFor(selectedExercise);
  const series = selectedExercise ? exerciseProgressSeries(selectedExercise.id) : [];
  const chartPoints = series
    .map((row) => ({ ...row, value: metric ? row[metric.key] : null }))
    .filter((row) => row.value != null);
  const displayValue = (value) => metric?.unit === 'kg' ? roundTo(kgToDisplay(value, unitSystem), 1) : value;
  const records = selectedExercise ? exerciseRecords(selectedExercise.id) : null;
  const totalSets = state.workouts.filter((w) => w.status === 'completed').reduce((n, w) => n + totalWorkoutStats(w).sets, 0);

  return `<div class="stack">
    <div class="stat-grid" style="margin-bottom:0">
      <div class="stat-card"><span class="stat-icon">${icon('dumbbell', 16)}</span><span class="label">Workouts</span><span class="value">${state.workouts.filter((w) => w.status === 'completed').length}</span></div>
      <div class="stat-card"><span class="stat-icon lav">${icon('check', 16)}</span><span class="label">Working sets</span><span class="value">${formatNumber(totalSets)}</span></div>
      <div class="stat-card"><span class="stat-icon blue">${icon('body', 16)}</span><span class="label">Muscles with a tier</span><span class="value">${trained.length}</span></div>
      <div class="stat-card"><span class="stat-icon blush">${icon('calendar', 16)}</span><span class="label">Training weeks</span><span class="value">${weekly.filter((w) => w.workouts > 0).length}</span><span class="foot">Of the last 12</span></div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h2>Training frequency</h2><span class="tiny muted">Last 12 weeks</span></div>
        ${weekly.some((w) => w.workouts > 0)
          ? barChart({ values: weekly.map((w) => w.workouts), labels: weekly.map((w) => fmtDate(w.weekStart, { month: 'short', day: 'numeric' })), height: 190, unit: 'workouts', ariaLabel: 'Completed workouts per week', formatValue: (v) => String(Math.round(v)) })
          : `<p class="small muted">Complete your first workout and a real frequency chart will appear.</p>`}
      </div>
      <div class="card">
        <div class="card-head"><h2>Weekly working sets</h2><span class="tiny muted">Last 8 weeks</span></div>
        ${setsWeeks.some((w) => w.sets > 0)
          ? barChart({ values: setsWeeks.map((w) => w.sets), labels: setsWeeks.map((w) => fmtDate(w.weekStart, { month: 'short', day: 'numeric' })), height: 190, unit: 'sets', ariaLabel: 'Working sets per week', formatValue: (v) => String(Math.round(v)) })
          : `<p class="small muted">No completed working sets yet.</p>`}
      </div>
    </div>

    <div class="grid grid-main-side">
      <div class="card">
        <div class="card-head">
          <h2>Exercise progress</h2>
          <select class="select input-sm" style="width:auto;max-width:230px" aria-label="Exercise to chart" data-progress-exercise ${exerciseChoices.length ? '' : 'disabled'}>
            ${exerciseChoices.length ? exerciseChoices.map((row) => `<option value="${row.ex.id}" ${row.ex.id === selectedExerciseId ? 'selected' : ''}>${escapeHTML(row.ex.name)}</option>`).join('') : '<option>No exercise history yet</option>'}
          </select>
        </div>
        ${selectedExercise && chartPoints.length
          ? `<div class="row" style="gap:16px;align-items:baseline;margin-bottom:8px">
              <div><span class="eyebrow">${escapeHTML(metric.label)}</span><div class="strong" style="font-size:1.3rem">${metric.unit === 'kg' ? formatWeight(chartPoints[chartPoints.length - 1].value, unitSystem) : metric.unit === 'sec' ? `${roundTo(chartPoints[chartPoints.length - 1].value, 0)}s` : `${chartPoints[chartPoints.length - 1].value} reps`}</div></div>
              <span class="tiny muted">${chartPoints.length} recorded ${chartPoints.length === 1 ? 'session' : 'sessions'}</span>
            </div>
            ${lineChart({
              values: chartPoints.map((row) => displayValue(row.value)),
              labels: chartPoints.map((row) => fmtDate(row.date, { month: 'short', day: 'numeric' })),
              height: 210,
              unit: metric.unit === 'kg' ? weightUnit(unitSystem) : metric.unit,
              formatValue: (v) => roundTo(v, 0),
              ariaLabel: `${selectedExercise.name}: ${metric.label} over time`
            })}
            <p class="tiny muted">${metric.key === 'e1rm' ? 'Estimated 1RM uses the Epley formula from your best recorded set. It is an estimate, not a tested maximum.' : 'Only recorded working sets are shown.'}</p>`
          : `<div class="empty-state"><span class="empty-icon">${icon('chart')}</span><strong>${selectedExercise ? 'No chartable values yet' : 'No exercise history yet'}</strong><p>${selectedExercise ? 'This exercise needs completed working sets with values for its tracking type.' : 'Log a workout to start exercising progress.'}</p></div>`}
      </div>
      <div class="card tinted-lav">
        <div class="card-head"><h2>Records for this exercise</h2></div>
        ${records && records.sessions ? `<div class="side-stat"><span>Best weight</span><span>${records.bestWeight ? formatWeight(records.bestWeight.value, unitSystem) : '—'}</span></div>
          <div class="side-stat"><span>Most reps</span><span>${records.bestReps ? `${records.bestReps.value}` : '—'}</span></div>
          <div class="side-stat"><span>Estimated 1RM</span><span>${records.bestE1RM ? formatWeight(records.bestE1RM.value, unitSystem) : '—'}</span></div>
          <div class="side-stat"><span>Longest hold</span><span>${records.bestDuration ? `${records.bestDuration.value}s` : '—'}</span></div>
          <div class="side-stat"><span>Sessions</span><span>${records.sessions}</span></div>
          <div class="side-stat"><span>Working sets</span><span>${records.totalSets}</span></div>
          <div class="side-stat"><span>External-load volume</span><span>${records.totalVolume > 0 ? formatWeight(records.totalVolume, unitSystem) : '—'}</span></div>
          <div class="side-stat"><span>Reps</span><span>${records.totalReps}</span></div>`
          : `<p class="small muted">Choose an exercise with completed sets to see honest records.</p>`}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Muscle development</h2><button class="head-link" type="button" data-action="goto-strength">Open strength map ${icon('chevronRight', 12)}</button></div>
      ${trained.length
        ? `<div class="muscle-overview" style="gap:7px">${trained.map((m) => `<button class="muscle-overview-row" style="grid-template-columns:110px 1fr 40px 80px" type="button" data-action="goto-strength-muscle" data-muscle="${m.muscleId}">
            <span>${escapeHTML(m.label)}</span>
            <span class="bar"><span style="width:${m.score}%;--tier-fill:${m.tier?.color || 'var(--sage)'}"></span></span>
            <span class="score-val">${m.score}</span>
            <span class="mini-tier">${escapeHTML(m.tier?.label || '—')}</span>
          </button>`).join('')}</div>`
        : `<p class="small muted">Muscle development bars appear once a region has enough data (3 sessions and 9 effective sets).</p>`}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h2>Weekly external-load volume</h2><span class="tiny muted">Recorded weight × reps</span></div>
        ${weekly.some((w) => w.volume > 0)
          ? barChart({
              values: weekly.map((w) => roundTo(kgToDisplay(w.volume, unitSystem), 0)),
              labels: weekly.map((w) => fmtDate(w.weekStart, { month: 'short', day: 'numeric' })),
              height: 180, unit: weightUnit(unitSystem), ariaLabel: 'Weekly external load volume',
              formatValue: (v) => v >= 1000 ? `${roundTo(v / 1000, 1)}k` : String(Math.round(v))
            })
          : `<p class="small muted">Volume appears when you record weighted working sets. Bodyweight and timed sets are not given a fabricated load.</p>`}
      </div>
      <div class="card">
        <div class="card-head"><h2>Training time</h2><span class="tiny muted">Last 12 weeks</span></div>
        ${weekly.some((w) => w.minutes > 0)
          ? barChart({ values: weekly.map((w) => w.minutes), labels: weekly.map((w) => fmtDate(w.weekStart, { month: 'short', day: 'numeric' })), height: 180, unit: 'minutes', ariaLabel: 'Training minutes per week', formatValue: (v) => String(Math.round(v)) })
          : `<p class="small muted">Session durations are saved when you finish a workout. No time is assumed.</p>`}
      </div>
    </div>
  </div>`;
}

export function renderProgress() {
  const tab = TABS.find((t) => t.id === state.ui.progress.tab) || TABS[0];
  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Measured over time',
      title: 'Progress',
      sub: 'Weight, measurements, photos and charts built from what you actually recorded.',
      actions: tab.id === 'weight' ? `<button class="btn btn-primary btn-sm" type="button" data-action="open-weight-modal">${icon('plus', 15)} Weight</button>`
        : tab.id === 'measurements' ? `<button class="btn btn-primary btn-sm" type="button" data-action="open-measurement">${icon('plus', 15)} Measurement</button>`
          : tab.id === 'photos' ? `<label class="btn btn-primary btn-sm" style="cursor:pointer">${icon('camera', 15)} Add photo<input type="file" accept="image/*" data-photo-input hidden></label>`
            : `<button class="btn btn-ghost btn-sm" type="button" data-action="goto-workouts">${icon('dumbbell', 15)} Workout history</button>`
    })}
    ${tabsHTML()}
    ${state.ui.progress.tab === 'weight' ? weightTab()
      : state.ui.progress.tab === 'measurements' ? measurementTab()
        : state.ui.progress.tab === 'photos' ? photosTab()
          : chartsTab()}
  </div>`;
}

// ---------- form bodies for modals ----------

export function weightFormBody(entry = null) {
  const unitSystem = units();
  return `<form id="weight-form" class="stack" novalidate>
    <input type="hidden" name="id" value="${escapeHTML(entry?.id || '')}">
    <div class="field-grid">
      <div class="field">
        <label for="weight-date">Date</label>
        <input class="input" id="weight-date" name="date" type="date" required max="${todayISO()}" value="${escapeHTML(entry?.date || todayISO())}">
        <span class="field-error" data-error-for="date"></span>
      </div>
      <div class="field">
        <label for="weight-value">Weight</label>
        <div class="input-group"><input class="input" id="weight-value" name="weight" type="number" inputmode="decimal" min="1" max="${unitSystem === 'imperial' ? 1100 : 500}" step="0.1" required value="${entry ? escapeHTML(String(kgToDisplay(entry.weightKg, unitSystem))) : ''}" placeholder="—"><span class="unit">${weightUnit(unitSystem)}</span></div>
        <span class="field-error" data-error-for="weight"></span>
      </div>
    </div>
    <div class="field">
      <label for="weight-note">Note <span class="muted" style="font-weight:400">(optional)</span></label>
      <input class="input" id="weight-note" name="note" maxlength="160" value="${escapeHTML(entry?.note || '')}" placeholder="Morning, after a rest day…">
    </div>
    <div class="notice">${icon('info', 15)}<span>Weight is stored in kilograms internally and displayed in ${unitSystem === 'imperial' ? 'pounds' : 'kilograms'}. Only one entry per date is shown as the current value, but earlier entries stay.</span></div>
  </form>`;
}

export function measurementFormBody(entry = null) {
  const unitSystem = units();
  const values = entry?.values || {};
  return `<form id="measurement-form" class="stack" novalidate>
    <input type="hidden" name="id" value="${escapeHTML(entry?.id || '')}">
    <div class="field">
      <label for="measure-date">Date</label>
      <input class="input" id="measure-date" name="date" type="date" required max="${todayISO()}" value="${escapeHTML(entry?.date || todayISO())}">
      <span class="field-error" data-error-for="date"></span>
    </div>
    <div class="field-label">Measurements <small class="muted" style="font-weight:400">— leave blank for anything you are not measuring</small></div>
    <div class="field-grid three">
      ${MEASUREMENT_KEYS.map(({ key, label }) => `<div class="field">
        <label for="measure-${key}">${escapeHTML(label)}</label>
        <div class="input-group"><input class="input" id="measure-${key}" name="${key}" type="number" inputmode="decimal" min="0" max="${unitSystem === 'imperial' ? 100 : 250}" step="0.1" value="${values[key] != null ? escapeHTML(String(cmToDisplay(values[key], unitSystem))) : ''}" placeholder="—"><span class="unit">${lengthUnit(unitSystem)}</span></div>
      </div>`).join('')}
    </div>
    <span class="field-error" data-error-for="values"></span>
    <div class="notice">${icon('ruler', 15)}<span>Enter as many or as few sites as you like. Values are converted to centimetres for storage.</span></div>
  </form>`;
}

export function photoFormBody(previewThumb, { date = todayISO(), category = 'Front' } = {}) {
  return `<form id="photo-form" class="stack" novalidate>
    <div class="row" style="align-items:flex-start;gap:16px">
      <img src="${escapeHTML(previewThumb)}" alt="Preview of the photo you selected" style="width:130px;border-radius:12px;aspect-ratio:3/4;object-fit:cover;background:var(--surface-3)">
      <div class="stack-sm grow">
        <div class="field">
          <label for="photo-date">Date</label>
          <input class="input" id="photo-date" name="date" type="date" required max="${todayISO()}" value="${escapeHTML(date)}">
          <span class="field-error" data-error-for="date"></span>
        </div>
        <div class="field">
          <label for="photo-category">Category</label>
          <select class="select" id="photo-category" name="category">
            ${['Front', 'Side', 'Back', 'Progress', 'Other'].map((c) => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="field">
      <label for="photo-note">Note <span class="muted" style="font-weight:400">(optional)</span></label>
      <input class="input" id="photo-note" name="note" maxlength="200" placeholder="Lighting, how you feel, anything useful…">
    </div>
    <div class="notice">${icon('info', 15)}<span>The image stays in this browser. A small thumbnail is generated for the gallery and the original file is stored as a local blob.</span></div>
  </form>`;
}

export function photoViewerBody(photo, src) {
  return `<div class="stack">
    <img src="${escapeHTML(src)}" alt="${escapeHTML(`${photo.category} progress photo from ${fmtDate(photo.date, { month: 'long', day: 'numeric', year: 'numeric' })}`)}" style="width:100%;border-radius:12px;max-height:58vh;object-fit:contain;background:var(--surface-3)">
    <div class="row between">
      <div><span class="eyebrow">${fmtDate(photo.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span><p class="small strong" style="margin-top:2px">${escapeHTML(photo.category)}</p></div>
      <span class="pill">${photo.width && photo.height ? `${photo.width} × ${photo.height}` : 'Local image'}</span>
    </div>
    ${photo.note ? `<p class="small soft" style="white-space:pre-wrap">${escapeHTML(photo.note)}</p>` : ''}
    <div class="row between">
      <span class="tiny muted">Stored locally in IndexedDB</span>
      <button class="btn btn-danger-ghost btn-sm" type="button" data-action="delete-photo" data-photo="${escapeHTML(photo.id)}">${icon('trash', 14)} Delete photo</button>
    </div>
  </div>`;
}

export function photoCompareBody(a, b, srcA, srcB) {
  return `<div class="stack">
    <div class="compare-grid">
      <figure><img src="${escapeHTML(srcA)}" alt="${escapeHTML(`Progress photo from ${a.date}`)}"><figcaption>${fmtDate(a.date, { month: 'long', day: 'numeric', year: 'numeric' })} · ${escapeHTML(a.category)}</figcaption></figure>
      <figure><img src="${escapeHTML(srcB)}" alt="${escapeHTML(`Progress photo from ${b.date}`)}"><figcaption>${fmtDate(b.date, { month: 'long', day: 'numeric', year: 'numeric' })} · ${escapeHTML(b.category)}</figcaption></figure>
    </div>
    ${a.note || b.note ? `<div class="row" style="gap:16px;align-items:flex-start">${a.note ? `<div class="grow"><span class="eyebrow">Earlier note</span><p class="small soft">${escapeHTML(a.note)}</p></div>` : ''}${b.note ? `<div class="grow"><span class="eyebrow">Later note</span><p class="small soft">${escapeHTML(b.note)}</p></div>` : ''}</div>` : ''}
    <p class="tiny muted">Photos are for your own perspective. Lighting, posture and the day itself all change how a photo looks.</p>
  </div>`;
}

export function formFooter(submitLabel = 'Save', formId = 'weight-form') {
  return `<button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancel</button><button class="btn btn-primary btn-sm" type="submit" form="${formId}">${escapeHTML(submitLabel)}</button>`;
}
