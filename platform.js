// Thème clair/sombre et gestion du service worker.
import { COLORS } from './config.js';
import { S, flushAll } from './state.js';
import { toast } from './ui/components.js';

const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function applyTheme() {
  const pref = S.settings.theme || 'auto';
  const dark = pref === 'sombre' || (pref === 'auto' && mq && mq.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  for (const [k, v] of Object.entries(dark ? COLORS.dark : COLORS.light)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', (dark ? COLORS.dark : COLORS.light)['--bg']);
}
if (mq && mq.addEventListener) mq.addEventListener('change', () => { if ((S.settings.theme || 'auto') === 'auto') applyTheme(); });

let registration = null;
let updateShown = false;

function offerUpdate(worker) {
  if (updateShown || !worker) return;
  updateShown = true;
  toast('Nouvelle version disponible.', {
    timeout: 0, actionLabel: 'Mettre à jour', action: async () => {
      // Écrit les changements en attente et attend la confirmation d'IndexedDB avant d'activer
      // la nouvelle version. En cas d'échec, l'écran reste en place.
      try {
        await flushAll();
      } catch (e) {
        updateShown = false;
        toast('Mise à jour reportée : la sauvegarde de ta séance a échoué (' + (e?.message || 'erreur de stockage') + '). Réessaie après avoir libéré de l’espace.', { kind: 'error', timeout: 9000 });
        offerUpdate(worker);
        return;
      }
      worker.postMessage({ type: 'SKIP_WAITING' });
    },
  });
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const w = registration.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
  } catch (e) {
    console.warn('Service worker non enregistré', e);
  }
}

export async function checkForUpdate(manual = false) {
  if (!registration) { if (manual) toast('Mise à jour automatique indisponible dans ce contexte (connexion sécurisée requise).'); return; }
  try {
    await registration.update();
    if (registration.waiting) offerUpdate(registration.waiting);
    else if (manual) setTimeout(() => { if (!registration.waiting && !registration.installing) toast('L’application est à jour.'); }, 1500);
  } catch { if (manual) toast('Vérification impossible hors connexion.'); }
}
