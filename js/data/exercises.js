// Bibliothèque d'exercices publique. Ne contient aucune donnée personnelle.
//
// Champs :
//  id, name, desc (description), cues (consignes), caution (points d'attention)
//  cat       : 'muscu' | 'cardio'
//  family    : 'poussee' | 'tirage' | 'genou' | 'hanche' | 'flexion' | 'extension' | 'gainage' | 'locomotion'
//  pattern   : rôle dans un programme (voir PATTERNS)
//  primary / secondary : groupes musculaires
//  eq        : matériel requis, liste de groupes ; un groupe tableau = l'un des éléments suffit
//  level     : 1 débutant, 2 intermédiaire, 3 avancé
//  compound  : polyarticulaire (true) ou isolation (false)
//  unilateral
//  measure   : 'load_reps' | 'reps' | 'time' | 'assist_reps' | 'cardio'
//  load      : 'total' | 'per_dumbbell' | 'assist' | 'bodyweight' | 'none'
//  inc       : incrément par défaut (kg, ou secondes pour 'time', répétitions pour 'reps')
//  zones     : articulations nettement sollicitées
//  moves     : caractéristiques de mouvement (déclarables comme gênantes dans le profil)
//  alts      : [[id, différence importante]]

export const MUSCLES = {
  pectoraux: 'Pectoraux', dos: 'Grand dorsal', haut_dos: 'Haut du dos', trapezes: 'Trapèzes',
  epaules: 'Épaules', epaules_arr: 'Arrière d’épaule', biceps: 'Biceps', triceps: 'Triceps', avant_bras: 'Avant-bras',
  abdominaux: 'Abdominaux', obliques: 'Obliques', lombaires: 'Lombaires',
  quadriceps: 'Quadriceps', ischios: 'Ischio-jambiers', fessiers: 'Fessiers', adducteurs: 'Adducteurs',
  mollets: 'Mollets', cardio: 'Cardio-respiratoire',
};

export const EQUIPMENT = {
  machines: 'Machines guidées', poulies: 'Poulies', halteres: 'Haltères', barre: 'Barre et disques',
  banc: 'Banc', barre_traction: 'Barre de traction', kettlebell: 'Kettlebell', elastique: 'Élastiques',
  tapis: 'Tapis de course', velo_salle: 'Vélo de salle', elliptique: 'Elliptique', rameur: 'Rameur',
};

export const FAMILIES = {
  poussee: 'Poussée', tirage: 'Tirage', genou: 'Dominante genou', hanche: 'Dominante hanche',
  flexion: 'Flexion', extension: 'Extension', gainage: 'Gainage', locomotion: 'Locomotion',
};

export const PATTERNS = {
  squat: 'Jambes – dominante genou', charniere: 'Jambes – dominante hanche', flexion_jambe: 'Arrière de cuisse',
  extension_jambe: 'Avant de cuisse (isolation)', fessiers: 'Fessiers', mollets: 'Mollets',
  tirage_vertical: 'Tirage vertical', tirage_horizontal: 'Tirage horizontal', poussee_horizontale: 'Poussée horizontale',
  poussee_verticale: 'Poussée verticale', pectoraux_iso: 'Pectoraux (isolation)', epaules_iso: 'Épaules (isolation)',
  haut_dos_iso: 'Haut du dos', biceps: 'Biceps', triceps: 'Triceps', abdos: 'Abdominaux', gainage: 'Gainage',
  adducteurs: 'Adducteurs / abducteurs', cardio: 'Cardio',
};

export const LEVELS = { 1: 'Accessible', 2: 'Intermédiaire', 3: 'Avancé' };

export const MEASURES = {
  load_reps: 'Charge × répétitions', reps: 'Répétitions', time: 'Durée', assist_reps: 'Assistance × répétitions', cardio: 'Durée / distance',
};
export const LOADS = {
  total: 'Charge totale', per_dumbbell: 'Charge par haltère', assist: 'Assistance (moins = plus difficile)',
  bodyweight: 'Poids du corps', none: 'Sans charge',
};

export const ZONES = {
  genoux: 'Genoux', dos: 'Dos', epaules: 'Épaules', hanches: 'Hanches', chevilles: 'Chevilles',
  poignets: 'Poignets', coudes: 'Coudes', autre: 'Autre zone',
};

// Caractéristiques de mouvement qu'un utilisateur peut déclarer gênantes pour une zone.
export const MOVES = {
  flexion_genou_profonde: { label: 'Flexion profonde du genou (squat, presse basse)', zones: ['genoux', 'hanches'] },
  unipodal: { label: 'Appui sur une jambe (fentes, step-up)', zones: ['genoux', 'hanches', 'chevilles'] },
  impact: { label: 'Impacts (course, sauts)', zones: ['genoux', 'chevilles', 'hanches', 'dos'] },
  extension_genou_chargee: { label: 'Extension du genou chargée (leg extension)', zones: ['genoux'] },
  charge_axiale: { label: 'Charge sur la colonne (barre sur les épaules)', zones: ['dos'] },
  flexion_dos: { label: 'Buste penché en avant chargé', zones: ['dos', 'hanches'] },
  flexion_tronc: { label: 'Enroulement du tronc (crunch)', zones: ['dos'] },
  bras_dessus_tete: { label: 'Bras au-dessus de la tête', zones: ['epaules', 'coudes'] },
  appui_epaules: { label: 'Appui en descente profonde (dips, pompes basses)', zones: ['epaules', 'coudes', 'poignets'] },
  appui_poignets: { label: 'Appui sur les mains', zones: ['poignets', 'coudes'] },
  extension_coude_chargee: { label: 'Extension du coude chargée (barre au front)', zones: ['coudes'] },
  prise_suspension: { label: 'Suspension et prise serrée', zones: ['epaules', 'coudes', 'poignets'] },
  flexion_hanche_profonde: { label: 'Flexion profonde de hanche', zones: ['hanches', 'dos'] },
};

const LIB = [];
function E(id, name, o) {
  LIB.push({
    id, name, desc: o.d || '', cues: o.c || '', caution: o.w || '',
    cat: o.cat || 'muscu', family: o.fam, pattern: o.pat,
    primary: o.pri || [], secondary: o.sec || [], eq: o.eq || [], level: o.lvl || 1,
    compound: !!o.cmp, unilateral: !!o.uni, measure: o.m || 'load_reps', load: o.ld || 'total',
    inc: o.inc ?? 2.5, zones: o.z || [], moves: o.mv || [], alts: o.alt || [],
  });
}

// ---------- Tirage vertical ----------
E('tirage_vertical', 'Tirage vertical', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps', 'haut_dos'], eq: [['poulies', 'machines']], cmp: true, z: ['epaules', 'coudes'], mv: ['bras_dessus_tete'],
  d: 'Tirer une barre ou des poignées vers le haut de la poitrine, assis, cuisses calées.', c: 'Poitrine haute, coudes vers les hanches, remontée contrôlée.', w: 'Ne pas tirer derrière la nuque.',
  alt: [['tirage_vertical_serre', 'Prise neutre, plus de biceps'], ['traction_assistee', 'Corps qui monte, plus exigeant en gainage'], ['tirage_vertical_machine', 'Trajectoire guidée'], ['tirage_vertical_unilateral', 'Un bras à la fois']] });
