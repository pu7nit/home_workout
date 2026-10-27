// Reusable UI pieces: icons, dialogs, notifications, charts and the SVG body map.
import { escapeHTML, roundTo, fmtDate, formatTimer } from './utils.js';
import { MUSCLES, MUSCLE_BY_ID, TIERS } from './data/muscles.js';

// ---------------- icons ----------------

const ICONS = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5.5h5V20"/>',
  dumbbell: '<path d="M6.5 8.5v7M3.5 10.5v3M17.5 8.5v7M20.5 10.5v3M6.5 12h11"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21"/><path d="M4 5.5v15.1M8 7h8M8 10.5h5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17"/>',
  body: '<circle cx="12" cy="4.5" r="2.2"/><path d="M12 6.7v6.8M12 9.5 6.8 12M12 9.5l5.2 2.5M12 13.5 8.5 21M12 13.5l3.5 7.5"/>',
  chart: '<path d="M3.5 20.5h17"/><path d="M6 17V9.5M11 17V5M16 17v-6"/><path d="M20.5 4.5h-3"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3h6v1.5M8.5 9.5h7M8.5 13h7M8.5 16.5h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  play: '<path d="M7 4.5 20 12 7 19.5Z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v5h5"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v4l2.5 1.5M9 2.5h6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.9.85-4.3 4.15 1.05 5.85L12 16.95 6.75 19.75l1.05-5.85-4.3-4.15 5.9-.85Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.4"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 9.5a4.8 4.8 0 0 1 7 0M12 8v4"/>',
  ruler: '<path d="m4 15 11-11 5 5L9 20Z"/><path d="m8 11 2 2M11 8l2 2M14 5l2 2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8 20h8M9 17h6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flame: '<path d="M12 21c4 0 6.5-2.7 6.5-6.2 0-4.5-4-6.3-3.5-10.8-2.2.8-3.8 2.8-3.8 5 0 1.2-.6 1.8-1.3 1.8-1 0-1.7-1.1-1.7-2.5C6.4 10 5.5 12.4 5.5 15c0 3.4 2.5 6 6.5 6Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10.5V16M12 7.5v.2"/>',
  warning: '<path d="M12 3.5 21 20H3Z"/><path d="M12 9v5M12 17v.2"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  logo: '<rect width="24" height="24" rx="7" fill="currentColor" opacity=".15"/><path d="M7 12h10M9 9v6M15 9v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  photo: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4.5 16.5v3h15v-3"/>',
  compare: '<rect x="3.5" y="5" width="7" height="14" rx="1.5"/><rect x="13.5" y="5" width="7" height="14" rx="1.5"/><path d="M12 3v18"/>',
  sparkle: '<path d="M12 3.5c.8 4.3 2.7 6.2 7 7-4.3.8-6.2 2.7-7 7-.8-4.3-2.7-6.2-7-7 4.3-.8 6.2-2.7 7-7Z"/><path d="M18.5 16.5c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5Z"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3.5C19.5 15.6 12 20 12 20Z"/>'
};

export function icon(name, size = 18, extraClass = '') {
  const body = ICONS[name] || ICONS.info;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${extraClass}">${body}</svg>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.iconSize) || 18);
  });
}

// ---------------- notifications ----------------

export function toast(message, type = 'success', duration = 3400) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.setAttribute('role', 'status');
  const dot = document.createElement('span');
  dot.className = 'toast-dot';
  const text = document.createElement('span');
  text.textContent = String(message);
  node.append(dot, text);
  root.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 300);
  }, duration);
}

// ---------------- dialogs ----------------

let activeModal = null;
let lastFocused = null;
let modalCloser = null;
let modalUrls = [];

