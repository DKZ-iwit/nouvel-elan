// Modèles de programme publics. Règles explicites, sans donnée personnelle.

export const GOALS = {
  forme: {
    label: 'Remise en forme', reps: [10, 15], sets: [2, 3], rest: [60, 90], cardioMin: 15, cardioIntensity: 'modérée',
    isoPriority: 3, accessoryReps: [12, 15],
    why: 'Travailler tout le corps avec des charges modérées, installer la régularité et améliorer l’endurance générale.',
    cardioWhy: 'Un bloc de cardio modéré après la musculation entretient le souffle sans prendre le pas sur le renforcement.',
  },
  perte_poids: {
    label: 'Perte de poids', reps: [8, 12], sets: [3, 3], rest: [60, 90], cardioMin: 25, cardioIntensity: 'faible à modérée',
    isoPriority: 3, accessoryReps: [10, 15],
    why: 'Pendant une perte de poids, la musculation sert d’abord à conserver la masse musculaire : les mouvements polyarticulaires passent en premier, avec des charges qui progressent quand c’est possible.',
    cardioWhy: 'Le cardio, d’intensité faible à modérée, complète la séance et s’ajuste aux activités déjà faites dans la semaine.',
  },
  renforcement: {
    label: 'Renforcement musculaire', reps: [10, 12], sets: [2, 3], rest: [60, 90], cardioMin: 10, cardioIntensity: 'modérée',
    isoPriority: 3, accessoryReps: [12, 15],
    why: 'Renforcer l’ensemble des groupes musculaires de façon équilibrée, avec une technique stable.',
    cardioWhy: 'Un court bloc de cardio sert d’échauffement prolongé ou de retour au calme.',
  },
  hypertrophie: {
    label: 'Prise de muscle', reps: [8, 12], sets: [3, 4], rest: [75, 120], cardioMin: 10, cardioIntensity: 'faible',
    isoPriority: 2, accessoryReps: [10, 15], weeklySets: [10, 20],
    why: 'Accumuler un volume de séries suffisant par groupe musculaire (environ 10 à 20 séries de travail par semaine) avec des séries proches de l’échec.',
    cardioWhy: 'Le cardio reste léger pour préserver la récupération.',
  },
  force: {
    label: 'Force', reps: [4, 6], sets: [3, 5], rest: [150, 180], cardioMin: 10, cardioIntensity: 'faible',
    isoPriority: 3, accessoryReps: [8, 12], compoundOnlyHeavy: true,
    why: 'Des séries courtes et lourdes sur les mouvements polyarticulaires, avec de longues récupérations ; les exercices d’isolation restent en accompagnement.',
    cardioWhy: 'Le cardio reste court pour ne pas gêner la qualité des séries lourdes.',
  },
  endurance: {
    label: 'Endurance', reps: [12, 20], sets: [2, 3], rest: [30, 60], cardioMin: 30, cardioIntensity: 'modérée à soutenue',
    isoPriority: 3, accessoryReps: [15, 20],
    why: 'Des séries longues et des repos courts pour l’endurance musculaire, avec une part importante de cardio.',
    cardioWhy: 'Le cardio est un pilier de la séance ; il diminue si la semaine contient déjà beaucoup d’activités.',
  },
};

export const LEVEL_OPTIONS = {
  debutant: { label: 'Débutant', maxLevel: 1 },
  reprise: { label: 'Reprise', maxLevel: 1 },
  intermediaire: { label: 'Intermédiaire', maxLevel: 2 },
  experimente: { label: 'Expérimenté', maxLevel: 3 },
};

// Créneaux d'une journée : pattern, priorité (1 essentiel, 2 important, 3 facultatif), rang
// (0 = exercice principal du pattern, 1 = deuxième choix pour varier entre les journées).
const S = (pattern, prio, rank = 0) => ({ pattern, prio, rank });

export const DAY_TEMPLATES = {
  FA: { label: 'Corps complet A', focus: 'complet', slots: [S('squat', 1), S('tirage_vertical', 1), S('poussee_horizontale', 1), S('flexion_jambe', 2), S('tirage_horizontal', 2), S('triceps', 3), S('abdos', 3)] },
  FB: { label: 'Corps complet B', focus: 'complet', slots: [S('charniere', 1), S('tirage_horizontal', 1), S('poussee_verticale', 1), S('squat', 2, 1), S('tirage_vertical', 2, 1), S('biceps', 3), S('gainage', 3)] },
  FC: { label: 'Corps complet C', focus: 'complet', slots: [S('squat', 1), S('tirage_vertical', 1), S('poussee_horizontale', 1, 1), S('fessiers', 2), S('epaules_iso', 3), S('mollets', 3), S('abdos', 3, 1)] },
  UA: { label: 'Haut du corps A', focus: 'haut', slots: [S('tirage_vertical', 1), S('poussee_horizontale', 1), S('tirage_horizontal', 1), S('poussee_verticale', 2), S('triceps', 2), S('biceps', 2), S('haut_dos_iso', 3)] },
  LA: { label: 'Bas du corps A', focus: 'bas', slots: [S('squat', 1), S('flexion_jambe', 1), S('charniere', 2), S('extension_jambe', 2), S('mollets', 3), S('abdos', 3)] },
  UB: { label: 'Haut du corps B', focus: 'haut', slots: [S('tirage_horizontal', 1, 1), S('poussee_horizontale', 1, 1), S('tirage_vertical', 1, 1), S('epaules_iso', 2), S('pectoraux_iso', 2), S('biceps', 3, 1), S('triceps', 3, 1)] },
  LB: { label: 'Bas du corps B', focus: 'bas', slots: [S('charniere', 1), S('squat', 1, 1), S('fessiers', 2), S('flexion_jambe', 2, 1), S('adducteurs', 3), S('gainage', 3)] },
};

export const SPLITS = {
  1: ['FA'],
  2: ['FA', 'FB'],
  3: ['FA', 'FB', 'FC'],
  4: ['UA', 'LA', 'UB', 'LB'],
  5: ['UA', 'LA', 'UB', 'LB', 'FC'],
  6: ['UA', 'LA', 'UB', 'LB', 'UA', 'LA'],
};

// Jours de semaine suggérés (0 = lundi) selon la fréquence.
export const WEEK_LAYOUT = {
  1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5],
};
export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const PROGRESSION_RULES = [
  'Double progression : on garde la même charge tant que le haut de la plage de répétitions n’est pas atteint sur toutes les séries de travail.',
  'Quand c’est le cas avec un ressenti « Facile » ou « Maîtrisé », la séance suivante propose le plus petit incrément disponible.',
  'Pour une traction ou des dips assistés, la progression consiste à réduire l’assistance.',
  'Pour un exercice chronométré, on ajoute quelques secondes (5 s par défaut).',
  'Une seule séance difficile ne change pas la charge proposée ; deux séances difficiles de suite entraînent une proposition de légère baisse.',
  'Les charges ne sont jamais transférées d’une machine ou d’une variante à une autre.',
];