E('tirage_vertical_serre', 'Tirage vertical prise serrée neutre', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps'], eq: ['poulies'], cmp: true, z: ['epaules', 'coudes'], mv: ['bras_dessus_tete'],
  d: 'Tirage vertical avec poignée triangle, paumes face à face.', c: 'Amener la poignée sous le menton en gardant le buste stable.', alt: [['tirage_vertical', 'Prise large']] });
E('tirage_vertical_machine', 'Tirage vertical machine convergente', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps', 'haut_dos'], eq: ['machines'], cmp: true, z: ['epaules'], mv: ['bras_dessus_tete'],
  d: 'Machine à bras indépendants qui guide la trajectoire du tirage.', c: 'Coudes vers le bas et l’arrière, sans hausser les épaules.', alt: [['tirage_vertical', 'Poulie libre']] });
E('tirage_vertical_unilateral', 'Tirage vertical unilatéral', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps', 'obliques'], eq: ['poulies'], cmp: true, uni: true, inc: 1, z: ['epaules'], mv: ['bras_dessus_tete'],
  d: 'Tirage d’une poignée à la poulie haute, un bras après l’autre.', c: 'Garder le bassin fixe, tirer le coude vers la hanche.', alt: [['tirage_vertical', 'Deux bras, charge plus lourde']] });
E('traction_assistee', 'Traction assistée (machine)', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps', 'avant_bras'], eq: ['machines'], cmp: true, m: 'assist_reps', ld: 'assist', z: ['epaules', 'coudes'], mv: ['bras_dessus_tete', 'prise_suspension'],
  d: 'Traction avec contrepoids sous les genoux ou les pieds. Moins d’assistance = plus difficile.', c: 'Partir bras tendus, monter le menton au-dessus de la barre, redescendre lentement.', w: 'La progression se lit à l’assistance qui baisse à répétitions égales.',
  alt: [['tirage_vertical', 'Assis, charge réglable'], ['traction_negative', 'Descente seule, sans assistance'], ['traction_elastique', 'Assistance par élastique']] });
E('traction_elastique', 'Traction avec élastique', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps'], eq: ['barre_traction', 'elastique'], cmp: true, lvl: 2, m: 'reps', ld: 'bodyweight', inc: 1, z: ['epaules', 'coudes'], mv: ['bras_dessus_tete', 'prise_suspension'],
  d: 'Traction avec un élastique sous les pieds ou les genoux. Noter la couleur de l’élastique en variante.', c: 'Contrôler la descente pour ne pas être catapulté par l’élastique.', alt: [['traction_assistee', 'Assistance chiffrée']] });
E('traction', 'Traction', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps', 'avant_bras', 'abdominaux'], eq: ['barre_traction'], cmp: true, lvl: 3, m: 'reps', ld: 'bodyweight', inc: 1, z: ['epaules', 'coudes'], mv: ['bras_dessus_tete', 'prise_suspension'],
  d: 'Se hisser à la barre sans aide jusqu’au menton.', c: 'Amplitude complète, sans balancer les jambes.', alt: [['traction_assistee', 'Assistée'], ['traction_negative', 'Descente seule']] });
E('traction_negative', 'Traction négative', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['biceps'], eq: ['barre_traction', 'banc'], cmp: true, lvl: 2, m: 'reps', ld: 'bodyweight', inc: 1, z: ['epaules', 'coudes'], mv: ['bras_dessus_tete', 'prise_suspension'],
  d: 'Monter en haut de la barre avec un banc puis descendre lentement (3 à 5 s).', c: 'Descente régulière jusqu’aux bras tendus.', alt: [['traction_assistee', 'Montée et descente assistées']] });
E('suspension', 'Suspension à la barre', { fam: 'gainage', pat: 'gainage', pri: ['avant_bras'], sec: ['dos', 'epaules'], eq: ['barre_traction'], m: 'time', ld: 'bodyweight', inc: 5, z: ['epaules', 'poignets'], mv: ['prise_suspension', 'bras_dessus_tete'],
  d: 'Rester suspendu, bras tendus, pour travailler la prise et les épaules.', c: 'Épaules légèrement engagées, respiration calme.', w: 'Se suit en secondes.', alt: [['marche_fermier', 'Prise sans suspension']] });
E('pullover_poulie', 'Pull-over à la poulie', { fam: 'tirage', pat: 'tirage_vertical', pri: ['dos'], sec: ['triceps'], eq: ['poulies'], z: ['epaules'], mv: ['bras_dessus_tete'],
  d: 'Bras presque tendus, ramener la barre de la poulie haute vers les cuisses.', c: 'Buste légèrement penché, coudes fixes.', alt: [['tirage_vertical', 'Polyarticulaire']] });

// ---------- Tirage horizontal ----------
E('rowing_assis_machine', 'Rowing assis (machine)', { fam: 'tirage', pat: 'tirage_horizontal', pri: ['dos', 'haut_dos'], sec: ['biceps', 'epaules_arr'], eq: ['machines'], cmp: true, z: ['coudes'],
  d: 'Tirer des poignées vers le ventre, poitrine en appui ou buste droit.', c: 'Serrer les omoplates en fin de mouvement, retour contrôlé.',
  alt: [['rowing_poulie_basse', 'Poulie, buste libre'], ['rowing_haltere', 'Un bras, haltère'], ['rowing_appui_poitrine', 'Haltères, poitrine en appui']] });
E('rowing_poulie_basse', 'Rowing poulie basse', { fam: 'tirage', pat: 'tirage_horizontal', pri: ['dos', 'haut_dos'], sec: ['biceps', 'lombaires'], eq: ['poulies'], cmp: true, z: ['dos', 'coudes'],
  d: 'Assis face à la poulie, tirer la poignée vers le nombril.', c: 'Dos neutre, ne pas basculer le buste pour tirer.', alt: [['rowing_assis_machine', 'Appui poitrine, dos soulagé']] });
E('rowing_haltere', 'Rowing haltère un bras', { fam: 'tirage', pat: 'tirage_horizontal', pri: ['dos'], sec: ['biceps', 'haut_dos'], eq: ['halteres', 'banc'], cmp: true, uni: true, ld: 'per_dumbbell', inc: 2, z: ['dos'], mv: ['flexion_dos'],
  d: 'Main et genou sur un banc, tirer l’haltère vers la hanche.', c: 'Dos plat, coude près du corps.', alt: [['rowing_assis_machine', 'Guidé, deux bras']] });
E('rowing_appui_poitrine', 'Rowing haltères poitrine en appui', { fam: 'tirage', pat: 'tirage_horizontal', pri: ['haut_dos', 'dos'], sec: ['epaules_arr', 'biceps'], eq: ['halteres', 'banc'], cmp: true, ld: 'per_dumbbell', inc: 2,
  d: 'Allongé ventre sur un banc incliné, tirer deux haltères.', c: 'Poitrine collée au banc, omoplates serrées en haut.', alt: [['rowing_haltere', 'Un bras, plus de charge']] });