function trapFocus(event) {
  if (event.key !== 'Tab' || !activeModal) return;
  const focusables = Array.from(activeModal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

document.addEventListener('keydown', (event) => {
  if (!activeModal) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
  }
  trapFocus(event);
});

export function openModal({
  title = '', subtitle = '', body = '', footer = '', size = '',
  className = '', onClose = null, labelledBy = 'modal-title'
}) {
  closeModal(true);
  lastFocused = document.activeElement;
  modalUrls = [];
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.dataset.modalBackdrop = 'true';
  backdrop.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${labelledBy}">
      <div class="modal-head">
        <div class="modal-title-wrap">
          <h2 id="${labelledBy}">${escapeHTML(title)}</h2>
          ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ''}
        </div>
        <button class="icon-btn plain modal-close" type="button" data-modal-close aria-label="Close dialog">${icon('close')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  if (className) backdrop.querySelector('.modal').classList.add(className);
  root.appendChild(backdrop);
  activeModal = backdrop;
  modalCloser = onClose || null;
  document.body.style.overflow = 'hidden';

  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) closeModal();
  });
  backdrop.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });
  const dialog = backdrop.querySelector('.modal');
  const focusTarget = dialog.querySelector('[autofocus], input:not([type="hidden"]), select, textarea, button');
  requestAnimationFrame(() => {
    (focusTarget || dialog).focus?.();
  });
  return dialog;
}

export function closeModal(immediate = false) {
  const root = document.getElementById('modal-root');
  if (!root || !activeModal) return;
  const closer = modalCloser;
  modalCloser = null;
  modalUrls.forEach((url) => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } });
  modalUrls = [];
  root.innerHTML = '';
  activeModal = null;
  document.body.style.overflow = '';
  if (!immediate && lastFocused && typeof lastFocused.focus === 'function') {
    try { lastFocused.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  if (closer) {
    try { closer(); } catch { /* ignore */ }
  }
}

export function trackModalUrl(url) {
  if (url) modalUrls.push(url);
  return url;
}

export function confirmDialog({
  title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Keep it',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const dialog = openModal({
      title,
      size: 'narrow',
      body: `<p class="small soft" style="line-height:1.65">${escapeHTML(message)}</p>`,
      footer: `
        <button class="btn btn-ghost btn-sm" type="button" data-confirm-cancel>${escapeHTML(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" type="button" data-confirm-ok>${escapeHTML(confirmLabel)}</button>`,
      onClose: () => finish(false)
    });
    dialog.querySelector('[data-confirm-ok]').addEventListener('click', () => {
      finish(true);
      closeModal();
    });
    dialog.querySelector('[data-confirm-cancel]').addEventListener('click', () => {
      finish(false);
      closeModal();
    });
  });
}

// ---------------- charts ----------------

let chartId = 0;

function niceRange(values, target = null) {
  const all = target == null ? values : values.concat(target);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const pad = span * 0.12;
  return { min: min - pad, max: max + pad };
}

export function lineChart({
  values = [], labels = [], unit = '', height = 210, target = null,
  formatValue = (v) => roundTo(v, 1), ariaLabel = 'Progress chart', showDots = true, colorClass = ''
}) {
  const seq = ++chartId;
  const W = 600;
  const H = Math.max(150, height);
  const pad = { l: 42, r: 14, t: 14, b: 28 };
  if (!values.length) return '';
  const clean = values.map((v) => (Number.isFinite(Number(v)) ? Number(v) : null));
  const finite = clean.filter((v) => v != null);
  const { min, max } = niceRange(finite.length ? finite : [0], target);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const xFor = (i) => pad.l + (clean.length <= 1 ? plotW / 2 : (i / (clean.length - 1)) * plotW);
  const yFor = (v) => pad.t + (1 - (v - min) / (max - min)) * plotH;

  const gridLines = [];
  for (let i = 0; i <= 3; i += 1) {
    const val = min + ((max - min) * i) / 3;
    const y = yFor(val);
    gridLines.push(`<line class="grid-line" x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}"/>`);
    gridLines.push(`<text class="axis-text" x="${pad.l - 7}" y="${(y + 3).toFixed(1)}" text-anchor="end">${escapeHTML(formatValue(val))}</text>`);
  }

  const points = clean.map((v, i) => (v == null ? null : [xFor(i), yFor(v)])).filter(Boolean);
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = points.length > 1
    ? `${pathD} L${points[points.length - 1][0].toFixed(1)},${pad.t + plotH} L${points[0][0].toFixed(1)},${pad.t + plotH} Z`
    : '';
  const dots = showDots
    ? points.map(([x, y], i) => `<circle class="chart-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${points.length > 30 ? 1.6 : 3}"><title>${escapeHTML(labels[i] || '')}: ${escapeHTML(formatValue(clean[i]))}${escapeHTML(unit ? ` ${unit}` : '')}</title></circle>`).join('')
    : '';
  const targetLine = target != null
    ? `<line class="target-line" x1="${pad.l}" y1="${yFor(target).toFixed(1)}" x2="${W - pad.r}" y2="${yFor(target).toFixed(1)}"/>
       <text class="target-label" x="${W - pad.r}" y="${(yFor(target) - 4).toFixed(1)}" text-anchor="end">target ${escapeHTML(formatValue(target))}</text>`
    : '';

  const labelEvery = Math.max(1, Math.ceil(clean.length / 5));
  const xLabels = labels.map((label, i) => {
    if (i % labelEvery !== 0 && i !== labels.length - 1) return '';
    return `<text class="axis-text" x="${xFor(i).toFixed(1)}" y="${H - 7}" text-anchor="middle">${escapeHTML(label)}</text>`;
  }).join('');

  return `<div class="chart-wrap">
    <svg class="chart-svg ${colorClass}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(ariaLabel)}">
      <title>${escapeHTML(ariaLabel)}</title>
      <desc>${escapeHTML(`${values.length} recorded points. ${unit ? `Values in ${unit}.` : ''}`)}</desc>
      <defs><linearGradient id="sageFade${seq}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8fae86" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#8fae86" stop-opacity="0.01"/>
      </linearGradient></defs>
      ${gridLines.join('')}
      ${areaD ? `<path d="${areaD}" fill="url(#sageFade${seq})"/>` : ''}
      ${points.length > 1 ? `<path class="chart-line" d="${pathD}"/>` : ''}
      ${dots}
      ${points.length === 1 ? `<circle class="chart-dot" cx="${points[0][0]}" cy="${points[0][1]}" r="4"/>` : ''}
      ${targetLine}
      ${xLabels}
    </svg>
  </div>`;
}

