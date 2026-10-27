import { state, prefs } from '../store.js';
import { GOALS, EXPERIENCE_LEVELS, EQUIPMENT_LABELS } from '../data/muscles.js';
import { escapeHTML, fmtDate, splitHeightImperial, cmToDisplay, kgToDisplay, weightUnit, todayISO } from '../utils.js';
import { icon } from '../ui.js';
import { pageHead, units } from './common.js';

export function renderSettings() {
  const profile = state.profile || {};
  const unitSystem = units();
  const height = splitHeightImperial(profile.heightCm);
  const currentWeight = state.weights[0] || null;
  const days = [1, 2, 3, 4, 5, 6, 0];
  const totalPhotos = state.photos.length;

  return `<div class="view-inner">
    ${pageHead({
      eyebrow: 'Make it yours',
      title: 'Settings',
      sub: 'Profile, units, training rhythm, timer defaults and the local data behind everything.',
      actions: `<span class="pill sage dot">Stored on this device</span>`
    })}
    <div class="settings-layout">
      <div>
        <form id="profile-form" novalidate>
          <section class="card settings-section" id="settings-profile">
            <div class="card-head"><div><span class="eyebrow">About you</span><h2 style="margin-top:2px">Profile</h2></div><button class="btn btn-primary btn-xs" type="submit">${icon('check', 13)} Save profile</button></div>
            <div class="field-grid">
              <div class="field">
                <label for="profile-name">Display name</label>
                <input class="input" id="profile-name" name="name" maxlength="40" value="${escapeHTML(profile.name || '')}" placeholder="Whatever you'd like to be called">
              </div>
              <div class="field">
                <label for="profile-dob">Date of birth <span class="muted" style="font-weight:400">(optional)</span></label>
                <input class="input" id="profile-dob" name="dob" type="date" max="${todayISO()}" value="${escapeHTML(profile.dob || '')}">
              </div>
              <div class="field">
                <label>Height</label>
                ${unitSystem === 'imperial'
                  ? `<div class="row tight" style="gap:6px"><div class="input-group" style="flex:1"><input class="input" name="heightFeet" type="number" min="3" max="8" step="1" value="${height.feet}" aria-label="Height feet"><span class="unit">ft</span></div><div class="input-group" style="flex:1"><input class="input" name="heightInches" type="number" min="0" max="11" step="1" value="${height.inches}" aria-label="Height inches"><span class="unit">in</span></div></div>`
                  : `<div class="input-group"><input class="input" name="heightCm" type="number" min="50" max="260" step="0.5" value="${profile.heightCm ? cmToDisplay(profile.heightCm, 'metric') : ''}" placeholder="—"><span class="unit">cm</span></div>`}
                <span class="field-error" data-error-for="height"></span>
              </div>
              <div class="field">
                <label for="profile-target">Target weight <span class="muted" style="font-weight:400">(optional)</span></label>
                <div class="input-group"><input class="input" id="profile-target" name="targetWeight" type="number" min="1" max="${unitSystem === 'imperial' ? 1100 : 500}" step="0.1" value="${profile.targetWeightKg ? kgToDisplay(profile.targetWeightKg, unitSystem) : ''}" placeholder="—"><span class="unit">${weightUnit(unitSystem)}</span></div>
                <span class="field-error" data-error-for="targetWeight"></span>
              </div>
              <div class="field">
                <label for="profile-experience">Training experience</label>
                <select class="select" id="profile-experience" name="experience">
                  ${EXPERIENCE_LEVELS.map((level) => `<option value="${level.id}" ${profile.experience === level.id ? 'selected' : ''}>${escapeHTML(level.label)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>Current weight</label>
                <div class="row between" style="gap:6px;min-height:40px">
                  <span class="small"><strong>${currentWeight ? `${kgToDisplay(currentWeight.weightKg, unitSystem)} ${weightUnit(unitSystem)}` : 'No entries yet'}</strong>${currentWeight ? `<span class="tiny muted"> · ${fmtDate(currentWeight.date, { month: 'short', day: 'numeric' })}</span>` : ''}</span>
                  <button class="link-btn" type="button" data-action="open-weight-modal">Update</button>
                </div>
              </div>
            </div>
            <fieldset style="border:0;padding:0;margin:16px 0 0">
              <legend class="field-label" style="margin-bottom:7px">Fitness goals</legend>
              <div class="check-list">
                ${GOALS.map((goal) => `<label class="check"><input type="checkbox" name="goals" value="${goal.id}" ${(profile.goals || []).includes(goal.id) ? 'checked' : ''}> ${escapeHTML(goal.label)}</label>`).join('')}
              </div>
            </fieldset>
            <fieldset style="border:0;padding:0;margin:14px 0 0">
              <legend class="field-label" style="margin-bottom:7px">Available equipment</legend>
              <div class="check-list">
                ${Object.entries(EQUIPMENT_LABELS).map(([id, label]) => `<label class="check"><input type="checkbox" name="equipment" value="${id}" ${(profile.equipment || []).includes(id) ? 'checked' : ''}> ${escapeHTML(label)}</label>`).join('')}
              </div>
            </fieldset>
          </section>

          <section class="card settings-section" id="settings-training">
            <div class="card-head"><div><span class="eyebrow">Pace</span><h2 style="margin-top:2px">Training rhythm</h2></div><button class="btn btn-primary btn-xs" type="submit">Save profile</button></div>
            <div class="field-grid">
              <div class="field">
                <label for="profile-target-sessions">Weekly workout target</label>
                <div class="input-group"><input class="input" id="profile-target-sessions" name="weeklyTarget" type="number" min="1" max="7" step="1" required value="${profile.weeklyTarget || 3}"><span class="unit">sessions</span></div>
                <span class="field-error" data-error-for="weeklyTarget"></span>
              </div>
              <div class="field">
                <span class="field-label">Preferred workout days</span>
                <div class="weekday-chips">
                  ${days.map((d) => `<label class="weekday-chip ${(profile.trainingDays || []).includes(d) ? 'active' : ''}" style="display:flex;align-items:center;justify-content:center;cursor:pointer">
                    <input type="checkbox" name="trainingDays" value="${d}" ${(profile.trainingDays || []).includes(d) ? 'checked' : ''} style="position:absolute;opacity:0;width:1px;height:1px"> ${['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]}
                  </label>`).join('')}
                </div>
                <span class="hint">A gentle preference. Assign actual routines to days in the Planner.</span>
              </div>
            </div>
            <div class="notice" style="margin-top:14px">${icon('info', 15)}<span>Preferred days are not a schedule until you assign routines in the Planner. Unscheduled days are never marked as missed.</span></div>
          </section>
        </form>

        <section class="card settings-section" id="settings-units">
          <div class="card-head"><div><span class="eyebrow">Measurements</span><h2 style="margin-top:2px">Units</h2></div></div>
          <form id="units-form" class="row" style="gap:10px;align-items:flex-end">
            <div class="field" style="min-width:200px">
              <label for="unit-system">Display units</label>
              <select class="select" id="unit-system" name="unitSystem">
                <option value="metric" ${unitSystem === 'metric' ? 'selected' : ''}>Metric — kg, cm</option>
                <option value="imperial" ${unitSystem === 'imperial' ? 'selected' : ''}>Imperial — lb, ft / in</option>
              </select>
            </div>
            <button class="btn btn-ghost btn-sm" type="submit">Apply units</button>
          </form>
          <p class="tiny muted" style="margin-top:9px">All values are stored in metric internally and converted for display, so switching units never changes your data. A 70 kg entry displays as ${kgToDisplay(70, 'imperial')} lb in imperial mode.</p>
        </section>

        <section class="card settings-section" id="settings-timers">
          <div class="card-head"><div><span class="eyebrow">Comfort</span><h2 style="margin-top:2px">Calendar & rest timer</h2></div></div>
          <div class="field-grid">
            <div class="field">
              <label for="pref-week-start">Week starts on</label>
              <select class="select" id="pref-week-start" data-pref="weekStart">
                <option value="1" ${Number(prefs.get('weekStart')) === 1 ? 'selected' : ''}>Monday</option>
                <option value="0" ${Number(prefs.get('weekStart')) === 0 ? 'selected' : ''}>Sunday</option>
              </select>
            </div>
            <div class="field">
              <label for="pref-rest">Default rest timer</label>
              <div class="input-group"><input class="input" id="pref-rest" type="number" min="15" max="600" step="5" value="${prefs.get('restDefault') || 90}" data-pref="restDefault"><span class="unit">seconds</span></div>
              <span class="field-error" data-error-for="restDefault"></span>
            </div>
          </div>
          <div class="switch-row" style="margin-top:13px">
            <div class="switch-copy"><strong>Auto-start rest after a finished set</strong><small>Useful during a session; you can still pause or reset.</small></div>
            <label class="switch"><input type="checkbox" data-pref="autoRest" aria-label="Auto-start rest timer" ${prefs.get('autoRest') ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div class="switch-row">
            <div class="switch-copy"><strong>Timer sound</strong><small>A soft chime when the timer finishes, when supported.</small></div>
            <label class="switch"><input type="checkbox" data-pref="timerSound" aria-label="Timer sound" ${prefs.get('timerSound') ? 'checked' : ''}><span class="track"></span></label>
          </div>
          <div class="switch-row">
            <div class="switch-copy"><strong>Timer vibration</strong><small>A gentle vibration on supported phones.</small></div>
            <label class="switch"><input type="checkbox" data-pref="timerVibrate" aria-label="Timer vibration" ${prefs.get('timerVibrate') ? 'checked' : ''}><span class="track"></span></label>
          </div>
        </section>

        <section class="card settings-section" id="settings-appearance">
          <div class="card-head"><div><span class="eyebrow">Atmosphere</span><h2 style="margin-top:2px">Appearance</h2></div></div>
          <div class="field" style="max-width:260px">
            <label for="pref-theme">Theme</label>
            <select class="select" id="pref-theme" data-pref="theme">
              <option value="system" ${prefs.get('theme') === 'system' ? 'selected' : ''}>Match my system</option>
              <option value="light" ${prefs.get('theme') === 'light' ? 'selected' : ''}>Warm light</option>
              <option value="dark" ${prefs.get('theme') === 'dark' ? 'selected' : ''}>Soft dark</option>
            </select>
          </div>
          <p class="tiny muted" style="margin-top:9px">Motion follows your device’s reduced-motion setting automatically.</p>
        </section>

        <section class="card settings-section" id="settings-data">
          <div class="card-head"><div><span class="eyebrow">Local-first</span><h2 style="margin-top:2px">Data & storage</h2></div><span class="pill sage dot">IndexedDB</span></div>
          <p class="small soft">Your profile, workouts, routines, plans, weight, measurements and photos are stored in this browser on this device using IndexedDB. Small preferences (theme, timer defaults, calendar start) live in LocalStorage.</p>
          <div class="notice" style="margin-top:12px">${icon('info', 15)}<span><strong>Not encrypted, not synchronised.</strong> Anyone with access to this unlocked browser profile may be able to read this data. Clearing site data, using private browsing, or losing the device can remove it permanently. There is no account or cloud backup.</span></div>
          <div class="row" style="gap:12px;margin-top:14px">
            <span class="pill">${state.workouts.length} workouts</span>
            <span class="pill">${state.weights.length} weights</span>
            <span class="pill">${state.measurements.length} measurements</span>
            <span class="pill">${totalPhotos} photos</span>
            <span class="pill">${state.exercises.filter((e) => e.isCustom).length} custom exercises</span>
          </div>
          <div style="margin-top:14px">
            <div class="row between"><span class="field-label">Approximate browser storage used</span><span class="tiny muted" id="storage-numbers">Calculating…</span></div>
            <div class="storage-meter" aria-hidden="true"><span id="storage-meter-fill" style="width:0%"></span></div>
            <p class="tiny muted" id="storage-note">Storage estimates are supplied by the browser and can be approximate.</p>
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn btn-ghost btn-sm" type="button" data-action="goto-progress-photos">${icon('photo', 14)} Manage photos</button>
          </div>
        </section>

        <section class="card danger-zone settings-section" id="settings-danger">
          <div class="card-head"><div><span class="eyebrow" style="color:var(--danger)">Careful</span><h2 style="margin-top:2px">Clear personal data</h2></div></div>
          <p class="small soft">This removes your profile, workouts, routines, planned sessions, weights, measurements and photos from this browser. It cannot be undone. Built-in exercises and starter routines return; your preferences reset.</p>
          <button class="btn btn-danger-ghost btn-sm" style="margin-top:12px" type="button" data-action="clear-data">${icon('trash', 14)} Clear all personal data</button>
        </section>
      </div>
      <aside class="card" style="position:sticky;top:calc(var(--topbar-h) + 16px)">
        <div class="settings-nav">
          <button type="button" data-action="scroll-settings" data-section="settings-profile">${icon('body', 15)} Profile & goals</button>
          <button type="button" data-action="scroll-settings" data-section="settings-training">${icon('target', 15)} Training rhythm</button>
          <button type="button" data-action="scroll-settings" data-section="settings-units">${icon('scale', 15)} Units</button>
          <button type="button" data-action="scroll-settings" data-section="settings-timers">${icon('timer', 15)} Calendar & timer</button>
          <button type="button" data-action="scroll-settings" data-section="settings-appearance">${icon('sparkle', 15)} Appearance</button>
          <button type="button" data-action="scroll-settings" data-section="settings-data">${icon('info', 15)} Data & privacy</button>
          <button type="button" data-action="scroll-settings" data-section="settings-danger">${icon('warning', 15)} Clear data</button>
        </div>
        <div class="hr"></div>
        <p class="tiny muted">Cozy Strength · a local, account-free training journal.<br /><br />Estimates in this app are training aids. Nothing here is medical advice; stop and seek help if something hurts.</p>
      </aside>
    </div>
  </div>`;
}