E('rowing_barre', 'Rowing barre buste penché', { fam: 'tirage', pat: 'tirage_horizontal', pri: ['dos', 'haut_dos'], sec: ['lombaires', 'biceps', 'ischios'], eq: ['barre'], cmp: true, lvl: 2, z: ['dos', 'hanches'], mv: ['flexion_dos'],
  d: 'Buste penché, tirer la barre vers le bas du ventre.', c: 'Dos neutre, genoux fléchis, pas d’élan.', w: 'Exige un bon contrôle du dos.', alt: [['rowing_appui_poitrine', 'Dos en appui']] });
E('rowing_inverse', 'Rowing inversé', { fam: 'tirage', pat: 'tirage_horizontal', pri: ['haut_dos', 'dos'], sec: ['biceps', 'abdominaux'], eq: ['barre'], cmp: true, m: 'reps', ld: 'bodyweight', inc: 1, mv: ['prise_suspension'],
  d: 'Sous une barre fixée à hauteur de taille, corps gainé, tirer la poitrine vers la barre.', c: 'Plus les pieds sont avancés, plus c’est difficile.', alt: [['rowing_assis_machine', 'Charge réglable']] });
E('face_pull', 'Face pull', { fam: 'tirage', pat: 'haut_dos_iso', pri: ['epaules_arr', 'haut_dos'], sec: ['trapezes'], eq: ['poulies'], inc: 2.5, z: ['epaules'],
  d: 'Tirer une corde à hauteur du visage en écartant les mains.', c: 'Coudes hauts, finir mains près des oreilles.', alt: [['oiseau_machine', 'Guidé']] });
E('oiseau_machine', 'Oiseau à la machine', { fam: 'tirage', pat: 'haut_dos_iso', pri: ['epaules_arr'], sec: ['haut_dos'], eq: ['machines'],
  d: 'Pec deck utilisé à l’envers : ouvrir les bras vers l’arrière.', c: 'Bras légèrement fléchis, mouvement lent.', alt: [['face_pull', 'Poulie'], ['oiseau_halteres', 'Libre']] });
E('oiseau_halteres', 'Oiseau aux haltères', { fam: 'tirage', pat: 'haut_dos_iso', pri: ['epaules_arr'], sec: ['haut_dos'], eq: ['halteres'], ld: 'per_dumbbell', inc: 1, z: ['dos'], mv: ['flexion_dos'],
  d: 'Buste penché, écarter les haltères sur les côtés.', c: 'Charges légères, amplitude contrôlée.', alt: [['oiseau_machine', 'Buste soutenu']] });
E('shrug_halteres', 'Haussement d’épaules aux haltères', { fam: 'tirage', pat: 'haut_dos_iso', pri: ['trapezes'], sec: ['avant_bras'], eq: ['halteres'], ld: 'per_dumbbell', inc: 2,
  d: 'Hausser les épaules vers les oreilles avec un haltère dans chaque main.', c: 'Pause d’une seconde en haut, sans rouler les épaules.', alt: [['face_pull', 'Haut du dos plus global']] });

// ---------- Poussée horizontale ----------
E('chest_press', 'Chest press (machine)', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['triceps', 'epaules'], eq: ['machines'], cmp: true, z: ['epaules'],
  d: 'Pousser les poignées devant soi, assis, dos en appui.', c: 'Poignées à hauteur de poitrine, omoplates serrées contre le dossier.',
  alt: [['developpe_couche_halteres', 'Libre, plus de stabilisation'], ['chest_press_incline', 'Orientée vers le haut des pectoraux'], ['pompes_inclinees', 'Sans machine']] });
E('chest_press_incline', 'Chest press inclinée (machine)', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['epaules', 'triceps'], eq: ['machines'], cmp: true, z: ['epaules'],
  d: 'Presse pectorale avec trajectoire montante.', c: 'Garder les épaules basses.', alt: [['chest_press', 'Trajectoire horizontale']] });
E('developpe_couche_halteres', 'Développé couché aux haltères', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['triceps', 'epaules'], eq: ['halteres', 'banc'], cmp: true, ld: 'per_dumbbell', inc: 2, z: ['epaules'], mv: ['appui_epaules'],
  d: 'Allongé sur un banc, pousser deux haltères au-dessus de la poitrine.', c: 'Coudes à environ 45° du corps, descente contrôlée.', alt: [['chest_press', 'Guidé'], ['developpe_couche_barre', 'Barre, charge plus lourde']] });
E('developpe_incline_halteres', 'Développé incliné aux haltères', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['epaules', 'triceps'], eq: ['halteres', 'banc'], cmp: true, ld: 'per_dumbbell', inc: 2, z: ['epaules'],
  d: 'Développé sur banc incliné à 30° environ.', c: 'Pousser vers le haut et légèrement vers l’intérieur.', alt: [['chest_press_incline', 'Guidé']] });
E('developpe_couche_barre', 'Développé couché à la barre', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['triceps', 'epaules'], eq: ['barre', 'banc'], cmp: true, lvl: 2, z: ['epaules', 'poignets'], mv: ['appui_epaules'],
  d: 'Descendre la barre sur la poitrine puis pousser.', c: 'Pieds au sol, omoplates serrées. Utiliser des sécurités.', w: 'Travailler avec un partenaire ou des sécurités.', alt: [['developpe_couche_halteres', 'Plus libre pour les épaules']] });
E('developpe_incline_barre', 'Développé incliné à la barre', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['epaules', 'triceps'], eq: ['barre', 'banc'], cmp: true, lvl: 2, z: ['epaules'],
  d: 'Développé à la barre sur banc incliné.', c: 'Barre vers le haut de la poitrine.', alt: [['developpe_incline_halteres', 'Haltères']] });
E('pompes', 'Pompes', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['triceps', 'epaules', 'abdominaux'], eq: [], cmp: true, lvl: 2, m: 'reps', ld: 'bodyweight', inc: 1, z: ['poignets', 'epaules'], mv: ['appui_poignets', 'appui_epaules'],
  d: 'Pompes au sol, corps gainé.', c: 'Corps aligné, poitrine près du sol.', alt: [['pompes_inclinees', 'Plus facile'], ['chest_press', 'Charge réglable']] });
E('pompes_inclinees', 'Pompes mains surélevées', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['triceps', 'epaules'], eq: [], cmp: true, m: 'reps', ld: 'bodyweight', inc: 1, z: ['poignets'], mv: ['appui_poignets'],
  d: 'Pompes avec les mains sur un banc ou une barre : plus haut = plus facile.', c: 'Noter la hauteur d’appui en variante.', alt: [['pompes', 'Au sol'], ['pompes_genoux', 'Sur les genoux']] });
E('pompes_genoux', 'Pompes sur les genoux', { fam: 'poussee', pat: 'poussee_horizontale', pri: ['pectoraux'], sec: ['triceps'], eq: [], cmp: true, m: 'reps', ld: 'bodyweight', inc: 1, z: ['poignets', 'genoux'], mv: ['appui_poignets'],
  d: 'Pompes avec appui sur les genoux.', c: 'Hanches alignées avec le buste.', alt: [['pompes_inclinees', 'Sans appui sur les genoux']] });
