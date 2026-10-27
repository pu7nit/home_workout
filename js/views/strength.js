import { state } from '../store.js';
import {
  muscleStats, strengthBenchmark, exerciseRecords, trackingFlags, trackingLabel,
  detectionNote
} from '../services.js';
import { MUSCLES, MUSCLE_BY_ID, SCORING, TIERS } from '../data/muscles.js';
import { escapeHTML, fmtDate, formatWeight, formatDuration, roundTo, todayISO } from '../utils.js';
import { icon, renderAnatomy, renderMuscleOverview, muscleChips, tierBadge, barChart, emptyState } from '../ui.js';
import { pageHead, units } from './common.js';

function breakdownRow(label, value, max, hint) {
  const pct = Math.round((value / max) * 100);
  return `<div class="score-row" title="${escapeHTML(hint)}">
    <span>${escapeHTML(label)}</span>
    <span class="track"><span style="width:${pct}%"></span></span>
    <span class="val">${roundTo(value, 1)}/${max}</span>
  </div>`;
}

function prRows(stat, unitSystem) {
  const rows = [];
  for (const item of stat.prs || []) {
    const rec = item.records;
    let label = null;
    let date = null;
    if (rec.bestE1RM) { label = `Est. 1RM ${formatWeight(rec.bestE1RM.value, unitSystem)}`; date = rec.bestE1RM.date; }
    else if (rec.bestDuration) { label = `Longest hold ${rec.bestDuration.value}s`; date = rec.bestDuration.date; }
    else if (rec.bestReps) { label = `Best set ${rec.bestReps.value} reps`; date = rec.bestReps.date; }
    if (label) rows.push({ name: item.name, label, date, records: rec });
  }
  return rows.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
}

function benchmarkRows(stat, unitSystem) {
  return (stat.topExercises || []).slice(0, 3).map((item) => {
    const exercise = state.exercises.find((e) => e.id === item.id);
    if (!exercise) return null;
    const bench = strengthBenchmark(item.id);
    if (!bench) return null;
    return `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border);gap:8px">
      <div style="min-width:0"><span class="small strong" style="display:block">${escapeHTML(exercise.name)}</span><span class="tiny muted">${escapeHTML(bench.patternLabel)} · est. 1RM ${formatWeight(bench.e1rm.value, unitSystem)}</span></div>
      <span class="pill" style="background:color-mix(in srgb, ${bench.tier.color} 16%, var(--surface));border-color:color-mix(in srgb, ${bench.tier.color} 38%, var(--border))">${escapeHTML(bench.label)}</span>
    </div>`;
  }).filter(Boolean).join('');
}