export function barChart({
  values = [], labels = [], height = 190, unit = '', ariaLabel = 'Bar chart', target = null,
  formatValue = (v) => String(roundTo(v, 0)), highlightLast = true
}) {
  const W = 600;
  const H = Math.max(140, height);
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  if (!values.length) return '';
  const maxVal = Math.max(...values.map((v) => Number(v) || 0), target || 0, 1);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const barW = Math.min(34, (plotW / values.length) * 0.55);
  const gap = plotW / values.length;
  const grid = [];
  for (let i = 0; i <= 3; i += 1) {
    const val = (maxVal * i) / 3;
    const y = pad.t + (1 - i / 3) * plotH;
    grid.push(`<line class="grid-line" x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}"/>`);
    grid.push(`<text class="axis-text" x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${escapeHTML(formatValue(val))}</text>`);
  }
  const bars = values.map((v, i) => {
    const val = Math.max(0, Number(v) || 0);
    const h = (val / maxVal) * plotH;
    const x = pad.l + gap * i + (gap - barW) / 2;
    const y = pad.t + plotH - h;
    return `<rect class="chart-bar ${val === 0 ? 'empty' : ''} ${highlightLast && i === values.length - 1 ? 'current' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, val === 0 ? 2 : 0).toFixed(1)}" rx="3"><title>${escapeHTML(labels[i] || '')}: ${escapeHTML(formatValue(val))}${escapeHTML(unit ? ` ${unit}` : '')}</title></rect>`;
  }).join('');
  const every = Math.max(1, Math.ceil(values.length / 7));
  const xLabels = labels.map((label, i) => {
    if (i % every !== 0 && i !== labels.length - 1) return '';
    return `<text class="axis-text" x="${(pad.l + gap * i + gap / 2).toFixed(1)}" y="${H - 7}" text-anchor="middle">${escapeHTML(label)}</text>`;
  }).join('');
  const targetLine = target != null && target > 0
    ? `<line class="target-line" x1="${pad.l}" y1="${(pad.t + (1 - target / maxVal) * plotH).toFixed(1)}" x2="${W - pad.r}" y2="${(pad.t + (1 - target / maxVal) * plotH).toFixed(1)}"/>`
    : '';
  return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(ariaLabel)}">
    <title>${escapeHTML(ariaLabel)}</title>
    ${grid.join('')}
    ${targetLine}
    ${bars}
    ${xLabels}
  </svg></div>`;
}

// ---------------- anatomy ----------------

const FRONT_PATHS = {
  traps: 'M101 73 Q120 82 139 73 L135 91 Q120 97 105 91 Z',
  chest: 'M86 114 Q103 108 117 120 L117 153 Q104 156 92 145 Q84 132 86 114 Z M154 114 Q137 108 123 120 L123 153 Q136 156 148 145 Q156 132 154 114 Z',
  frontDelts: 'M85 94 Q98 94 100 108 Q100 122 88 123 Q78 120 80 107 Z M155 94 Q142 94 140 108 Q140 122 152 123 Q162 120 160 107 Z',
  sideDelts: 'M68 96 Q80 94 82 106 Q84 120 73 123 Q61 120 62 106 Z M172 96 Q160 94 158 106 Q156 120 167 123 Q179 120 178 106 Z',
  biceps: 'M66 132 Q78 132 78 151 L76 166 Q73 177 64 176 Q56 174 58 160 L60 143 Z M174 132 Q162 132 162 151 L164 166 Q167 177 176 176 Q184 174 182 160 L180 143 Z',
  forearms: 'M55 181 L48 225 Q47 243 56 246 Q63 247 65 232 L71 184 Z M185 181 L192 225 Q193 243 184 246 Q177 247 175 232 L169 184 Z',
  abs: 'M103 156 Q120 162 137 156 L135 219 Q120 228 105 219 Z',
  obliques: 'M94 157 Q99 164 100 193 L96 226 L89 219 Q87 194 90 174 Z M146 157 Q141 164 140 193 L144 226 L151 219 Q153 194 150 174 Z',
  quads: 'M94 283 L114 283 L116 356 Q110 372 99 371 Q90 355 91 318 Z M146 283 L126 283 L124 356 Q130 372 141 371 Q150 355 149 318 Z',
  adductors: 'M113 284 L119 284 L117 338 Q113 350 109 348 L109 310 Z M127 284 L121 284 L123 338 Q127 350 131 348 L131 310 Z',
  calves: 'M91 389 L107 389 L105 431 Q104 446 97 446 Q89 444 89 428 Z M149 389 L133 389 L135 431 Q136 446 143 446 Q151 444 151 428 Z'
};

const BACK_PATHS = {
  traps: 'M120 82 L142 89 Q153 99 147 117 L133 145 L120 158 L107 145 L93 117 Q87 99 98 89 Z',
  rearDelts: 'M75 96 Q88 94 92 106 Q94 121 82 126 Q70 124 68 111 Z M165 96 Q152 94 148 106 Q146 121 158 126 Q170 124 172 111 Z',
  sideDelts: 'M63 101 Q72 100 74 111 Q76 123 67 127 Q58 122 58 111 Z M177 101 Q168 100 166 111 Q164 123 173 127 Q182 122 182 111 Z',
  upperBack: 'M105 112 Q120 106 135 112 L139 141 Q120 151 101 141 Z',
  lats: 'M94 136 Q108 143 105 165 L100 196 L86 183 Q81 158 86 139 Z M146 136 Q132 143 135 165 L140 196 L154 183 Q159 158 154 139 Z',
  lowerBack: 'M105 191 Q120 186 135 191 L137 226 Q120 235 103 226 Z',
  triceps: 'M66 132 Q78 134 77 152 L72 176 Q69 185 61 181 Q55 178 58 162 L61 144 Z M174 132 Q162 134 163 152 L168 176 Q171 185 179 181 Q185 178 182 162 L179 144 Z',
  forearms: 'M55 181 L48 225 Q47 243 56 246 Q63 247 65 232 L71 184 Z M185 181 L192 225 Q193 243 184 246 Q177 247 175 232 L169 184 Z',
  glutes: 'M94 253 Q120 246 146 253 L145 287 Q134 299 122 290 Q120 278 118 290 Q106 299 95 287 Z',
  hamstrings: 'M94 294 L114 294 L111 361 Q108 377 98 375 Q88 362 89 326 Z M146 294 L126 294 L129 361 Q132 377 142 375 Q152 362 151 326 Z',
  calves: 'M90 388 L106 388 L104 433 Q103 448 96 448 Q88 446 89 429 Z M150 388 L134 388 L136 433 Q137 448 144 448 Q152 446 151 429 Z',
  abductors: 'M91 262 Q98 256 100 270 L97 292 Q92 300 87 292 Q84 278 87 266 Z M149 262 Q142 256 140 270 L143 292 Q148 300 153 292 Q156 278 153 266 Z'
};

const baseBody = `
  <g pointer-events="none" aria-hidden="true">
    <circle class="body-base" cx="120" cy="42" r="22"/>
    <path class="body-base" d="M109 61h22v19h-22z"/>
    <path class="body-base" d="M86 80 Q120 71 154 80 L163 113 Q167 154 147 188 L144 230 L96 230 L93 188 Q73 154 77 113 Z"/>
    <path class="body-base" d="M95 227 Q120 234 145 227 L150 270 Q120 287 90 270 Z"/>
    <path class="body-base" d="M80 86 Q61 90 59 113 L53 165 Q52 180 64 182 Q74 183 77 169 L83 114 Z"/>
    <path class="body-base" d="M160 86 Q179 90 181 113 L187 165 Q188 180 176 182 Q166 183 163 169 L157 114 Z"/>
    <path class="body-base" d="M55 178 L46 235 Q44 252 55 254 Q65 256 68 240 L74 180 Z"/>
    <path class="body-base" d="M185 178 L194 235 Q196 252 185 254 Q175 256 172 240 L166 180 Z"/>
    <path class="body-base" d="M94 278 L86 365 Q84 388 97 389 Q109 390 112 371 L117 283 Z"/>
    <path class="body-base" d="M146 278 L154 365 Q156 388 143 389 Q131 390 128 371 L123 283 Z"/>
    <path class="body-base" d="M86 386 L82 432 Q81 452 94 453 Q104 453 106 436 L111 387 Z"/>
    <path class="body-base" d="M154 386 L158 432 Q159 452 146 453 Q136 453 134 436 L129 387 Z"/>
    <ellipse class="body-base" cx="97" cy="459" rx="13" ry="6"/>
    <ellipse class="body-base" cx="143" cy="459" rx="13" ry="6"/>
  </g>`;

const FRONT_DECOR = `
  <g pointer-events="none" aria-hidden="true" stroke="rgba(51,54,50,.2)" stroke-width="0.9" fill="none">
    <path d="M120 163v48M104 172h32M104 188h32M104 204h32"/>
    <path d="M97 116 Q106 137 102 149M143 116 Q134 137 138 149"/>
  </g>`;

function regionPath(kind, muscleId, stats, selected, view) {
  const s = stats[MUSCLE_BY_ID[muscleId]?.id || muscleId];
  const tierId = s?.tier?.id || null;
  const aria = s
    ? `${MUSCLE_BY_ID[muscleId].label}, ${s.tier ? `${s.tier.label}, score ${s.score}` : 'not enough data yet'}`
    : MUSCLE_BY_ID[muscleId].label;
  return `<path class="muscle ${selected === muscleId ? 'selected' : ''} ${tierId ? '' : 'nodata'}" 
    data-muscle="${muscleId}" data-view="${view}" data-tier="${tierId || ''}" tabindex="0" role="button"
    aria-label="${escapeHTML(aria)}" aria-pressed="${selected === muscleId ? 'true' : 'false'}"
    d="${kind}"><title>${escapeHTML(aria)}</title></path>`;
}

export function renderAnatomy(stats, selected, side = 'front') {
  const front = Object.entries(FRONT_PATHS)
    .map(([id, d]) => regionPath(d, id, stats, selected, 'front')).join('');
  const back = Object.entries(BACK_PATHS)
    .map(([id, d]) => regionPath(d, id, stats, selected, 'back')).join('');
  return `
    <div class="anatomy-views" data-anatomy>
      <div class="anatomy-view">
        <svg class="anatomy-figure" viewBox="0 0 240 480" role="group" aria-label="Front anatomy muscle map. Use Tab to move between muscles and Enter to select.">
          ${baseBody}${FRONT_DECOR}${front}
          <text class="body-label" x="120" y="478" text-anchor="middle">FRONT</text>
        </svg>
        <div class="anatomy-view-label">Front</div>
      </div>
      <div class="anatomy-view">
        <svg class="anatomy-figure" viewBox="0 0 240 480" role="group" aria-label="Back anatomy muscle map. Use Tab to move between muscles and Enter to select.">
          ${baseBody}${back}
          <text class="body-label" x="120" y="478" text-anchor="middle">BACK</text>
        </svg>
        <div class="anatomy-view-label">Back</div>
      </div>
    </div>
    <div class="tier-legend" aria-label="Strength tiers">
      ${TIERS.map((tier) => `
        <span class="tier-legend-item ${stats && selected && stats[selected]?.tier?.id === tier.id ? 'active' : ''}">
          <span class="sw" style="--tier-fill:${tier.color}"></span>${tier.label}
        </span>`).join('')}
      <span class="tier-legend-item"><span class="sw" style="--tier-fill:var(--muscle-empty)"></span>No data yet</span>
    </div>`;
}

export function tierBadge(tier, fallback = 'Not enough data yet') {
  if (!tier) return `<span class="pill">${escapeHTML(fallback)}</span>`;
  return `<span class="tier-badge" style="--tier-fill:${tier.color}">${escapeHTML(tier.label)}</span>`;
}

export function muscleName(id) {
  return MUSCLE_BY_ID[id]?.label || id;
}

export function renderMuscleOverview(stats, selected) {
  return `<div class="muscle-overview">
    ${MUSCLES.map((muscle) => {
      const s = stats[muscle.id];
      const pct = s?.score ?? 0;
      return `<button class="muscle-overview-row ${selected === muscle.id ? 'selected' : ''}" type="button" data-action="select-muscle" data-muscle="${muscle.id}" aria-label="${escapeHTML(`${muscle.label}, ${s?.tier ? `${s.tier.label}, score ${s.score}` : 'not enough data'}`)}">
        <span>${escapeHTML(muscle.label)}</span>
        <span class="bar"><span style="width:${pct}%;--tier-fill:${s?.tier?.color || 'var(--muscle-empty)'}"></span></span>
        <span class="score-val">${s?.enough ? s.score : '—'}</span>
        <span class="mini-tier">${s?.enough ? escapeHTML(s.tier.label) : 'No data'}</span>
      </button>`;
    }).join('')}
  </div>`;
}

export function muscleChips(selected) {
  return `<div class="muscle-chips" role="group" aria-label="Select a muscle">
    ${MUSCLES.map((m) => `<button type="button" class="chip ${selected === m.id ? 'active' : ''}" data-action="select-muscle" data-muscle="${m.id}">${escapeHTML(m.label)}</button>`).join('')}
  </div>`;
}

// ---------------- photos ----------------

export function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPEG, PNG, or WebP).'));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('That image is larger than 15 MB. Please choose a smaller file.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxW = 420;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumb = canvas.toDataURL('image/jpeg', 0.72);
        URL.revokeObjectURL(url);
        resolve({ thumb, width: img.width, height: img.height, mime: file.type });
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read. Try a different file.'));
    };
    img.src = url;
  });
}

// ---------------- misc components ----------------

export function emptyState(iconName, title, text, action = '') {
  return `<div class="empty-state">
    <span class="empty-icon">${icon(iconName)}</span>
    <strong>${escapeHTML(title)}</strong>
    <p>${escapeHTML(text)}</p>
    ${action}
  </div>`;
}

export function statCard({ label, value, foot = '', iconName = 'chart', accent = '' }) {
  return `<div class="stat-card">
    <span class="stat-icon ${accent}">${icon(iconName, 16)}</span>
    <span class="label">${escapeHTML(label)}</span>
    <span class="value">${value}</span>
    ${foot ? `<span class="foot">${foot}</span>` : ''}
  </div>`;
}

export function timerWidgetHTML(timer) {
  if (!timer || !timer.active) return '';
  return `<span class="timer-time">${formatTimer(timer.remaining)}</span>
    <span class="tiny" style="opacity:.7">${timer.running ? 'resting' : 'paused'}</span>
    <button type="button" data-timer="${timer.running ? 'pause' : 'start'}" aria-label="${timer.running ? 'Pause rest timer' : 'Resume rest timer'}">${icon(timer.running ? 'pause' : 'play', 14)}</button>
    <button type="button" data-timer="add" aria-label="Add 15 seconds">${icon('plus', 14)}</button>
    <button type="button" data-timer="reset" aria-label="Reset rest timer">${icon('reset', 14)}</button>
    <button type="button" data-timer="close" aria-label="Close rest timer">${icon('close', 14)}</button>`;
}

export function dateChip(date) {
  return fmtDate(date, { month: 'short', day: 'numeric' });
}
