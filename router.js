// Routeur par fragment (#/chemin). Les vues s'enregistrent dans app.js.
const routes = [];
let renderFn = null;

export function route(pattern, handler, opts = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, handler, opts });
}

export function parseHash() {
  const raw = location.hash.slice(1) || '/accueil';
  const [path, query] = raw.split('?');
  return { path, params: new URLSearchParams(query || '') };
}

export function match(path) {
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) return { ...r, args: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function setRenderer(fn) { renderFn = fn; }
export function rerender() { if (renderFn) renderFn({ keepScroll: true }); }
export function go(hash) { if (location.hash === hash) rerender(); else location.hash = hash; }
