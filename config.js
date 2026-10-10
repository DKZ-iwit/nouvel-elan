// Configuration centrale de l'application.
// Pour renommer l'application ou changer ses couleurs, modifier ce fichier
// (et, pour l'icône d'écran d'accueil, manifest.webmanifest).

export const APP = {
  name: 'Nouvel Élan',
  shortName: 'Nouvel Élan',
  slug: 'nouvel-elan',
  version: '2.0.0',
  // Format des fichiers d'export. Incrémenter en cas de changement de structure
  // et ajouter la migration correspondante dans js/io.js.
  exportFormat: 2,
  dbName: 'nouvel-elan',
  dbVersion: 1,
};

// Palette : ivoire, anthracite, pétrole profond, accents corail et doré.
export const COLORS = {
  light: {
    '--bg': '#FBF7EF',
    '--surface': '#FFFDF8',
    '--surface-2': '#F2EADC',
    '--ink': '#2B2A28',
    '--ink-soft': '#655F56',
    '--line': '#E4D9C6',
    '--accent': '#0F5560',       // pétrole
    '--accent-ink': '#FFFFFF',
    '--accent-soft': '#DDEBE8',
    '--coral': '#D9654A',
    '--coral-soft': '#F8E1D9',
    '--gold': '#A57C12',
    '--gold-soft': '#F6EBCB',
    '--gym': '#0F5560',
    '--outdoor': '#C55A40',
    '--outdoor-soft': '#F8E1D9',
    '--record': '#C9A227',
    '--record-soft': '#F6EBCB',
    '--alert': '#B3372B',
    '--alert-soft': '#F7DCD6',
    '--kcal': '#9A6B0C',
    '--c-halo': '#F1E6D2',
  },
  dark: {
    '--bg': '#1B1714',
    '--surface': '#25201B',
    '--surface-2': '#302822',
    '--ink': '#F4EDE2',
    '--ink-soft': '#BCB1A2',
    '--line': '#3E352C',
    '--accent': '#6FC0BE',
    '--accent-ink': '#0F2423',
    '--accent-soft': '#1E3836',
    '--coral': '#F08F72',
    '--coral-soft': '#3E2720',
    '--gold': '#E6C25A',
    '--gold-soft': '#3A3018',
    '--gym': '#6FC0BE',
    '--outdoor': '#F08F72',
    '--outdoor-soft': '#3E2720',
    '--record': '#E6C25A',
    '--record-soft': '#3A3018',
    '--alert': '#FF8A7A',
    '--alert-soft': '#46221D',
    '--kcal': '#E6C25A',
    '--c-halo': '#3A3027',
  },
};

// Couleurs proposées pour les profils.
export const PROFILE_COLORS = ['#0F5560', '#C55A40', '#A57C12', '#4F7A5A', '#6B4F8A', '#2E6E8E', '#8E3F5C', '#5C574F'];
export const PROFILE_AVATARS = ['🏋️', '🚴', '🏃', '🚶', '🏊', '💪', '⛰️', '🌿', '⭐', '🔥', '🦊', '🐢'];

// Réglages par défaut d'un appareil.
export const DEFAULT_SETTINGS = {
  theme: 'auto',            // 'auto' | 'clair' | 'sombre'
  restSeconds: 90,
  backupReminderDays: 14,
};
