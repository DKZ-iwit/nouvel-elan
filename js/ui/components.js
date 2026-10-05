// Composants d'interface réutilisables.
import { h, s, clear, parseNum, fmtNum } from '../util.js';

// ---------- Icônes (traits simples, 24×24) ----------
const ICONS = {
  accueil: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  seance: 'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11',
  historique: 'M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4',
  progression: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  swap: 'M7 4l-3 3 3 3M4 7h13M17 20l3-3-3-3M20 17H7',
  timer: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7.5v.5',
  warning: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  bike: 'M5.5 17.5a3.5 3.5 0 1 0 0-.1M18.5 17.5a3.5 3.5 0 1 0 0-.1M5.5 17.5L9 9h5l4.5 8.5M12 17.5L9 9M14 9l-1-3h-2',
  flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4 3 7 7 7z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.3-1.3L17 5l-3-1-1 2h-2l-1-2-3 1 .3 2-1.3 1.3L3 8l-1 3 2 1v2l-2 1 1 3 2-.2 1.3 1.3L6 21l3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
};
export function icon(name, { size = 22, label } = {}) {
  return s('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': label ? null : 'true', role: label ? 'img' : null, 'aria-label': label || null, class: 'ico' },
    s('path', { d: ICONS[name] || ICONS.info }));
}

// Donne un nom accessible aux groupes de boutons à partir du libellé de leur champ.
export function labelGroups(root) {
  for (const f of root.querySelectorAll('.field')) {
    const lab = f.querySelector(':scope > .label, :scope > div > .label');
    if (!lab) continue;
    for (const g of f.querySelectorAll(':scope > [role=group]:not([aria-label])')) g.setAttribute('aria-label', lab.textContent);
  }
}

// ---------- Boutons ----------
export function btn(label, onclick, { kind = 'secondary', iconName, small, type = 'button', disabled, title, ariaLabel, cls = '' } = {}) {
  return h('button', { type, class: `btn btn-${kind}${small ? ' btn-sm' : ''} ${cls}`.trim(), onclick, disabled, title, 'aria-label': ariaLabel || null },
    iconName ? icon(iconName, { size: small ? 18 : 20 }) : null, label ? h('span', { text: label }) : null);
}
export function iconBtn(name, label, onclick, { cls = '' } = {}) {
  return h('button', { type: 'button', class: `icon-btn ${cls}`, onclick, 'aria-label': label, title: label }, icon(name, { size: 20 }));
}

// ---------- Toasts ----------
export function toast(message, { action, actionLabel, timeout = 4000, kind = 'info' } = {}) {
  const host = document.getElementById('toasts');
  const el = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    h('span', { text: message }),
    action ? h('button', { type: 'button', class: 'toast-action', onclick: () => { action(); el.remove(); }, text: actionLabel || 'OK' }) : null);
  host.append(el);
  if (timeout) setTimeout(() => el.remove(), timeout);
  return el;
}