E('dips_assistes', 'Dips assistés (machine)', { fam: 'poussee', pat: 'triceps', pri: ['triceps', 'pectoraux'], sec: ['epaules'], eq: ['machines'], cmp: true, m: 'assist_reps', ld: 'assist', z: ['epaules', 'coudes'], mv: ['appui_epaules'],
  d: 'Dips avec contrepoids. Moins d’assistance = plus difficile.', c: 'Descendre jusqu’à un angle confortable pour les épaules.', alt: [['triceps_machine', 'Assis, guidé']] });
E('pec_deck', 'Écartés à la machine (pec deck)', { fam: 'poussee', pat: 'pectoraux_iso', pri: ['pectoraux'], sec: ['epaules'], eq: ['machines'], z: ['epaules'],
  d: 'Rapprocher les bras devant soi, coudes légèrement fléchis.', c: 'Amplitude confortable, pas d’étirement forcé.', alt: [['ecartes_poulie', 'Poulies'], ['ecartes_halteres', 'Haltères']] });
E('ecartes_halteres', 'Écartés aux haltères', { fam: 'poussee', pat: 'pectoraux_iso', pri: ['pectoraux'], sec: ['epaules'], eq: ['halteres', 'banc'], ld: 'per_dumbbell', inc: 1, z: ['epaules'],
  d: 'Allongé, ouvrir les bras en arc puis les refermer.', c: 'Charges modérées, coudes légèrement fléchis.', alt: [['pec_deck', 'Guidé']] });
E('ecartes_poulie', 'Écartés à la poulie (vis-à-vis)', { fam: 'poussee', pat: 'pectoraux_iso', pri: ['pectoraux'], sec: ['epaules'], eq: ['poulies'], z: ['epaules'],
  d: 'Rapprocher les poignées des deux poulies devant la poitrine.', c: 'Buste stable, un pied devant.', alt: [['pec_deck', 'Assis, guidé']] });

// ---------- Poussée verticale ----------
E('developpe_epaules_machine', 'Développé épaules (machine)', { fam: 'poussee', pat: 'poussee_verticale', pri: ['epaules'], sec: ['triceps'], eq: ['machines'], cmp: true, z: ['epaules'], mv: ['bras_dessus_tete'],
  d: 'Pousser les poignées au-dessus de la tête, assis.', c: 'Dos en appui, ne pas cambrer.', alt: [['developpe_militaire_halteres', 'Haltères, assis']] });
E('developpe_militaire_halteres', 'Développé épaules aux haltères assis', { fam: 'poussee', pat: 'poussee_verticale', pri: ['epaules'], sec: ['triceps'], eq: ['halteres', 'banc'], cmp: true, ld: 'per_dumbbell', inc: 2, z: ['epaules'], mv: ['bras_dessus_tete'],
  d: 'Assis dossier droit, pousser les haltères au-dessus de la tête.', c: 'Avant-bras verticaux, gainage du ventre.', alt: [['developpe_epaules_machine', 'Guidé']] });
E('developpe_militaire_barre', 'Développé militaire debout', { fam: 'poussee', pat: 'poussee_verticale', pri: ['epaules'], sec: ['triceps', 'abdominaux'], eq: ['barre'], cmp: true, lvl: 3, z: ['epaules', 'dos'], mv: ['bras_dessus_tete', 'charge_axiale'],
  d: 'Debout, pousser la barre du haut de la poitrine au-dessus de la tête.', c: 'Fessiers et abdominaux serrés, sans cambrer.', alt: [['developpe_militaire_halteres', 'Assis, dos soutenu']] });
E('elevations_laterales', 'Élévations latérales aux haltères', { fam: 'poussee', pat: 'epaules_iso', pri: ['epaules'], sec: ['trapezes'], eq: ['halteres'], ld: 'per_dumbbell', inc: 1, z: ['epaules'],
  d: 'Monter les bras sur les côtés jusqu’à l’horizontale.', c: 'Charges légères, sans élan.', alt: [['elevations_laterales_poulie', 'Tension constante'], ['elevations_laterales_machine', 'Guidé']] });
E('elevations_laterales_poulie', 'Élévations latérales à la poulie', { fam: 'poussee', pat: 'epaules_iso', pri: ['epaules'], eq: ['poulies'], uni: true, inc: 1.25, z: ['epaules'],
  d: 'Un bras à la fois, poignée de la poulie basse.', c: 'Monter jusqu’à l’épaule, redescendre lentement.', alt: [['elevations_laterales', 'Haltères']] });
E('elevations_laterales_machine', 'Élévations latérales (machine)', { fam: 'poussee', pat: 'epaules_iso', pri: ['epaules'], eq: ['machines'], z: ['epaules'],
  d: 'Machine qui guide l’élévation des bras sur les côtés.', c: 'Épaules basses.', alt: [['elevations_laterales', 'Haltères']] });
E('elevations_frontales', 'Élévations frontales', { fam: 'poussee', pat: 'epaules_iso', pri: ['epaules'], eq: ['halteres'], ld: 'per_dumbbell', inc: 1, z: ['epaules'],
  d: 'Monter les haltères devant soi jusqu’aux épaules.', c: 'Alterner ou deux bras, sans balancer.', alt: [['elevations_laterales', 'Partie latérale de l’épaule']] });

// ---------- Triceps ----------
E('triceps_machine', 'Triceps (machine)', { fam: 'extension', pat: 'triceps', pri: ['triceps'], sec: [], eq: ['machines'], z: ['coudes'],
  d: 'Machine d’extension ou de dips assis pour les triceps.', c: 'Coudes fixes, extension complète sans verrouiller brutalement.',
  alt: [['triceps_poulie_corde', 'Poulie, debout'], ['dips_assistes', 'Polyarticulaire, plus de pectoraux']] });
E('triceps_poulie_corde', 'Extension triceps à la poulie', { fam: 'extension', pat: 'triceps', pri: ['triceps'], eq: ['poulies'], z: ['coudes'],
  d: 'Pousser la corde ou la barre de la poulie haute vers le bas.', c: 'Coudes collés au corps.', alt: [['triceps_machine', 'Assis, guidé']] });
E('extension_triceps_nuque', 'Extension triceps au-dessus de la tête', { fam: 'extension', pat: 'triceps', pri: ['triceps'], eq: [['halteres', 'poulies']], inc: 1, z: ['coudes', 'epaules'], mv: ['bras_dessus_tete'],
  d: 'Haltère ou corde tenue derrière la tête, tendre les bras.', c: 'Coudes pointés vers le haut.', alt: [['triceps_poulie_corde', 'Bras le long du corps']] });
E('barre_front', 'Barre au front', { fam: 'extension', pat: 'triceps', pri: ['triceps'], eq: ['barre', 'banc'], lvl: 2, z: ['coudes'], mv: ['extension_coude_chargee'],
  d: 'Allongé, descendre la barre vers le front en pliant les coudes.', c: 'Charges modérées, coudes stables.', alt: [['triceps_poulie_corde', 'Moins de contrainte au coude']] });