function muscleDetail(stat, unitSystem) {
  const muscle = MUSCLE_BY_ID[stat.muscleId];
  if (!stat) return '';
  const insufficient = !stat.enough;
  const prs = prRows(stat, unitSystem);
  const benchmarks = benchmarkRows(stat, unitSystem);
  const recoveryDot = stat.recovery.status === 'ready' ? 'done' : stat.recovery.status === 'recovering' || stat.recovery.status === 'recent' ? 'progress' : 'rest';
  return `<div class="muscle-detail">
    <div class="muscle-detail-head">
      <div>
        <span class="eyebrow">${escapeHTML(muscle.group)} · ${escapeHTML(muscle.views.includes('front') && muscle.views.includes('back') ? 'Front & back' : muscle.views[0] === 'front' ? 'Front view' : 'Back view')}</span>
        <h2>${escapeHTML(muscle.label)}</h2>
        <p class="sub">Your training development estimate, built only from completed working sets.</p>
      </div>
      <div class="stack-sm" style="align-items:flex-end">
        ${tierBadge(stat.tier)}
        <span class="tiny muted">${insufficient ? 'Not enough data yet' : `${stat.score} / 100 development`}</span>
      </div>
    </div>

    ${insufficient
      ? `<div class="notice" style="margin-bottom:4px">${icon('info', 15)}<span><strong>Not enough data yet.</strong> Log ${Math.max(0, SCORING.sufficient.sessions - stat.sessions)} more ${SCORING.sufficient.sessions - stat.sessions === 1 ? 'session' : 'sessions'} and ${Math.max(0, Math.ceil(SCORING.sufficient.effectiveSets - stat.totalSets))} more effective sets to unlock a tier. So far: ${stat.sessions} sessions, ${roundTo(stat.totalSets, 1)} effective sets.</span></div>`
      : `<div class="row between" style="align-items:flex-end;margin-bottom:4px">
          <div class="score-display"><span class="score-num">${stat.score}</span><span class="score-of">/ 100</span></div>
          <div class="row tight">${tierBadge(stat.tier)}</div>
        </div>`}

    <div class="score-breakdown" aria-label="Development score breakdown">
      ${breakdownRow('Volume', stat.breakdown.volume, SCORING.weights.volume, 'Completed effective sets and reps over the last 8 weeks.')}
      ${breakdownRow('Consistency', stat.breakdown.consistency, SCORING.weights.consistency, 'Distinct training weeks for this muscle across the last 12 weeks.')}
      ${breakdownRow('Frequency', stat.breakdown.frequency, SCORING.weights.frequency, 'Sessions in the last 28 days. Recent training earns more than a single old session.')}
      ${breakdownRow('Progression', stat.breakdown.progression, SCORING.weights.progression, 'Recent effective sets compared with the preceding weeks. Sustained work is rewarded; a single spike is smoothed.')}
      ${breakdownRow('Meaningful load', stat.breakdown.load, SCORING.weights.load, 'Average external load relative to body weight for loaded working sets.')}
    </div>

    <div class="detail-stats">
      <div class="detail-stat"><div class="k">Last trained</div><div class="v">${stat.lastDate ? fmtDate(stat.lastDate, { month: 'short', day: 'numeric' }) : 'Never recorded'}</div></div>
      <div class="detail-stat"><div class="k">Sessions</div><div class="v">${stat.sessions}</div></div>
      <div class="detail-stat"><div class="k">Effective working sets</div><div class="v">${roundTo(stat.totalSets, 1)} <span class="tiny muted">(primary ${stat.primarySets}, secondary ${stat.secondarySets})</span></div></div>
      <div class="detail-stat"><div class="k">External-load volume</div><div class="v">${stat.volume > 0 ? formatWeight(stat.volume, unitSystem) : 'Not load-based'}</div></div>
      <div class="detail-stat"><div class="k">Sets · last 28 days</div><div class="v">${stat.sets28 != null ? roundTo(stat.sets28, 1) : '—'}</div></div>
      <div class="detail-stat"><div class="k">Frequency · last 28 days</div><div class="v">${stat.sessions28 != null ? `${stat.sessions28} session${stat.sessions28 === 1 ? '' : 's'}` : '—'}</div></div>
    </div>

    <div class="recovery-note">
      <span class="badge-dot ${recoveryDot}"></span>
      <div><strong>${escapeHTML(stat.recovery.label)}</strong><br /><span>${escapeHTML(stat.recovery.note)}</span><br /><span class="tiny muted">Recovery is an estimate from time since training and recent working sets — not a physiological measurement or medical advice.</span></div>
    </div>

    <div class="detail-section-title">Training history <span class="tiny muted" style="text-transform:none;letter-spacing:0">Last 12 weeks of sets</span></div>
    ${stat.history.some((h) => h.sets > 0)
      ? barChart({
          values: stat.history.map((h) => h.sets),
          labels: stat.history.map((h) => fmtDate(h.weekStart, { month: 'short', day: 'numeric' })),
          height: 145, ariaLabel: `${muscle.label} effective sets per week`,
          formatValue: (v) => String(Math.round(v))
        })
      : `<p class="small muted">No weekly training history yet for this muscle.</p>`}

    <div class="detail-section-title">Primary vs secondary contribution</div>
    <p class="small soft">Primary sets count fully; secondary muscles count at ${SCORING.secondaryFactor}× so compound movements contribute honestly without overstating every muscle they touch.</p>

    <div class="detail-section-title">Related exercises</div>
    ${(stat.topExercises || []).length
      ? `<div class="related-ex">${stat.topExercises.slice(0, 5).map((ex) => `<button type="button" data-action="open-exercise" data-exercise="${escapeHTML(ex.id)}">${escapeHTML(ex.name)} <span class="tiny muted">${roundTo(ex.sets, 0)}</span></button>`).join('')}</div>`
      : `<p class="small muted">Complete an exercise that targets this muscle and it will appear here.</p>`}

    <div class="detail-section-title">Relevant personal records</div>
    ${prs.length
      ? `<div class="pr-list">${prs.map((pr) => `<div class="pr-row"><span class="pr-medal">${icon('trophy', 13)}</span><span class="pr-main"><span class="pr-name">${escapeHTML(pr.name)}</span><span class="pr-meta">${escapeHTML(pr.label)} · ${fmtDate(pr.date, { month: 'short', day: 'numeric' })}</span></span></div>`).join('')}</div>`
      : `<p class="small muted">No comparable records for this muscle yet.</p>`}

    ${benchmarks ? `<div class="detail-section-title">Strength benchmark estimates</div><div>${benchmarks}</div><p class="tiny muted" style="margin-top:5px">Heuristic bands based on estimated 1RM as a multiple of body weight. These are motivational reference bands created for this app, not validated population standards.</p>` : ''}

    <div class="detail-section-title">Choose a muscle</div>
    ${muscleChips(stat.muscleId)}
  </div>`;
}

