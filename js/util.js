// Utilitaires partagés. Aucune donnée utilisateur n'est injectée en HTML :
// h() crée des éléments et place le texte via textContent.

export function uid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') setStyle(el, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Élément SVG
export function s(tag, attrs, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') setStyle(el, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  appendChildren(el, children);
  return el;
}

// Styles via CSSOM (compatible avec la politique de sécurité du contenu)
function setStyle(el, obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
  }
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

// ---------- Nombres ----------
// Accepte « 42,5 », « 42.5 », espaces. Retourne null si vide ou invalide.
export function parseNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n, maxDec = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: maxDec });
}

export function fmtKg(n) { return n === null || n === undefined ? '—' : `${fmtNum(n, 2)} kg`; }

export function roundTo(n, step) { return Math.round(n / step) * step; }

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// ---------- Dates (format AAAA-MM-JJ, heure locale) ----------
export function isoDate(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayISO() { return isoDate(new Date()); }
export function parseISO(str) {
  if (!str) return null;
  const [y, m, d] = str.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoDate(d); }
export function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
export function weekStart(iso) {
  const d = parseISO(iso);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - dow);
  return isoDate(d);
}
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export function fmtDate(iso, opts = {}) {
  if (!iso) return '—';
  const d = parseISO(iso);
  const base = `${d.getDate()} ${MOIS[d.getMonth()]}`;
  const withYear = opts.year || d.getFullYear() !== new Date().getFullYear();
  return (opts.weekday ? JOURS[d.getDay()] + ' ' : '') + base + (withYear ? ' ' + d.getFullYear() : '');
}
export function fmtShort(iso) { const d = parseISO(iso); return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`; }
export function relDay(iso) {
  const n = daysBetween(iso, todayISO());
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'hier';
  if (n > 1 && n < 7) return `il y a ${n} jours`;
  return fmtDate(iso);
}
export function fmtDuration(min) {
  if (min === null || min === undefined) return '—';
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
export function fmtClock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function debounce(fn, ms = 300) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); return fn(...a); };
  return d;
}

export function byDateDesc(a, b) {
  return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
}

export function nowISO() { return new Date().toISOString(); }

export function plural(n, one, many) { return `${fmtNum(n, 1)} ${Math.abs(n) >= 2 ? many : one}`; }

export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