E('dips_banc', 'Dips entre deux bancs', { fam: 'extension', pat: 'triceps', pri: ['triceps'], sec: ['pectoraux'], eq: ['banc'], m: 'reps', ld: 'bodyweight', inc: 1, lvl: 2, z: ['epaules', 'poignets'], mv: ['appui_epaules', 'appui_poignets'],
  d: 'Mains sur un banc derrière soi, fléchir et tendre les bras.', c: 'Descente limitée si les épaules tirent.', alt: [['triceps_machine', 'Guidé']] });
E('kickback_triceps', 'Kickback triceps', { fam: 'extension', pat: 'triceps', pri: ['triceps'], eq: [['halteres', 'poulies']], uni: true, inc: 1, z: ['dos'],
  d: 'Buste penché, tendre le bras vers l’arrière.', c: 'Bras collé au corps.', alt: [['triceps_poulie_corde', 'Deux bras']] });

// ---------- Biceps ----------
E('biceps_machine', 'Biceps (machine)', { fam: 'flexion', pat: 'biceps', pri: ['biceps'], sec: ['avant_bras'], eq: ['machines'], z: ['coudes'],
  d: 'Machine de flexion des bras, coudes en appui sur un pupitre.', c: 'Remonter sans décoller les coudes, descente lente.', alt: [['curl_halteres', 'Libre'], ['curl_poulie', 'Tension constante']] });
E('curl_halteres', 'Curl aux haltères', { fam: 'flexion', pat: 'biceps', pri: ['biceps'], sec: ['avant_bras'], eq: ['halteres'], ld: 'per_dumbbell', inc: 1, z: ['coudes'],
  d: 'Fléchir les bras en tournant les paumes vers le haut.', c: 'Coudes le long du corps.', alt: [['curl_marteau', 'Prise neutre'], ['biceps_machine', 'Guidé']] });
E('curl_marteau', 'Curl marteau', { fam: 'flexion', pat: 'biceps', pri: ['biceps', 'avant_bras'], eq: ['halteres'], ld: 'per_dumbbell', inc: 1, z: ['coudes'],
  d: 'Curl avec les paumes face à face.', c: 'Pas de balancement du buste.', alt: [['curl_halteres', 'Supination']] });
E('curl_barre', 'Curl à la barre', { fam: 'flexion', pat: 'biceps', pri: ['biceps'], sec: ['avant_bras'], eq: ['barre'], z: ['coudes', 'poignets'],
  d: 'Debout, fléchir les bras avec une barre droite ou EZ.', c: 'Buste immobile.', alt: [['curl_halteres', 'Poignets plus libres']] });
E('curl_poulie', 'Curl à la poulie basse', { fam: 'flexion', pat: 'biceps', pri: ['biceps'], eq: ['poulies'], z: ['coudes'],
  d: 'Fléchir les bras avec la barre de la poulie basse.', c: 'Coudes fixes.', alt: [['biceps_machine', 'Coudes en appui']] });
E('curl_pupitre', 'Curl au pupitre', { fam: 'flexion', pat: 'biceps', pri: ['biceps'], eq: [['halteres', 'barre'], 'banc'], inc: 1, z: ['coudes'],
  d: 'Bras en appui sur un pupitre, fléchir les coudes.', c: 'Ne pas tendre brutalement en bas.', alt: [['biceps_machine', 'Machine']] });

// ---------- Dominante genou ----------
E('presse_cuisses', 'Presse à cuisses', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], sec: ['ischios', 'adducteurs'], eq: ['machines'], cmp: true, inc: 5, z: ['genoux', 'hanches'], mv: ['flexion_genou_profonde'],
  d: 'Pousser une plateforme avec les pieds, dos en appui.', c: 'Genoux dans l’axe des pieds, bas du dos collé au dossier. Profondeur confortable.',
  w: 'L’amplitude et la position des pieds se règlent selon le confort ; noter le réglage en variante.',
  alt: [['hack_squat', 'Debout, plus de quadriceps'], ['squat_gobelet', 'Libre, charge légère'], ['squat_guide', 'Barre guidée']] });
E('hack_squat', 'Hack squat (machine)', { fam: 'genou', pat: 'squat', pri: ['quadriceps'], sec: ['fessiers'], eq: ['machines'], cmp: true, lvl: 2, inc: 5, z: ['genoux', 'hanches'], mv: ['flexion_genou_profonde'],
  d: 'Squat sur machine inclinée, dos en appui.', c: 'Descente contrôlée, genoux alignés.', alt: [['presse_cuisses', 'Assis, plus réglable']] });
E('squat_guide', 'Squat à la barre guidée', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], sec: ['ischios'], eq: ['machines'], cmp: true, lvl: 2, z: ['genoux', 'dos'], mv: ['flexion_genou_profonde', 'charge_axiale'],
  d: 'Squat avec une barre sur rails (Smith machine).', c: 'Pieds légèrement devant, dos droit.', alt: [['presse_cuisses', 'Sans charge sur le dos']] });
E('squat_gobelet', 'Squat gobelet', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], sec: ['abdominaux'], eq: [['halteres', 'kettlebell']], cmp: true, inc: 2, z: ['genoux', 'hanches'], mv: ['flexion_genou_profonde'],
  d: 'Squat en tenant un haltère contre la poitrine.', c: 'Buste droit, descendre à une profondeur confortable.', alt: [['presse_cuisses', 'Guidé'], ['assis_debout', 'Sans charge, sur banc']] });
E('squat_barre', 'Squat à la barre', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], sec: ['ischios', 'lombaires'], eq: ['barre'], cmp: true, lvl: 3, z: ['genoux', 'dos', 'hanches'], mv: ['flexion_genou_profonde', 'charge_axiale'],
  d: 'Squat barre sur le haut du dos, dans une cage avec sécurités.', c: 'Technique à maîtriser avant de charger.', w: 'Utiliser les sécurités de la cage.', alt: [['squat_guide', 'Guidé'], ['presse_cuisses', 'Sans charge axiale']] });
E('squat_poids_corps', 'Squat au poids du corps', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], eq: [], cmp: true, m: 'reps', ld: 'bodyweight', inc: 1, z: ['genoux', 'hanches'], mv: ['flexion_genou_profonde'],
  d: 'Squat sans charge.', c: 'Talons au sol, amplitude confortable.', alt: [['assis_debout', 'Avec repère sur un banc']] });
E('assis_debout', 'Assis-debout sur banc', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], eq: ['banc'], cmp: true, m: 'reps', ld: 'bodyweight', inc: 1, z: ['genoux'],
  d: 'S’asseoir sur un banc puis se relever sans les mains.', c: 'Hauteur du banc ajustable pour régler la difficulté.', alt: [['squat_poids_corps', 'Sans repère']] });
E('fentes_halteres', 'Fentes avant aux haltères', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], sec: ['adducteurs'], eq: ['halteres'], cmp: true, uni: true, lvl: 2, ld: 'per_dumbbell', inc: 2, z: ['genoux', 'hanches', 'chevilles'], mv: ['unipodal', 'flexion_genou_profonde'],
  d: 'Grand pas en avant, descendre le genou arrière vers le sol.', c: 'Buste droit, genou avant dans l’axe du pied.', alt: [['fentes_arriere', 'Pas en arrière, souvent plus confortable'], ['presse_cuisses', 'Deux jambes, guidé']] });
