import { GOALS, EXPERIENCE_LEVELS, EQUIPMENT_LABELS } from '../data/muscles.js';
import { escapeHTML, splitHeightImperial, kgToDisplay, weightUnit } from '../utils.js';
import { icon } from '../ui.js';

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = { 0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S' };

export function onboardingBody(draft) {
  const unitSystem = draft.unitSystem === 'imperial' ? 'imperial' : 'metric';
  const height = splitHeightImperial(draft.heightCm);
  return `<div class="onboarding-progress" aria-hidden="true"><span class="on"></span><span class="on"></span><span></span></div>
  <p class="small soft" style="margin-bottom:16px">A few gentle details make your logs more useful. Everything is optional except the units you prefer, and you can change it all later.</p>
  <form id="onboarding-form" class="stack" novalidate data-units="${unitSystem}">
    <div class="field-grid">
      <div class="field">
        <label for="onb-name">What should we call you?</label>
        <input class="input" id="onb-name" name="name" maxlength="40" value="${escapeHTML(draft.name || '')}" placeholder="Optional">
      </div>
      <div class="field">
        <label for="onb-units">Preferred units</label>
        <select class="select" id="onb-units" name="units" data-onboarding-units>
          <option value="metric" ${unitSystem === 'metric' ? 'selected' : ''}>Metric (kg, cm)</option>
          <option value="imperial" ${unitSystem === 'imperial' ? 'selected' : ''}>Imperial (lb, ft/in)</option>
        </select>
      </div>
      <div class="field">
        <label>Height</label>
        ${unitSystem === 'imperial'
          ? `<div class="row tight" style="gap:6px"><div class="input-group" style="flex:1"><input class="input" name="heightFeet" type="number" min="3" max="8" step="1" value="${height.feet}" aria-label="Height feet"><span class="unit">ft</span></div><div class="input-group" style="flex:1"><input class="input" name="heightInches" type="number" min="0" max="11" step="1" value="${height.inches}" aria-label="Height inches"><span class="unit">in</span></div></div>`
          : `<div class="input-group"><input class="input" name="heightCm" type="number" min="50" max="260" step="0.5" value="${draft.heightCm ?? ''}" placeholder="Optional"><span class="unit">cm</span></div>`}
        <span class="field-error" data-error-for="height"></span>
      </div>
      <div class="field">
        <label for="onb-weight">Current weight</label>
        <div class="input-group"><input class="input" id="onb-weight" name="weight" type="number" min="1" max="${unitSystem === 'imperial' ? 1100 : 500}" step="0.1" value="${draft.weightKg != null ? kgToDisplay(draft.weightKg, unitSystem) : ''}" placeholder="Optional"><span class="unit">${weightUnit(unitSystem)}</span></div>
        <span class="field-error" data-error-for="weight"></span>
      </div>
      <div class="field">
        <label for="onb-target">Target weight <span class="muted" style="font-weight:400">(optional)</span></label>
        <div class="input-group"><input class="input" id="onb-target" name="targetWeight" type="number" min="1" max="${unitSystem === 'imperial' ? 1100 : 500}" step="0.1" value="${draft.targetWeightKg ? kgToDisplay(draft.targetWeightKg, unitSystem) : ''}" placeholder="—"><span class="unit">${weightUnit(unitSystem)}</span></div>
      </div>
      <div class="field">
        <label for="onb-experience">Training experience</label>
        <select class="select" id="onb-experience" name="experience">
          ${EXPERIENCE_LEVELS.map((level) => `<option value="${level.id}" ${draft.experience === level.id ? 'selected' : ''}>${escapeHTML(level.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="onb-weekly">Sessions per week</label>
        <div class="input-group"><input class="input" id="onb-weekly" name="weeklyTarget" type="number" min="1" max="7" step="1" value="${draft.weeklyTarget || 3}"><span class="unit">sessions</span></div>
        <span class="field-error" data-error-for="weeklyTarget"></span>
      </div>
      <div class="field">
        <label for="onb-dob">Birth year <span class="muted" style="font-weight:400">(optional)</span></label>
        <input class="input" id="onb-dob" name="dob" type="date" max="${new Date().toISOString().slice(0, 10)}" value="${escapeHTML(draft.dob || '')}">
        <span class="field-error" data-error-for="dob"></span>
      </div>
    </div>
    <fieldset style="border:0;padding:0;margin:0">
      <legend class="field-label" style="margin-bottom:7px">What are you here for?</legend>
      <div class="check-list">
        ${GOALS.map((goal) => `<label class="check"><input type="checkbox" name="goals" value="${goal.id}" ${(draft.goals || []).includes(goal.id) ? 'checked' : ''}> ${escapeHTML(goal.label)}</label>`).join('')}
      </div>
    </fieldset>
    <fieldset style="border:0;padding:0;margin:0">
      <legend class="field-label" style="margin-bottom:7px">What do you have at home?</legend>
      <div class="check-list">
        ${Object.entries(EQUIPMENT_LABELS).map(([id, label]) => `<label class="check"><input type="checkbox" name="equipment" value="${id}" ${(draft.equipment || []).includes(id) ? 'checked' : ''}> ${escapeHTML(label)}</label>`).join('')}
      </div>
    </fieldset>
    <fieldset style="border:0;padding:0;margin:0">
      <legend class="field-label" style="margin-bottom:7px">Days that usually feel good</legend>
      <div class="weekday-chips">
        ${DAYS.map((d) => `<label class="weekday-chip ${(draft.trainingDays || []).includes(d) ? 'active' : ''}" style="display:flex;align-items:center;justify-content:center;cursor:pointer" aria-label="Toggle ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}">
          <input type="checkbox" name="trainingDays" value="${d}" ${(draft.trainingDays || []).includes(d) ? 'checked' : ''} style="position:absolute;opacity:0;width:1px;height:1px"> ${DAY_LABELS[d]}
        </label>`).join('')}
      </div>
      <span class="hint">These are preferences to remember, not a strict schedule. Assign routines in the Planner whenever you like.</span>
    </fieldset>
    <div class="notice" style="margin-top:4px">${icon('info', 15)}<span>Your data is stored only in this browser on this device. There is no account, cloud sync or upload. Clearing browser data can remove it permanently.</span></div>
  </form>`;
}

export function onboardingFooter() {
  return `<button class="btn btn-ghost btn-sm" type="button" data-action="skip-onboarding">Set up later</button>
    <button class="btn btn-primary btn-sm" type="submit" form="onboarding-form">${icon('check', 15)} Save &amp; begin</button>`;
}