export function renderStrength() {
  const stats = muscleStats();
  const selected = state.ui.strength.muscle || 'chest';
  const stat = stats[selected] || stats.chest;
  const unitSystem = units();
  const trainedCount = Object.values(stats).filter((s) => s.sessions > 0).length;
  const noData = Object.values(stats).every((s) => s.sessions === 0);

  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Strength profile',
      title: 'Your body map',
      sub: 'Select a muscle to see how your completed training is developing it. Six colours, six tiers, no fabricated scores.',
      actions: `<button class="btn btn-ghost btn-sm" type="button" data-action="goto-workouts">${icon('dumbbell', 15)} Training log</button><button class="btn btn-primary btn-sm" type="button" data-action="start-blank" data-date="${todayISO()}">${icon('plus', 15)} Log workout</button>`
    })}
    <div class="strength-layout">
      <div class="card anatomy-card">
        <div class="anatomy-toolbar">
          <div><span class="eyebrow">Anatomy</span><h2 style="margin-top:2px">Front & back</h2></div>
          <span class="pill ${trainedCount ? 'sage' : ''}">${trainedCount} / ${MUSCLES.length} muscles trained</span>
        </div>
        ${renderAnatomy(stats, selected)}
        <p class="scoring-note">Tap or focus a region to inspect it. Regions without enough training stay neutral and say “Not enough data yet.”</p>
        ${noData ? `<div class="notice" style="margin-top:10px">${icon('info', 15)}<span>Your map unlocks as you complete working sets. One good session is enough to begin; tiers appear after three sessions and nine effective sets.</span></div>` : ''}
      </div>
      ${muscleDetail(stat, unitSystem)}
    </div>

    <div class="grid grid-main-side" style="margin-top:20px">
      <div class="card">
        <div class="card-head"><h2>All muscle regions</h2><span class="tiny muted">Score · tier</span></div>
        ${renderMuscleOverview(stats, selected)}
      </div>
      <div class="card tinted-sage">
        <div class="card-head"><h2>How the map works</h2></div>
        <p class="small soft">Development combines effective working sets and reps, training consistency, recent frequency, progression and meaningful external load. Primary sets count fully; secondary muscles count at ${SCORING.secondaryFactor}×.</p>
        <div class="tier-legend" style="margin-top:12px">
          ${TIERS.map((tier) => `<div class="tier-legend-item"><span class="sw" style="--tier-fill:${tier.color}"></span>${escapeHTML(tier.label)} · ${tier.min}+</div>`).join('')}
        </div>
        <p class="tiny muted" style="margin-top:12px">${escapeHTML(detectionNote())}</p>
        <p class="tiny muted" style="margin-top:8px">Tier thresholds are app-defined for motivation and are not scientifically validated population standards.</p>
      </div>
    </div>
  </div>`;
}