E('fentes_arriere', 'Fentes arrière', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], eq: [], cmp: true, uni: true, m: 'reps', ld: 'bodyweight', inc: 1, z: ['genoux', 'hanches'], mv: ['unipodal'],
  d: 'Reculer une jambe et descendre, puis revenir. Haltères possibles (noter en variante).', c: 'Poids sur la jambe avant.', alt: [['fentes_halteres', 'Pas avant']] });
E('split_squat_bulgare', 'Split squat bulgare', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], eq: ['banc', 'halteres'], cmp: true, uni: true, lvl: 3, ld: 'per_dumbbell', inc: 2, z: ['genoux', 'hanches'], mv: ['unipodal', 'flexion_genou_profonde'],
  d: 'Pied arrière posé sur un banc, fléchir la jambe avant.', c: 'Équilibre d’abord, charge ensuite.', alt: [['fentes_arriere', 'Moins d’équilibre requis']] });
E('step_up', 'Montée sur banc (step-up)', { fam: 'genou', pat: 'squat', pri: ['quadriceps', 'fessiers'], eq: ['banc'], cmp: true, uni: true, m: 'reps', ld: 'bodyweight', inc: 1, z: ['genoux', 'chevilles'], mv: ['unipodal'],
  d: 'Monter sur un banc ou une marche en poussant sur la jambe d’appui.', c: 'Hauteur modérée, pousser sur le talon.', alt: [['presse_cuisses', 'Deux jambes']] });
E('leg_extension', 'Leg extension', { fam: 'extension', pat: 'extension_jambe', pri: ['quadriceps'], eq: ['machines'], z: ['genoux'], mv: ['extension_genou_chargee'],
  d: 'Assis, tendre les jambes contre un boudin.', c: 'Réglage de l’axe au niveau du genou, montée contrôlée.', alt: [['presse_cuisses', 'Polyarticulaire'], ['chaise_murale', 'Isométrique']] });
E('chaise_murale', 'Chaise contre le mur', { fam: 'genou', pat: 'extension_jambe', pri: ['quadriceps'], sec: ['fessiers'], eq: [], m: 'time', ld: 'bodyweight', inc: 5, z: ['genoux'],
  d: 'Dos au mur, cuisses vers l’horizontale, tenir la position.', c: 'Angle de genou confortable, noter l’angle en variante.', alt: [['leg_extension', 'Dynamique, chargé']] });

// ---------- Dominante hanche ----------
E('sdt_roumain_halteres', 'Soulevé de terre jambes semi-tendues (haltères)', { fam: 'hanche', pat: 'charniere', pri: ['ischios', 'fessiers'], sec: ['lombaires'], eq: ['halteres'], cmp: true, ld: 'per_dumbbell', inc: 2, z: ['dos', 'hanches'], mv: ['flexion_dos'],
  d: 'Pencher le buste en reculant les hanches, haltères le long des cuisses.', c: 'Dos neutre, s’arrêter quand l’arrière des cuisses tire.', alt: [['hip_thrust_machine', 'Sans flexion du buste'], ['sdt_roumain_barre', 'Barre']] });
E('sdt_roumain_barre', 'Soulevé de terre roumain (barre)', { fam: 'hanche', pat: 'charniere', pri: ['ischios', 'fessiers'], sec: ['lombaires', 'avant_bras'], eq: ['barre'], cmp: true, lvl: 2, z: ['dos', 'hanches'], mv: ['flexion_dos'],
  d: 'Charnière de hanche avec barre.', c: 'Barre proche des jambes.', alt: [['sdt_roumain_halteres', 'Plus léger']] });
E('souleve_de_terre', 'Soulevé de terre', { fam: 'hanche', pat: 'charniere', pri: ['fessiers', 'ischios', 'lombaires'], sec: ['quadriceps', 'haut_dos', 'avant_bras'], eq: ['barre'], cmp: true, lvl: 3, z: ['dos', 'hanches', 'genoux'], mv: ['flexion_dos', 'charge_axiale'],
  d: 'Soulever une barre du sol jusqu’à la position debout.', c: 'Technique encadrée recommandée.', w: 'Mouvement technique : progresser prudemment.', alt: [['sdt_roumain_halteres', 'Plus accessible']] });
E('hip_thrust_machine', 'Hip thrust (machine)', { fam: 'hanche', pat: 'charniere', pri: ['fessiers'], sec: ['ischios'], eq: ['machines'], cmp: true, inc: 5, z: ['hanches'],
  d: 'Dos en appui, pousser le bassin vers le haut contre un boudin.', c: 'Serrer les fessiers en haut, menton rentré.', alt: [['hip_thrust_barre', 'Barre'], ['pont_fessier', 'Au sol']] });
E('hip_thrust_barre', 'Hip thrust à la barre', { fam: 'hanche', pat: 'charniere', pri: ['fessiers'], sec: ['ischios'], eq: ['barre', 'banc'], cmp: true, lvl: 2, inc: 5, z: ['hanches'],
  d: 'Haut du dos sur un banc, barre sur les hanches, monter le bassin.', c: 'Utiliser une mousse de protection.', alt: [['hip_thrust_machine', 'Plus simple à installer']] });
E('pont_fessier', 'Pont fessier', { fam: 'hanche', pat: 'fessiers', pri: ['fessiers'], sec: ['ischios'], eq: [], m: 'reps', ld: 'bodyweight', inc: 1, z: ['hanches'],
  d: 'Allongé sur le dos, pieds au sol, monter le bassin.', c: 'Pause en haut.', alt: [['hip_thrust_machine', 'Chargé']] });
E('kettlebell_swing', 'Kettlebell swing', { fam: 'hanche', pat: 'charniere', pri: ['fessiers', 'ischios'], sec: ['lombaires', 'cardio'], eq: ['kettlebell'], cmp: true, lvl: 2, inc: 4, z: ['dos', 'hanches'], mv: ['flexion_dos'],
  d: 'Balancer une kettlebell par une extension explosive des hanches.', c: 'Le mouvement vient des hanches, pas des bras.', alt: [['sdt_roumain_halteres', 'Lent et contrôlé']] });
E('extension_lombaire', 'Extension lombaire (banc à 45°)', { fam: 'hanche', pat: 'charniere', pri: ['lombaires', 'fessiers'], sec: ['ischios'], eq: ['banc'], m: 'reps', ld: 'bodyweight', inc: 1, z: ['dos'], mv: ['flexion_dos'],
  d: 'Sur le banc à lombaires, descendre le buste puis remonter jusqu’à l’alignement.', c: 'Ne pas dépasser l’alignement du corps.', alt: [['pont_fessier', 'Au sol']] });
E('abduction_machine', 'Abduction (machine)', { fam: 'hanche', pat: 'fessiers', pri: ['fessiers'], eq: ['machines'], z: ['hanches'],
  d: 'Assis, écarter les cuisses contre les coussins.', c: 'Mouvement lent, pause en ouverture.', alt: [['kickback_fessier', 'Extension de hanche']] });
