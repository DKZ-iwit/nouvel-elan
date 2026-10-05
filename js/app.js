import { h, clear } from './util.js';
import { APP } from './config.js';
import { S, init, onChange } from './state.js';
import { route, parseHash, match, setRenderer } from './router.js';
import { icon, toast, labelGroups } from './ui/components.js';
import { applyTheme, registerSW } from './platform.js';
import { renderHome } from './views/home.js';
import { renderSessionHub, renderPrepare, renderEditSession, renderTemplates } from './views/session.js';
import { renderHistory, renderSessionDetail } from './views/history.js';
import { renderProgress } from './views/progress.js';
import { renderWelcome, renderProfileForm, renderProfile } from './views/profiles.js';
import { renderAttention } from './views/attention.js';
import { renderProgram } from './views/program.js';
import { renderActivity } from './views/activity.js';
import { renderMeasures } from './views/measures.js';
import { renderSettings } from './views/settings.js';
import { renderExercises, renderCustomExerciseForm } from './views/exercises.js';

const TABS = [
  { id: 'accueil', label: 'Accueil', icon: 'accueil', href: '#/accueil' },
  { id: 'seance', label: 'Séance', icon: 'seance', href: '#/seance' },
  { id: 'historique', label: 'Historique', icon: 'historique', href: '#/historique' },
  { id: 'progression', label: 'Progression', icon: 'progression', href: '#/progression' },
  { id: 'profil', label: 'Profil', icon: 'profil', href: '#/profil' },
];

route('/bienvenue', (r) => renderWelcome(r), { public: true, tab: null });
route('/profil/nouveau', (r) => renderProfileForm(r, 'nouveau'), { public: true, tab: 'profil' });
route('/accueil', (r) => renderHome(r), { tab: 'accueil', fab: true });
route('/seance', (r) => renderSessionHub(r), { tab: 'seance' });
route('/seance/preparer', (r) => renderPrepare(r), { tab: 'seance' });
route('/seance/edition/:id', (r, a) => renderEditSession(r, a.id), { tab: 'historique' });
route('/historique', (r) => renderHistory(r), { tab: 'historique', fab: true });
route('/historique/s/:id', (r, a) => renderSessionDetail(r, a.id), { tab: 'historique' });
route('/progression', (r) => renderProgress(r), { tab: 'progression', fab: true });
route('/profil', (r) => renderProfile(r), { tab: 'profil' });
route('/profil/edition', (r) => renderProfileForm(r, 'edition'), { tab: 'profil' });
route('/attention', (r, a, p) => renderAttention(r, p), { tab: 'profil' });
route('/programme', (r) => renderProgram(r), { tab: 'profil' });
route('/activite/:id', (r, a) => renderActivity(r, a.id), { tab: 'accueil' });
route('/mesures', (r) => renderMeasures(r), { tab: 'profil' });
route('/reglages', (r) => renderSettings(r), { tab: 'profil' });
route('/exercices', (r) => renderExercises(r), { tab: 'profil' });
route('/exercices/:id', (r, a) => renderCustomExerciseForm(r, a.id), { tab: 'profil' });
route('/modeles', (r) => renderTemplates(r), { tab: 'profil' });

const view = () => document.getElementById('view');
let lastPath = null;

function renderNav(activeTab) {
  const nav = document.getElementById('nav');
  clear(nav);
  if (!S.profile) { nav.hidden = true; return; }
  nav.hidden = false;
  nav.append(h('ul', {}, ...TABS.map(t => h('li', {}, h('a', { href: t.href, class: 'tab', 'aria-current': t.id === activeTab ? 'page' : null },
    icon(t.icon), h('span', { text: t.label }))))));
}

function render({ keepScroll = false } = {}) {
  const { path, params } = parseHash();
  let m = match(path);
  if (!S.profile && (!m || !m.opts.public)) { location.replace('#/bienvenue'); return; }
  if (S.profile && path === '/bienvenue') { location.replace('#/accueil'); return; }
  if (!m) { location.replace('#/accueil'); return; }
  const root = view();
  const y = window.scrollY;
  clear(root);
  try {
    m.handler(root, m.args, params);
  } catch (e) {
    console.error(e);
    root.append(h('div', { class: 'note note-warning' }, h('p', { text: 'Cet écran n’a pas pu s’afficher : ' + (e.message || e) })));
  }
  labelGroups(root);
  renderNav(m.opts.tab);
  const fab = document.getElementById('fab');
  fab.hidden = !(S.profile && m.opts.fab);
  if (keepScroll && path === lastPath) window.scrollTo(0, y);
  else {
    window.scrollTo(0, 0);
    const h1 = root.querySelector('h1');
    if (h1 && lastPath !== null) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  lastPath = path;
}

setRenderer(render);

async function boot() {
  const root = view();
  try {
    await init();
  } catch (e) {
    applyTheme();
    root.append(h('div', { class: 'welcome' }, h('h1', { text: APP.name }),
      h('div', { class: 'note note-warning' }, h('p', { text: 'Le stockage local est indisponible : ' + (e.message || e) })),
      h('p', { class: 'muted', text: 'En navigation privée, certains navigateurs bloquent le stockage. Ouvre l’application dans une fenêtre normale.' })));
    return;
  }
  applyTheme();
  document.title = APP.name;
  const fab = document.getElementById('fab');
  fab.append(icon('plus'), h('span', { text: 'Ajouter une activité' }));
  fab.addEventListener('click', () => { location.hash = '#/activite/nouvelle'; });
  window.addEventListener('hashchange', () => render());
  window.addEventListener('storage-error', (ev) => toast('Enregistrement impossible : ' + (ev.detail?.message || 'erreur de stockage') + '. Vérifie l’espace disponible.', { kind: 'error', timeout: 9000 }));
  const flush = () => { try { window.__elanFlush && window.__elanFlush(); } catch { /* ignoré */ } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  onChange(() => {});
  render();
  registerSW();
}

boot();
