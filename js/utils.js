// Small shared helpers. Dates are stored as local ISO strings (YYYY-MM-DD)
// so a workout never drifts to another day because of timezone offsets.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function uid(prefix = '') {
  const raw = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}-${raw}` : raw;
}

export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
export function sum(arr, fn = (x) => x) { return arr.reduce((acc, x) => acc + (Number(fn(x)) || 0), 0); }
export function avg(arr, fn = (x) => x) { return arr.length ? sum(arr, fn) / arr.length : 0; }
export function roundTo(n, digits = 1) {
  if (!Number.isFinite(Number(n))) return 0;
  const f = 10 ** digits;
  return Math.round(Number(n) * f) / f;
}

export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function toISO(date) {
  if (typeof date === 'string') return date.slice(0, 10);
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(iso) {
  if (!iso) return new Date(NaN);
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function isValidISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
  const d = parseISO(iso);
  return !Number.isNaN(d.getTime()) && toISO(d) === iso;
}

export function todayISO() { return toISO(new Date()); }

export function addDays(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function diffDays(aISO, bISO) {
  return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000);
}

export function startOfWeekISO(iso = todayISO(), weekStart = 1) {
  const d = parseISO(iso);
  const day = d.getDay();
  const shift = (day - weekStart + 7) % 7;
  d.setDate(d.getDate() - shift);
  return toISO(d);
}

export function endOfWeekISO(iso = todayISO(), weekStart = 1) {
  return addDays(startOfWeekISO(iso, weekStart), 6);
}

export function monthGrid(anchorISO, weekStart = 1) {
  const anchor = parseISO(anchorISO);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const gridStart = startOfWeekISO(toISO(first), weekStart);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const iso = addDays(gridStart, i);
    const d = parseISO(iso);
    cells.push({ iso, day: d.getDate(), inMonth: d.getMonth() === anchor.getMonth(), isToday: iso === todayISO() });
  }
  return cells;
}

export function fmtDate(iso, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, options).format(d);
}

export function fmtMonthYear(iso) {
  return fmtDate(iso, { month: 'long', year: 'numeric' });
}

export function fmtDateTime(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(ts));
}

export function weekdayName(weekday, style = 'long') {
  const d = new Date(2024, 0, 7 + weekday, 12);
  return new Intl.DateTimeFormat(undefined, { weekday: style }).format(d);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Quiet hours';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ---------- units ----------
const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export function weightUnit(units) { return units === 'imperial' ? 'lb' : 'kg'; }
export function lengthUnit(units) { return units === 'imperial' ? 'in' : 'cm'; }

export function kgToDisplay(kg, units) {
  if (kg == null || kg === '') return '';
  return units === 'imperial' ? roundTo(Number(kg) * LB_PER_KG, 1) : roundTo(Number(kg), 1);
}
export function displayToKg(value, units) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return units === 'imperial' ? n / LB_PER_KG : n;
}
export function cmToDisplay(cm, units) {
  if (cm == null || cm === '') return '';
  return units === 'imperial' ? roundTo(Number(cm) / CM_PER_IN, 1) : roundTo(Number(cm), 1);
}
export function displayToCm(value, units) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return units === 'imperial' ? n * CM_PER_IN : n;
}
export function formatWeight(kg, units, digits = 1) {
  if (kg == null || !Number.isFinite(Number(kg))) return '—';
  const val = Number(kgToDisplay(kg, units));
  return `${val.toFixed(val % 1 === 0 ? 0 : digits)} ${weightUnit(units)}`;
}
export function formatLength(cm, units) {
  if (cm == null || !Number.isFinite(Number(cm))) return '—';
  const val = Number(cmToDisplay(cm, units));
  return `${val.toFixed(val % 1 === 0 ? 0 : 1)} ${lengthUnit(units)}`;
}
export function formatHeight(cm, units) {
  if (cm == null || !Number.isFinite(Number(cm))) return '—';
  if (units === 'imperial') {
    const totalIn = Number(cm) / CM_PER_IN;
    const ft = Math.floor(totalIn / 12);
    const inches = Math.round(totalIn % 12);
    return `${ft}′ ${inches}″`;
  }
  return `${Math.round(Number(cm))} cm`;
}
export function formatVolume(kg, units) {
  if (!Number.isFinite(Number(kg)) || Number(kg) <= 0) return '—';
  const val = kgToDisplay(kg, units);
  if (val >= 10000) return `${roundTo(val / 1000, 1)}k ${weightUnit(units)}`;
  return `${roundTo(val, 0)} ${weightUnit(units)}`;
}

export function formatNumber(n, digits = 0) {
  if (!Number.isFinite(Number(n))) return '0';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Number(n));
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTimer(seconds) {
  const s = Math.max(0, Math.ceil(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function splitHeightImperial(cm) {
  if (!cm) return { feet: '', inches: '' };
  const totalIn = Number(cm) / CM_PER_IN;
  let feet = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - feet * 12);
  if (inches === 12) { feet += 1; inches = 0; }
  return { feet: String(feet), inches: String(inches) };
}

export function debounce(fn, wait = 300) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

export function unique(arr) { return Array.from(new Set(arr)); }

export function numberOrNull(value, { min = null, max = null } = {}) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

export function clampText(value, max = 500) {
  return String(value ?? '').slice(0, max);
}

