// Configuration centrale de l'application.
// Pour renommer l'application ou changer ses couleurs, modifier ce fichier
// (et, pour l'icône d'écran d'accueil, manifest.webmanifest).

export const APP = {
  name: 'Nouvel Élan',
  shortName: 'Nouvel Élan',
  slug: 'nouvel-elan',
  version: '1.0.0',
  // Format des fichiers d'export. Incrémenter en cas de changement de structure
  // et ajouter la migration correspondante dans js/io.js.
  exportFormat: 1,
  dbName: 'nouvel-elan',
  dbVersion: 1,
};

// Palette inspirée des disques de musculation.
export const COLORS = {
  light: {
    '--bg': '#E8EDEC',
    '--surface': '#F8FAF9',
    '--surface-2': '#DDE4E2',
    '--ink': '#13232B',
    '--ink-soft': '#4B5C63',
    '--line': '#C3CDCB',
    '--accent': '#2449C9',       // disque bleu
    '--accent-ink': '#FFFFFF',
    '--accent-soft': '#D7E0FB',
    '--gym': '#2449C9',
    '--outdoor': '#1F8A5B',      // disque vert
    '--outdoor-soft': '#D3EDE1',
    '--record': '#E0A800',       // disque jaune
    '--record-soft': '#FBEFC7',
    '--alert': '#C8322C',        // disque rouge
    '--alert-soft': '#F7DAD8',
    '--kcal': '#C26A00',
  },
  dark: {
    '--bg': '#0E1A20',
    '--surface': '#16252D',
    '--surface-2': '#20323B',
    '--ink': '#E9F0EE',
    '--ink-soft': '#9FB0B5',
    '--line': '#2F454F',
    '--accent': '#7C9BFF',
    '--accent-ink': '#0E1A20',
    '--accent-soft': '#22305C',
    '--gym': '#7C9BFF',
    '--outdoor': '#4CC48C',
    '--outdoor-soft': '#163A2B',
    '--record': '#F2C230',
    '--record-soft': '#3B3212',
    '--alert': '#FF7A70',
    '--alert-soft': '#45201E',
    '--kcal': '#F0A040',
  },
};

// Couleurs proposées pour les profils.
export const PROFILE_COLORS = ['#2449C9', '#1F8A5B', '#C8322C', '#B07800', '#7A3FB8', '#0E7C86', '#C2477A', '#4B5C63'];
export const PROFILE_AVATARS = ['🏋️', '🚴', '🏃', '🚶', '🏊', '💪', '⛰️', '🌿', '⭐', '🔥', '🦊', '🐢'];

// Réglages par défaut d'un appareil.
export const DEFAULT_SETTINGS = {
  theme: 'auto',            // 'auto' | 'clair' | 'sombre'
  restSeconds: 90,
  backupReminderDays: 14,
};