E('adduction_machine', 'Adduction (machine)', { fam: 'hanche', pat: 'adducteurs', pri: ['adducteurs'], eq: ['machines'], z: ['hanches'],
  d: 'Assis, rapprocher les cuisses contre les coussins.', c: 'Ouverture de départ confortable.', alt: [['abduction_machine', 'Mouvement inverse']] });
E('kickback_fessier', 'Extension de hanche à la poulie', { fam: 'hanche', pat: 'fessiers', pri: ['fessiers'], sec: ['ischios'], eq: [['poulies', 'machines']], uni: true, z: ['hanches'],
  d: 'Debout, cheville attachée, pousser la jambe vers l’arrière.', c: 'Bassin fixe, sans cambrer.', alt: [['hip_thrust_machine', 'Deux jambes']] });

// ---------- Flexion de jambe ----------
E('leg_curl', 'Leg curl (machine)', { fam: 'flexion', pat: 'flexion_jambe', pri: ['ischios'], sec: ['mollets'], eq: ['machines'], z: ['genoux'],
  d: 'Fléchir les genoux contre un boudin, assis ou allongé selon la machine.', c: 'Axe de la machine aligné avec le genou, retour lent.',
  alt: [['leg_curl_assis', 'Version assise'], ['leg_curl_allonge', 'Version allongée'], ['sdt_roumain_halteres', 'Dominante hanche']] });
E('leg_curl_assis', 'Leg curl assis', { fam: 'flexion', pat: 'flexion_jambe', pri: ['ischios'], eq: ['machines'], z: ['genoux'],
  d: 'Assis, jambes tendues sous un boudin, fléchir les genoux.', c: 'Cuisses bloquées par le rembourrage.', alt: [['leg_curl_allonge', 'Allongé']] });
E('leg_curl_allonge', 'Leg curl allongé', { fam: 'flexion', pat: 'flexion_jambe', pri: ['ischios'], sec: ['mollets'], eq: ['machines'], z: ['genoux'],
  d: 'Allongé sur le ventre, ramener les talons vers les fessiers.', c: 'Hanches plaquées sur le banc.', alt: [['leg_curl_assis', 'Assis']] });

// ---------- Mollets ----------
E('mollets_debout', 'Mollets debout (machine)', { fam: 'extension', pat: 'mollets', pri: ['mollets'], eq: ['machines'], inc: 5, z: ['chevilles'],
  d: 'Monter sur la pointe des pieds sous les épaulières.', c: 'Amplitude complète, pause en haut.', alt: [['mollets_assis', 'Assis'], ['mollets_presse', 'À la presse']] });
E('mollets_assis', 'Mollets assis (machine)', { fam: 'extension', pat: 'mollets', pri: ['mollets'], eq: ['machines'], inc: 5, z: ['chevilles'],
  d: 'Assis, genoux sous le boudin, monter les talons.', c: 'Mouvement lent.', alt: [['mollets_debout', 'Debout']] });
E('mollets_presse', 'Mollets à la presse', { fam: 'extension', pat: 'mollets', pri: ['mollets'], eq: ['machines'], inc: 5, z: ['chevilles'],
  d: 'À la presse à cuisses, pousser la plateforme avec la pointe des pieds.', c: 'Jambes presque tendues, sécurité de la presse prête.', alt: [['mollets_debout', 'Machine dédiée']] });
E('mollets_poids_corps', 'Mollets sur une marche', { fam: 'extension', pat: 'mollets', pri: ['mollets'], eq: [], uni: false, m: 'reps', ld: 'bodyweight', inc: 2, z: ['chevilles'],
  d: 'Sur le bord d’une marche, monter et descendre les talons.', c: 'Se tenir pour l’équilibre.', alt: [['mollets_debout', 'Chargé']] });

// ---------- Abdominaux et gainage ----------
E('abdos_machine', 'Abdominaux (machine)', { fam: 'flexion', pat: 'abdos', pri: ['abdominaux'], eq: ['machines'], z: ['dos'], mv: ['flexion_tronc'],
  d: 'Machine d’enroulement du buste contre résistance.', c: 'Enrouler le dos, expirer en descendant les côtes vers le bassin.', alt: [['crunch_poulie', 'Poulie'], ['gainage_planche', 'Sans flexion du dos']] });
E('crunch', 'Crunch au sol', { fam: 'flexion', pat: 'abdos', pri: ['abdominaux'], eq: [], m: 'reps', ld: 'bodyweight', inc: 2, z: ['dos'], mv: ['flexion_tronc'],
  d: 'Allongé, enrouler le haut du buste.', c: 'Ne pas tirer sur la nuque.', alt: [['dead_bug', 'Sans flexion du dos']] });
E('crunch_poulie', 'Crunch à la poulie haute', { fam: 'flexion', pat: 'abdos', pri: ['abdominaux'], eq: ['poulies'], z: ['dos'], mv: ['flexion_tronc'],
  d: 'À genoux face à la poulie, enrouler le buste en tirant la corde.', c: 'Les hanches restent fixes.', alt: [['abdos_machine', 'Machine']] });
E('releve_jambes_chaise', 'Relevé de jambes à la chaise romaine', { fam: 'flexion', pat: 'abdos', pri: ['abdominaux'], sec: ['obliques'], eq: ['machines'], lvl: 2, m: 'reps', ld: 'bodyweight', inc: 1, z: ['dos', 'hanches'], mv: ['flexion_hanche_profonde'],
  d: 'En appui sur les avant-bras, monter les genoux vers la poitrine.', c: 'Enrouler le bassin, sans balancer.', alt: [['dead_bug', 'Au sol']] });
E('releve_jambes_suspendu', 'Relevé de genoux suspendu', { fam: 'flexion', pat: 'abdos', pri: ['abdominaux'], sec: ['avant_bras'], eq: ['barre_traction'], lvl: 3, m: 'reps', ld: 'bodyweight', inc: 1, z: ['epaules', 'hanches'], mv: ['prise_suspension', 'flexion_hanche_profonde'],
  d: 'Suspendu à la barre, monter les genoux.', c: 'Pas d’élan.', alt: [['releve_jambes_chaise', 'Avec appui']] });
E('gainage_planche', 'Planche (gainage ventral)', { fam: 'gainage', pat: 'gainage', pri: ['abdominaux'], sec: ['epaules', 'fessiers'], eq: [], m: 'time', ld: 'bodyweight', inc: 5, z: ['epaules', 'poignets', 'dos'],
  d: 'En appui sur les avant-bras et les pieds, corps aligné.', c: 'Bassin dans l’axe, respiration régulière.', alt: [['gainage_genoux', 'Sur les genoux'], ['dead_bug', 'Allongé']] });
E('gainage_genoux', 'Planche sur les genoux', { fam: 'gainage', pat: 'gainage', pri: ['abdominaux'], eq: [], m: 'time', ld: 'bodyweight', inc: 5, z: ['genoux'],
  d: 'Planche avec appui sur les avant-bras et les genoux.', c: 'Alignement épaules-hanches-genoux.', alt: [['gainage_planche', 'Version complète']] });