// ---------- Feuilles (dialogues en bas d'écran) ----------
let openSheets = 0;
export function sheet({ title, content, actions = [], onClose, wide = false }) {
  const prevFocus = document.activeElement;
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const titleId = 'sh-' + Math.random().toString(36).slice(2, 8);
  const body = h('div', { class: 'sheet-body' });
  const foot = h('div', { class: 'sheet-foot' });
  const panel = h('div', { class: `sheet${wide ? ' sheet-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'sheet-head' }, h('h2', { id: titleId, text: title }), iconBtn('close', 'Fermer', () => close())),
    body, foot);
  const wrap = h('div', { class: 'sheet-wrap' }, backdrop, panel);
  function render(c) { clear(body); body.append(typeof c === 'function' ? c(api) : c); labelGroups(body); }
  function setActions(acts) { clear(foot); acts.forEach(a => foot.append(a)); foot.hidden = !acts.length; }
  let closed = false;
  function close(result) {
    if (closed) return; closed = true;
    wrap.remove(); openSheets--; document.removeEventListener('keydown', onKey);
    if (!openSheets) document.body.classList.remove('no-scroll');
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    onClose && onClose(result);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  const api = { close, render, setActions, body, panel };
  backdrop.addEventListener('click', () => close());
  document.addEventListener('keydown', onKey);
  render(content);
  setActions(actions);
  document.getElementById('sheets').append(wrap);
  openSheets++; document.body.classList.add('no-scroll');
  requestAnimationFrame(() => { const f = panel.querySelector('input, select, textarea, button:not(.icon-btn)'); (f || panel.querySelector('button'))?.focus(); });
  return api;
}

export function confirmDialog(message, { title = 'Confirmer', confirmLabel = 'Confirmer', danger = false, detail } = {}) {
  return new Promise(resolve => {
    let done = false;
    const sh = sheet({
      title, content: h('div', {}, h('p', { text: message }), detail ? h('p', { class: 'muted', text: detail }) : null),
      onClose: () => { if (!done) resolve(false); },
      actions: [
        btn('Annuler', () => { done = true; sh.close(); resolve(false); }),
        btn(confirmLabel, () => { done = true; sh.close(); resolve(true); }, { kind: danger ? 'danger' : 'primary' }),
      ],
    });
  });
}

// ---------- Champs ----------
let fid = 0;
export function field(label, input, { help, cls = '' } = {}) {
  const id = input.id || ('f' + (++fid));
  input.id = id;
  const helpId = help ? id + '-h' : null;
  if (helpId) input.setAttribute('aria-describedby', helpId);
  return h('div', { class: `field ${cls}` }, h('label', { for: id, text: label }), input, help ? h('p', { class: 'help', id: helpId, text: help }) : null);
}

export function textInput(value, { placeholder, oninput, maxlength = 200, type = 'text', autocomplete = 'off' } = {}) {
  return h('input', { type, value: value ?? '', placeholder, maxlength, autocomplete, oninput: oninput ? (e) => oninput(e.target.value) : null });
}

export function textArea(value, { placeholder, oninput, rows = 3 } = {}) {
  return h('textarea', { rows, placeholder, maxlength: 2000, oninput: oninput ? (e) => oninput(e.target.value) : null }, value ?? '');
}

// Nombre : accepte la virgule française
export function numInput(value, { placeholder, oninput, decimals = 2, cls = '', ariaLabel, min = 0 } = {}) {
  const el = h('input', {
    type: 'text', inputmode: decimals ? 'decimal' : 'numeric', class: `num ${cls}`, autocomplete: 'off',
    value: value === null || value === undefined ? '' : fmtNum(value, decimals).replace(/\u202f|\s/g, ''),
    placeholder: placeholder === null || placeholder === undefined ? '' : String(placeholder),
    'aria-label': ariaLabel || null, enterkeyhint: 'next',
  });
  el.addEventListener('input', () => {
    const v = parseNum(el.value);
    const invalid = el.value.trim() !== '' && (v === null || v < min);
    el.classList.toggle('invalid', invalid);
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    if (!invalid && oninput) oninput(v);
  });
  el.addEventListener('focus', () => el.select());
  return el;
}

export function dateInput(value, { oninput, max } = {}) {
  return h('input', { type: 'date', value: value || '', max, oninput: oninput ? (e) => oninput(e.target.value) : null });
}

export function selectInput(options, value, { oninput, emptyLabel } = {}) {
  const el = h('select', { onchange: (e) => oninput && oninput(e.target.value || null) },
    emptyLabel !== undefined ? h('option', { value: '', text: emptyLabel }) : null,
    ...Object.entries(options).map(([v, l]) => h('option', { value: v, text: l, selected: v === value })));
  return el;
}

// Choix unique en boutons
export function segmented(options, value, onchange, { label, allowNone = false, cls = '' } = {}) {
  const wrap = h('div', { class: `seg ${cls}`, role: 'group', 'aria-label': label || null });
  const entries = Array.isArray(options) ? options : Object.entries(options).map(([v, l]) => ({ value: v, label: l }));
  let cur = value;
  const btns = entries.map(o => {
    const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(o.value === cur), onclick: () => {
      cur = (allowNone && cur === o.value) ? null : o.value;
      btns.forEach((x, i) => x.setAttribute('aria-pressed', String(entries[i].value === cur)));
      onchange(cur);
    } }, o.label);
    if (o.title) b.title = o.title;
    return b;
  });
  wrap.append(...btns);
  return wrap;
}

// Choix multiple en puces
export function chips(options, values, onchange, { label } = {}) {
  const set = new Set(values || []);
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': label || null });
  const entries = Array.isArray(options) ? options : Object.entries(options).map(([v, l]) => ({ value: v, label: l }));
  for (const o of entries) {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(set.has(o.value)), onclick: () => {
      if (set.has(o.value)) set.delete(o.value); else set.add(o.value);
      b.setAttribute('aria-pressed', String(set.has(o.value)));
      onchange([...set]);
    } }, o.label);
    wrap.append(b);
  }
  return wrap;
}

export function emptyState(title, text, action) {
  return h('div', { class: 'empty' }, h('p', { class: 'empty-title', text: title }), text ? h('p', { class: 'muted', text }) : null, action || null);
}

export function section(title, ...children) {
  return h('section', { class: 'block' }, title ? h('h2', { class: 'block-title', text: title }) : null, ...children);
}

export function pageHeader(title, { back, actions = [], sub } = {}) {
  return h('header', { class: 'page-head' },
    back ? h('a', { class: 'icon-btn', href: back, 'aria-label': 'Retour' }, icon('back')) : null,
    h('div', { class: 'page-head-text' }, h('h1', { text: title }), sub ? h('p', { class: 'muted', text: sub }) : null),
    h('div', { class: 'page-head-actions' }, ...actions));
}

export function note(text, kind = 'info') {
  return h('div', { class: `note note-${kind}` }, icon(kind === 'warning' ? 'warning' : 'info', { size: 18 }), h('p', { text }));
}

export function kv(label, value) {
  return h('div', { class: 'kv' }, h('span', { class: 'kv-l', text: label }), h('span', { class: 'kv-v', text: value }));
}

export function download(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function avatar(p, size = 40) {
  return h('span', { class: 'avatar', style: { background: p.color, width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.5) + 'px' }, 'aria-hidden': 'true' }, p.avatar || (p.name || '?').slice(0, 1).toUpperCase());
}