E('gainage_lateral', 'Gainage latéral', { fam: 'gainage', pat: 'gainage', pri: ['obliques'], sec: ['abdominaux', 'fessiers'], eq: [], uni: true, m: 'time', ld: 'bodyweight', inc: 5, z: ['epaules'],
  d: 'Sur le côté, en appui sur un avant-bras, bassin levé.', c: 'Chaque côté ; genoux au sol pour simplifier.', alt: [['pallof_press', 'Debout, anti-rotation']] });
E('dead_bug', 'Dead bug', { fam: 'gainage', pat: 'gainage', pri: ['abdominaux'], eq: [], m: 'reps', ld: 'bodyweight', inc: 2,
  d: 'Sur le dos, bras et jambes en l’air, allonger bras et jambe opposés.', c: 'Bas du dos plaqué au sol.', alt: [['bird_dog', 'À quatre pattes']] });
E('bird_dog', 'Bird dog', { fam: 'gainage', pat: 'gainage', pri: ['lombaires', 'abdominaux'], sec: ['fessiers'], eq: [], m: 'reps', ld: 'bodyweight', inc: 2, z: ['poignets', 'genoux'], mv: ['appui_poignets'],
  d: 'À quatre pattes, tendre un bras et la jambe opposée.', c: 'Dos stable comme une table.', alt: [['dead_bug', 'Sur le dos']] });
E('pallof_press', 'Pallof press', { fam: 'gainage', pat: 'gainage', pri: ['obliques', 'abdominaux'], eq: ['poulies'], inc: 1.25,
  d: 'De profil à la poulie, pousser la poignée devant soi sans tourner.', c: 'Résister à la rotation.', alt: [['gainage_lateral', 'Au sol']] });
E('marche_fermier', 'Marche du fermier', { fam: 'gainage', pat: 'gainage', pri: ['avant_bras', 'trapezes'], sec: ['abdominaux', 'fessiers'], eq: [['halteres', 'kettlebell']], cmp: true, m: 'time', ld: 'per_dumbbell', inc: 5,
  d: 'Marcher en tenant une charge lourde dans chaque main. Noter la charge en variante.', c: 'Buste droit, pas réguliers.', alt: [['suspension', 'Prise statique']] });

// ---------- Cardio (séance) ----------
const CARDIO = (id, name, o) => E(id, name, { cat: 'cardio', fam: 'locomotion', pat: 'cardio', pri: ['cardio'], m: 'cardio', ld: 'none', inc: 0, ...o });
CARDIO('marche', 'Marche', { eq: [], z: ['chevilles'], d: 'Marche, sur tapis ou à l’extérieur, sans précision supplémentaire.', c: 'Allure où l’on peut parler en phrases complètes.', alt: [['marche_tapis', 'Sur tapis, réglages mesurés']] });
CARDIO('marche_tapis', 'Marche sur tapis', { eq: ['tapis'], z: ['chevilles'], d: 'Marche sur tapis : vitesse et inclinaison réglables.', c: 'Ne pas se tenir aux barres pour un effort représentatif.', alt: [['tapis_incline', 'Inclinaison élevée'], ['velo_salle', 'Sans impact']] });
CARDIO('tapis_incline', 'Marche inclinée sur tapis', { eq: ['tapis'], z: ['chevilles', 'dos'], d: 'Marche à forte inclinaison, allure modérée.', c: 'Augmenter l’inclinaison progressivement.', alt: [['marche_tapis', 'Moins incliné'], ['elliptique', 'Sans impact']] });
CARDIO('course_tapis', 'Course sur tapis', { eq: ['tapis'], lvl: 2, z: ['genoux', 'chevilles', 'hanches'], mv: ['impact'], d: 'Course ou alternance marche/course sur tapis.', c: 'Commencer par de courts intervalles de course entre des minutes de marche.', alt: [['marche_tapis', 'Sans impact de course'], ['elliptique', 'Mouvement proche, sans impact']] });
CARDIO('velo_salle', 'Vélo de salle', { eq: ['velo_salle'], z: ['genoux'], d: 'Vélo droit ou semi-allongé.', c: 'Selle réglée pour une jambe presque tendue en bas.', alt: [['elliptique', 'Debout'], ['rameur', 'Haut et bas du corps']] });
CARDIO('elliptique', 'Elliptique', { eq: ['elliptique'], z: ['genoux', 'hanches'], d: 'Mouvement de course sans impact.', c: 'Garder le buste droit.', alt: [['velo_salle', 'Assis']] });
CARDIO('rameur', 'Rameur', { eq: ['rameur'], lvl: 2, z: ['dos', 'genoux'], mv: ['flexion_genou_profonde'], d: 'Tirage combiné jambes, dos et bras.', c: 'Ordre : jambes, buste, bras ; retour dans l’ordre inverse.', alt: [['velo_salle', 'Moins technique']] });
CARDIO('cardio_autre', 'Autre cardio', { eq: [], d: 'Cardio non listé (stepper, ski erg…). Préciser en variante.', c: '', alt: [] });

export const LIBRARY = LIB;
export const LIBRARY_BY_ID = Object.fromEntries(LIB.map(e => [e.id, e]));

// Types de cardio intégré à une séance → exercice de bibliothèque
export const CARDIO_TYPES = {
  marche: { label: 'Marche', exerciseId: 'marche' },
  marche_tapis: { label: 'Marche sur tapis', exerciseId: 'marche_tapis' },
  tapis_incline: { label: 'Tapis incliné', exerciseId: 'tapis_incline' },
  course: { label: 'Course', exerciseId: 'course_tapis' },
  velo: { label: 'Vélo', exerciseId: 'velo_salle' },
  elliptique: { label: 'Elliptique', exerciseId: 'elliptique' },
  rameur: { label: 'Rameur', exerciseId: 'rameur' },
  autre: { label: 'Autre', exerciseId: 'cardio_autre' },
};

// Activités hors salle
export const ACTIVITY_TYPES = {
  marche: 'Marche', randonnee: 'Randonnée', course: 'Course', velo: 'Vélo', velo_electrique: 'Vélo à assistance électrique',
  natation: 'Natation', autre: 'Autre activité',
};

export const INTENSITIES = { legere: 'Légère', moderee: 'Modérée', soutenue: 'Soutenue' };

// Ressenti par exercice : répétitions encore possibles (explication simple).
export const EFFORTS = {
  facile: { label: 'Facile', help: 'J’aurais pu faire 4 répétitions de plus ou davantage.' },
  maitrise: { label: 'Maîtrisé', help: 'Il me restait 2 ou 3 répétitions en réserve.' },
  difficile: { label: 'Difficile', help: 'Il me restait au plus une répétition.' },
  maximal: { label: 'Maximal', help: 'Impossible de faire une répétition de plus.' },
};

export function checkEquipment(ex, equipment) {
  const have = new Set(equipment || []);
  return (ex.eq || []).every(g => Array.isArray(g) ? g.some(x => have.has(x)) : have.has(g));
}

export function equipmentLabel(ex) {
  if (!ex.eq || !ex.eq.length) return 'Aucun matériel';
  return ex.eq.map(g => Array.isArray(g) ? g.map(x => EQUIPMENT[x] || x).join(' ou ') : (EQUIPMENT[g] || g)).join(', ');
}
