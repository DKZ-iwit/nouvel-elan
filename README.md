# Nouvel Élan — version 2.0.0

Application web progressive (PWA) de suivi sportif : séances en salle, activités hors salle, mesures, calories d'activité estimées, graphiques et suggestions de séances adaptées. Elle s'installe sur l'écran d'accueil d'un téléphone, fonctionne hors connexion et garde toutes les données **sur l'appareil** (IndexedDB). Aucun compte, aucun serveur applicatif, aucune clé d'API, aucune publicité, aucune mesure d'audience.

## Principes

- **Une installation = des données locales.** Chaque personne installe la même application sur son téléphone et y crée son profil. Rien n'est synchronisé entre appareils.
- **Plusieurs profils** peuvent coexister sur un même appareil. Ils sont séparés fonctionnellement, mais pas protégés par un mot de passe.
- **Transfert et sauvegarde** par export puis import d'un fichier JSON (Profil > Réglages et sauvegardes).
- **Suggestions calculées localement**, par des règles explicites et affichées à l'utilisateur.
- **Aucune donnée inventée** : ce qui est inconnu reste inconnu, n'est jamais converti en zéro et est signalé dans les totaux comme « partiel ».

## Nouveautés de la version 2

- **Nouvelle direction visuelle** : fond ivoire, texte anthracite, pétrole profond, accents corail et doré ; mode sombre chaleureux ; cartes différenciées selon leur rôle.
- **Accueil centré sur l'action** : « Ta prochaine séance » avec « Commencer » et « Adapter », résumé compact de la semaine, compagnon, objectif personnel s'il est renseigné, actions rapides. Le bouton flottant a disparu ; un menu « Ajouter » est disponible dans l'historique.
- **Séance plus fluide** : démarrage rapide (temps, énergie, point d'attention), exercice en cours au premier plan avec « Exercice 2 sur 7 », valeurs précédentes reprises en un geste, repos affiché dans la barre du haut, vue d'ensemble pour naviguer et réordonner, bilan de fin court avec retour facultatif.
- **Progrès** : synthèse puis catégories (Régularité, Musculation, Cardio et activités, Mesures, Records), explications derrière le bouton ⓘ, records en cartes.
- **Profil** en rubriques : objectifs, programme, confort et points d'attention, matériel et exercices, compagnon, mesures, réglages.
- **Compagnons** : gorille, ours, chat, chien ou loutre, avec une garde-robe en trois collections.
- **Corrections** :
  - progression des charges examinant toutes les séries ;
  - assistance jamais négative ;
  - remplacements filtrés ;
  - durée de séance respectant le temps disponible ;
  - sauvegarde confirmée avant mise à jour.

## Mettre à jour depuis la version 1 sans perdre de données

1. Remplacer **tous** les fichiers du dépôt par ceux de l'archive (en conservant `.nojekyll`). La base IndexedDB garde le même nom : aucune donnée n'est stockée dans les fichiers.
2. Sur chaque téléphone, ouvrir l'application avec une connexion. Le message « Nouvelle version disponible » apparaît ; toucher « Mettre à jour ».
3. Avant d'activer la nouvelle version, l'application enregistre les modifications en attente et **attend la confirmation d'IndexedDB**. Si l'écriture échoue (espace saturé par exemple), la mise à jour est reportée et un message l'explique : rien n'est perdu.
4. Une séance en cours est retrouvée telle quelle, y compris les séries non validées.
5. Le compagnon n'est pas imposé : une carte « Choisis ton compagnon » apparaît sur l'accueil (bouton « Plus tard » disponible). À l'adoption, les points sont calculés à partir de l'historique existant et une seule synthèse de bienvenue s'affiche.

Conseil : exporter une sauvegarde (Profil > Réglages et sauvegardes) avant la mise à jour reste une bonne précaution.

Les exports de la version 1 (format 1) restent importables. Les nouveaux exports (format 2) contiennent aussi le compagnon de chaque profil. Ils ne sont pas lisibles par une application restée en version 1.

## Arborescence

```
nouvel-elan/
├── index.html               Page unique, politique de sécurité du contenu stricte
├── manifest.webmanifest     Manifeste d'installation (chemins relatifs)
├── sw.js                    Service worker : cache hors connexion et mises à jour
├── .nojekyll                Désactive le traitement Jekyll de GitHub Pages
├── css/app.css              Styles (clair/sombre, mobile d'abord)
├── icons/                   Icônes locales (192, 512, masquable, Apple, favicon)
└── js/
    ├── config.js            Nom, couleurs, versions : à modifier ici
    ├── app.js               Démarrage, routes, navigation
    ├── router.js            Routeur par fragment (#/…)
    ├── platform.js          Thème et service worker
    ├── state.js             État en mémoire, profil actif
    ├── db.js                IndexedDB versionnée + migrations
    ├── io.js                Export, import validé, fusion, CSV
    ├── util.js              DOM sûr, nombres français, dates
    ├── data/exercises.js    Bibliothèque de 103 exercices et référentiels
    ├── data/programs.js     Modèles de programme par objectif
    ├── engine/program.js    Construction de la trame de programme
    ├── engine/suggest.js    Sélection et adaptation des séances
    ├── engine/calories.js   Estimation des calories d'activité
    ├── engine/stats.js      Volume, records, régularité, minutes actives
    ├── engine/companion.js  Points, niveaux et déblocages du compagnon
    ├── companion/art.js     Dessin SVG des cinq animaux (squelette commun)
    ├── companion/wardrobe.js Garde-robe : 30 pièces en 3 collections + 6 décors
    ├── companion/view.js    Animations, réactions, célébrations
    ├── ui/components.js     Composants d'interface
    ├── ui/charts.js         Graphiques SVG (sans bibliothèque externe)
    └── views/*.js           Écrans
```

Aucune compilation : ce sont des fichiers statiques. Aucune ressource n'est chargée depuis un CDN, une police distante ou une image distante.

## Publier sur GitHub Pages

1. Créer un dépôt (par exemple `nouvel-elan`) et y déposer **le contenu** du dossier `nouvel-elan/` à la racine du dépôt, y compris le fichier caché `.nojekyll`.
2. Dans le dépôt : **Settings > Pages > Build and deployment > Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Après une à deux minutes, l'application est disponible à l'adresse `https://<utilisateur>.github.io/nouvel-elan/`.

Tous les chemins sont relatifs : l'application fonctionne dans un sous-répertoire de dépôt comme à la racine d'un domaine. HTTPS (fourni par GitHub Pages) est nécessaire pour le service worker et l'installation.

> Ne déposez jamais de fichier d'export personnel dans le dépôt : un dépôt GitHub Pages est public.

### Mettre à jour

1. Remplacer les fichiers modifiés dans le dépôt.
2. **Incrémenter `CACHE_VERSION`** dans `sw.js` (et, par cohérence, `version` dans `js/config.js` ; la version actuelle est `v2.0.0`). Sans ce changement, les téléphones continuent d'utiliser l'ancienne version en cache.
3. À l'ouverture suivante, l'application affiche « Nouvelle version disponible ». Le bouton « Mettre à jour » enregistre d'abord la séance en cours, puis recharge. Les données IndexedDB ne sont jamais touchées par la mise à jour du cache. Une séance en cours est retrouvée telle quelle.

## Installer sur un téléphone

- **Android (Chrome, Samsung Internet)** : ouvrir l'adresse, puis menu ⋮ > « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **iPhone (Safari)** : ouvrir l'adresse dans Safari, bouton Partager > « Sur l'écran d'accueil ».

Ouvrir l'application une première fois avec une connexion : elle se met en cache et fonctionne ensuite hors connexion.

Sur iPhone, Safari peut effacer les données d'un site non installé et inutilisé pendant plusieurs semaines. L'installation sur l'écran d'accueil et des exports réguliers protègent l'historique. Le bouton « Demander un stockage protégé » (Réglages) sollicite la persistance auprès du navigateur.

## Importer un fichier personnel

Un fichier d'export (`.json`) se charge depuis l'écran d'accueil initial (« Importer une sauvegarde ») ou depuis Profil > Réglages et sauvegardes > « Importer une sauvegarde ».

1. Copier le fichier sur le téléphone (par exemple dans Téléchargements ou Fichiers).
2. Dans l'application, choisir « Importer une sauvegarde », puis sélectionner le fichier.
3. Vérifier l'aperçu (profils, nombre de séances, d'activités et de mesures) et confirmer.

Lorsque l'appareil contient déjà des données, deux modes sont proposés :

- **Ajouter ou fusionner** : les profils présents sont conservés. Pour un profil déjà présent, on choisit « Fusionner » (aucun doublon : les éléments identiques sont ignorés, la version la plus récente de chaque élément est retenue), « Profil séparé » (copie avec de nouveaux identifiants) ou « Ignorer ».
- **Restaurer** : toutes les données de l'appareil sont remplacées, après confirmation.

Le fichier est validé avant import (provenance, version de format, dates, valeurs numériques). Les textes sont toujours affichés comme du texte : aucun HTML ni script importé n'est exécuté.

## Sauvegardes et exports

- **Export complet** (tous les profils) ou **export d'un profil** au format JSON versionné (`format: 2` ; les fichiers au format 1 restent acceptés).
- **Exports CSV** des séances (une ligne par série), des activités et des mesures, avec séparateur `;` et décimales à virgule, lisibles dans un tableur français.
- La date du dernier export est affichée et un rappel discret apparaît sur l'accueil après le délai choisi (14 jours par défaut).

Effacer les données du navigateur ou désinstaller l'application peut supprimer l'historique : seul un export permet de le restaurer.

## Personnaliser le nom et les couleurs

Modifier `js/config.js` (`APP.name`, palettes `COLORS.light` et `COLORS.dark`, couleurs de profil). Le nom affiché sous l'icône du téléphone et la couleur de démarrage se règlent dans `manifest.webmanifest` et dans les balises `<title>` et `apple-mobile-web-app-title` de `index.html`. Penser ensuite à incrémenter `CACHE_VERSION`.

## Moteur de personnalisation

Tout est calculé sur l'appareil, par des règles lisibles dans `js/engine/` et `js/data/programs.js`.

### Trame de programme

À partir de l'objectif principal et des objectifs secondaires, du niveau, de la fréquence, de la durée, du matériel, des préférences, des exclusions et des points d'attention :

- **Répartition** : 1 à 3 séances par semaine en corps complet (A, B, C), 4 en haut et bas du corps, 5 et 6 en combinaisons. Des jours indicatifs sont proposés.
- **Créneaux** : chaque journée contient des rôles (dominante genou, tirage vertical, poussée horizontale…) classés « essentiel », « important » ou « facultatif ».
- **Paramètres propres à chaque objectif** :

| Objectif | Répétitions | Séries | Repos (s) | Cardio par séance |
|---|---|---|---|---|
| Remise en forme | 10–15 | 2–3 | 60–90 | 15 min, modéré |
| Perte de poids | 8–12 | 3 | 60–90 | 25 min, faible à modéré |
| Renforcement | 10–12 | 2–3 | 60–90 | 10 min |
| Prise de muscle | 8–12 | 3–4 | 75–120 | 10 min, léger |
| Force | 4–6 (accessoires 8–12) | 3–5 | 150–180 | 10 min, léger |
| Endurance | 12–20 | 2–3 | 30–60 | 30 min |

  Les objectifs secondaires modifient ces paramètres de manière explicite. Par exemple, une perte de poids avec maintien musculaire fait passer les exercices d'isolation en priorité 2 et autorise jusqu'à 4 séries sur les mouvements principaux. Le niveau débutant ou reprise limite à 2–3 séries et privilégie les machines.
- **Informations inconnues** : si la fréquence, le niveau ou la durée manquent, le programme n'est pas construit. L'application les demande au lieu de les inventer.

### Sélection des exercices

1. **Filtres obligatoires** : matériel disponible, exercices exclus, exercices et mouvements déclarés gênants dans « Confort et points d'attention », niveau technique. Un exercice déjà pratiqué ou déclaré bien toléré reste admissible.
2. **Classement des exercices admissibles** : historique d'utilisation, préférés, bien tolérés, stabilité par rapport au programme précédent, demandes de remplacement, rôle polyarticulaire.

Les choix restent stables d'une séance à l'autre pour rendre la progression mesurable. Une variante n'est introduite que pour un besoin concret : matériel indisponible, exclusion, demande de remplacement, choix manuel dans « Mon programme » ou évolution du programme.

**Aucune interdiction n'est déduite d'une zone fragile déclarée.** Seuls les mouvements ou exercices explicitement indiqués comme gênants sont écartés. Si une zone est déclarée sans précision, l'application pose une question courte (« certains mouvements te gênent-ils ? »).

### Adaptation de la séance du jour

- **Journée** : la suivante dans l'ordre du programme. Une séance manquée n'est pas rattrapée ni cumulée. Après plus de deux semaines sans séance, les charges sont conservées.
- **Temps disponible (30, 45, 60, 90 min)** :
  - **Ce que compte l'estimation** :
    - 7 min d'échauffement, dont les séries légères ;
    - pour chaque série : 40 s d'effort, ou la durée tenue ;
    - les repos entre séries ;
    - 1,5 min de transition par exercice ;
    - le cardio.
  - **Ajustement** : on retire d'abord les exercices facultatifs, puis on raccourcit le cardio jusqu'à un minimum, on réduit les séries des exercices secondaires, on retire les exercices importants, et enfin on réduit les séries des exercices principaux.
  - **Garanties** : la durée affichée est arrondie à la minute supérieure, jamais inférieure. Si les exercices essentiels dépassent malgré tout le temps choisi, l'application le signale clairement.
- **Forme** : la fatigue entraîne une série de moins, aucune augmentation de charge, un cardio léger et la suppression des exercices facultatifs.
- **Point d'attention du jour** : il est demandé à chaque séance. Une gêne conserve la charge des mouvements concernés. Une douleur suspend la progression sur les mouvements qui sollicitent la zone, propose une alternative qui l'épargne quand elle existe et invite à demander un avis adapté. Sans réponse, une douleur indiquée dans le profil est prise en compte par prudence. Une absence de douleur passée n'est jamais considérée comme valable pour le jour même.
- **Activités hors salle** : une sortie soutenue ou longue (course, randonnée, vélo) la veille ou le jour même réduit le volume des jambes. Les activités comptent dans l'objectif cardio de la semaine selon leur intensité. Une activité légère, ou une sortie à vélo électrique non soutenue, compte pour moitié.
- **Muscles sollicités récemment** : au-delà de 6 séries de travail en moins de 48 h, une série de moins est proposée sur les exercices secondaires de ces muscles.
- **Retours** : deux séances de suite jugées trop difficiles retirent une série aux exercices secondaires. Deux séances jugées trop faciles ajoutent une série aux exercices principaux. Une seule séance ne change rien.
- **Orientation** : « davantage de haut du corps, de bas du corps ou de cardio ».

### Types de séries

Le bouton à gauche de chaque série change son type :

- **chiffre** : série de travail ;
- **É** : échauffement, exclu de tous les calculs ;
- **M** : montée en charge ;
- **A** : série allégée.

Les séries M et A comptent dans le volume. Elles sont décrites dans les conseils mais ne bloquent pas la progression.

### Remplacement d'un exercice

Le sélecteur de remplacement applique les mêmes filtres que le programme :

- exclusions ;
- exercices et mouvements déclarés gênants ;
- matériel ;
- niveau ;
- douleur déclarée du jour ;
- rôle de l'exercice dans la séance.

Les alternatives compatibles du même rôle sont proposées en premier. Une exclusion n'est jamais contournée. Les autres conflits ne sont visibles qu'à la demande et exigent une confirmation explicite. Aucune charge n'est transférée d'un exercice à l'autre.

### Progression des charges (double progression)

- **Toutes les séries de travail sont examinées**, y compris les plus légères : sans marquage explicite (« montée » ou « allégée »), une série plus légère sous la plage bloque la progression. Le conseil décrit exactement les séries analysées. Exemple : avec 2 × 12 à 50 kg puis 1 × 8 à 40 kg, la charge de 50 kg est conservée.
- Si une charge manque ou si le nombre de séries est inconnu, la charge est conservée et l'application explique ce qui manque.
- On garde la charge tant que le haut de la plage de répétitions n'est pas atteint sur toutes les séries de travail.
- Une fois la plage atteinte avec un ressenti déclaré « Facile » ou « Maîtrisé », on ajoute le plus petit incrément disponible (réglable par exercice). Si l'effort n'est pas déclaré, l'augmentation est seulement proposée en option.
- Deux séances comparables de suite sous la plage ou au maximum de l'effort entraînent une légère baisse proposée.
- **Traction et dips assistés** : la progression consiste à réduire l'assistance, sans jamais descendre sous 0 kg. Arrivé à 0 kg, l'application conseille d'ajouter des répétitions ou de passer à la traction libre.
- **Exercices chronométrés** : on ajoute 5 s.
- **Nouvel exercice** : l'application propose de déterminer une charge de départ confortable. Elle n'invente jamais de poids.
- **Comparaisons** : elles se font sur le même exercice et la même variante ou machine. Aucune charge n'est transférée d'une machine ou d'une variante à une autre.
- **Poids corporel** : une perte de poids ne déclenche jamais automatiquement plus de cardio ni plus de charge.

## Compagnons

### Choix et personnalisation

- **Cinq animaux** : gorille, ours, chat, chien, loutre. Le choix est purement esthétique : tous suivent les mêmes règles, ont dix niveaux et cinq étapes d'évolution, et peuvent porter toutes les pièces.
- **Personnalisation** : chaque profil a son propre compagnon, avec un nom, des couleurs de pelage et de museau, et une tenue.
  - On peut changer d'animal à tout moment, sans perdre les points, le niveau ni les pièces débloquées.
  - On peut masquer le compagnon de l'accueil et des séances, et couper ses animations. Celles-ci sont aussi coupées automatiquement si le téléphone demande de réduire les animations.
- **Dessin** : les compagnons sont dessinés en SVG local, sans service distant. Les cinq animaux partagent un squelette commun (épaules, taille, hanches, bras, tête) aux proportions propres à chacun. Les vêtements sont découpés sur la silhouette de l'animal, ce qui les ajuste aux cinq morphologies sans masquer le visage.

### Garde-robe

- **Trois collections de style** — féminin, masculin et non genré — de dix pièces chacune, plus six décors. Elles comprennent :
  - tenues complètes, hauts et bas ;
  - vestes et sweats ;
  - bandeaux et couvre-chefs ;
  - lunettes, sacs et gourde ;
  - tapis de yoga, kettlebell et vélo.
- **Libre choix** : les styles concernent seulement la garde-robe. Ils ne déterminent ni le genre de l'utilisateur ni la progression, et aucun style n'est attribué automatiquement. Les filtres (Tout, Féminin, Masculin, Non genré) servent à parcourir : toutes les pièces se mélangent librement.
- **Tenue complète** : elle remplace le haut et le bas portés, et inversement. Un message l'indique.
- **Essayage** : toute pièce, même verrouillée, peut être essayée en aperçu. Une pièce débloquée s'équipe ou se retire librement.

### Évolution

- **Déblocages** : chaque niveau débloque une pièce dans chacune des trois collections. Les niveaux 2, 4, 6, 8 et 10 ajoutent aussi un décor.
- **Étapes** : un passage d'étape a lieu tous les deux niveaux. Il apporte des expressions, des gestes de réaction (salut, bravo, victoire) et des détails de décor (plante, fanions, soleil, étincelles).
- **Silhouette** : elle ne change jamais. Aucune réussite n'est associée à un corps plus mince ou plus musclé.

### Points et niveaux

| Action vérifiable | Points | Limite |
|---|---|---|
| Séance en salle terminée (au moins une série ou un cardio) | 10 | 2 par jour |
| Activité hors salle d'au moins 10 minutes (dont vélo électrique) | 6 | 2 par jour |
| Semaine active (au moins une séance ou activité) | 5 | 1 par semaine |
| Objectif de séances de la semaine atteint (selon ton propre objectif) | 15 | 1 par semaine |
| Objectif hors salle de la semaine atteint (si renseigné) | 10 | 1 par semaine |
| Étape de régularité : 5e, 10e, 25e, 50e, 100e, 200e séance ou activité | 10 | une fois chacune |
| Palier de poids personnel atteint (après avoir été au-dessus) | 15 | une fois par palier |

Seuils des niveaux 1 à 10 : 0, 30, 70, 120, 180, 250, 330, 420, 520 et 630 points.

### Ce qui ne rapporte pas de points

- **Effort et résultats** : la durée, les charges, les calories et la perte de poids ne donnent pas de points supplémentaires.
- **Repos** : une semaine sans séance ne fait jamais reculer le compagnon.
- **Bien-être** : aucun message ne pousse à s'entraîner malgré une douleur ou une fatigue.
- **Santé** : le compagnon est un jeu, distinct de la progression sportive mesurée dans l'onglet Progrès. Ce n'est pas une évaluation de santé.

### Fiabilité des récompenses

- **Calcul** : les points sont recalculés à partir des enregistrements, avec un identifiant par événement (`seance:<id>`, `activite:<id>`, `semaine:<lundi>:…`, `cumul:<n>`, `palier:<id>`).
  - Un import répété, un doublon ou une modification ne rapportent jamais deux fois.
  - Une séance seulement commencée ne rapporte rien.
  - Une suppression ajuste les points à la baisse.
- **Pièces conservées** : les pièces déjà débloquées restent acquises, même si une correction d'historique fait redescendre le niveau. Les points calculés et les éléments cosmétiques sont stockés séparément.
- **Célébrations** :
  - un passage de niveau n'est célébré qu'une fois, au moment de l'action ;
  - l'ouverture de l'application, un import ou une correction ne déclenchent aucune célébration ;
  - à l'adoption, l'historique existant est pris en compte sans célébrer chaque ancienne séance.
- **Données exportées** : l'animal, le nom, les couleurs, la tenue, les pièces débloquées, le niveau, les points, les événements déjà récompensés et le dernier niveau célébré. Les préférences d'affichage et d'animation sont incluses.

## Calories d'activité

**Convention affichée : calories actives**, c'est-à-dire la dépense de l'activité au-delà de la dépense de repos. Ce compteur couvre uniquement les activités enregistrées. Il ne représente ni la dépense de la journée ni un bilan alimentaire, et n'est jamais converti en perte de poids promise.

### Méthodes

1. **Marche et tapis avec vitesse et pente connues (3 à 6,5 km/h)** : équation métabolique de la marche de l'ACSM.
   VO₂ net (mL·kg⁻¹·min⁻¹) = 0,1 × v + 1,8 × v × pente, avec v en m/min. On compte 5 kcal par litre d'O₂. Incertitude affichée : ±15 %.
2. **Course avec vitesse ≥ 8 km/h** : équation de la course de l'ACSM, VO₂ net = 0,2 × v + 0,9 × v × pente. Incertitude : ±15 %.
3. **Autres cas** : valeurs MET selon l'activité et l'intensité déclarée.
   kcal actives = (MET − 1) × poids (kg) × durée (h). Incertitude : ±25 %.

| Activité | Légère | Modérée | Soutenue |
|---|---|---|---|
| Marche | 3,0 | 3,5 | 4,3 |
| Randonnée | 4,5 | 6,0 | 7,0 |
| Course (sans vitesse) | 7,0 | 8,3 | 9,8 |
| Vélo classique | 4,0 | 6,8 | 8,0 |
| Vélo à assistance électrique | 3,5 | 4,5 | 6,0 |
| Natation | 5,8 | 7,0 | 9,8 |
| Vélo de salle | 3,5 | 6,8 | 8,8 |
| Elliptique | 4,0 | 5,0 | 6,5 |
| Rameur | 4,8 | 7,0 | 8,5 |
| Musculation | 3,5 | 3,5 | 5,0 |

Précisions sur certaines activités :

- **Marche avec vitesse mais sans pente** : la valeur MET dépend de la vitesse (2,8 à 7,0).
- **Vélo à assistance électrique** : l'effort ressenti est obligatoire, car la vitesse seule ne permet pas d'estimer l'effort. Le niveau d'assistance ajuste la valeur : forte −0,5, moyenne 0, faible +0,5, aucune +1,0.
- **Musculation** : estimée uniquement si la durée de la séance et la difficulté globale sont renseignées. Elle se calcule sur la durée hors cardio, jamais à partir du tonnage. Incertitude : ±40 %.

### Règles d'usage

- **Poids utilisé** : le dernier poids connu à la date de l'activité, jamais un poids postérieur. Une mesure de plus de 30 jours est signalée comme ancienne. Sans poids connu, la valeur reste inconnue.
- **Valeur saisie** (montre ou appareil) : elle **remplace** l'estimation et ne s'y ajoute jamais. Sa convention est indiquée : actives, totales (repos inclus) ou inconnue. Seules les valeurs « actives » sont additionnées. Les autres sont affichées à part.
- **Valeur globale de séance** : si une valeur est saisie pour toute la séance, les segments cardio de cette séance ne sont pas ajoutés.
- **Totaux partiels** : un total est marqué « partiel » si un élément n'a pas de valeur. Les inconnues ne deviennent jamais des zéros.
- **Arrondis** : affichage à 10 kcal près, avec une fourchette.

### Sources

- Ainsworth B.E. et al., *2011 Compendium of Physical Activities: a second update of codes and MET values*, Medicine & Science in Sports & Exercise, 43(8), 2011, 1575-1581. La version 2024 (Adult Compendium, Herrmann S.D. et al., Journal of Sport and Health Science, 2024) peut servir à affiner les valeurs.
- American College of Sports Medicine, *ACSM's Guidelines for Exercise Testing and Prescription*, équations métaboliques de la marche et de la course.
- Bourne J.E. et al., *Health benefits of electrically-assisted cycling: a systematic review*, International Journal of Behavioral Nutrition and Physical Activity, 15:116, 2018. Cette revue conclut que le vélo à assistance électrique se pratique surtout à intensité modérée, un peu en dessous du vélo classique. Les valeurs du tableau sont des choix prudents de l'application dans cette fourchette.
- Les intensités légère et soutenue de l'elliptique encadrent la valeur de référence du Compendium (5,0). Ce sont des choix de l'application.

## Indicateurs et graphiques

| Indicateur | Définition |
|---|---|
| Volume | Séries de travail × répétitions × charge, uniquement pour une charge totale ou par haltère (× 2 pour deux haltères). Exclus : assistance, poids du corps, nombre de séries inconnu. |
| Séries d'échauffement | Exclues de tous les indicateurs de travail. |
| Record de charge | La plus lourde sur une série de travail. |
| Record d'assistance | La plus faible sur une série de travail. |
| Record de durée | La plus longue série. |
| Record de volume | Le plus élevé sur une séance. |
| Répartition musculaire | 1 série par muscle principal, 0,5 par muscle secondaire. Ces valeurs ne s'additionnent pas en un total. |
| Minutes actives | Sans chevauchement lorsque les heures sont connues. Une séance sans durée connue ne compte que pour ses segments cardio chronométrés, et la semaine est marquée partielle. |
| Mesures de montre ou de balance | Présentées comme des estimations déclarées. Les valeurs approximatives apparaissent en points creux. Les paliers visés sont des lignes distinctes des poids enregistrés. |

## Modèle de données (format d’export 2)

```json
{
  "app": "nouvel-elan", "format": 2, "appVersion": "2.0.0", "exportedAt": "…", "scope": "complet | profil",
  "profiles": [{
    "profile": { "id": "…", "name": "…", "goal": "perte_poids", "secondaryGoals": [], "weightTargets": [],
                 "level": null, "gymPerWeek": null, "durationMin": null, "equipment": [], "attention": [], "…": "…" },
    "sessions": [{ "id": "…", "date": "AAAA-MM-JJ", "status": "done", "durationMin": null,
                   "entries": [{ "kind": "strength", "exerciseId": "rowing_assis_machine", "variant": "", "equipmentNote": "",
                                 "setsCountKnown": true, "sets": [{ "type": "work", "load": 33, "reps": 10 }] },
                               { "kind": "cardio", "cardioType": "marche", "durationMin": 15, "durationIsMinimum": true,
                                 "speedKmh": null, "inclinePct": null }] }],
    "activities": [], "measurements": [], "customExercises": [], "templates": []
  }]
}
```

Les observations incomplètes sont acceptées : nombre de séries inconnu (`setsCountKnown: false`), durée minimale (`durationIsMinimum`), vitesse ou pente absentes, valeurs approximatives (`approx`). Elles sont exclues des calculs qui nécessitent l'information manquante.

### Migrations

- **Schéma IndexedDB** : `SCHEMA_MIGRATIONS` dans `js/db.js`. Ajouter une entrée `2(db, tx) { … }` et passer `APP.dbVersion` à 2. Les migrations sont additives et conservent les données.
- **Format d'export** : `FORMAT_MIGRATIONS` dans `js/io.js`. Les anciens fichiers sont convertis à l'import.

## Limites connues

- Les estimations de calories restent approximatives, même avec les méthodes ci-dessus. Elles ne remplacent pas une mesure.
- Les suggestions sont des règles générales d'entraînement. Elles ne constituent pas un avis médical et ne présentent aucun exercice comme médicalement sûr. Les consignes d'un professionnel saisies dans le profil sont affichées telles quelles mais pas interprétées : pour écarter un exercice, il faut l'indiquer comme gênant ou l'exclure.
- Les profils d'un même appareil ne sont pas protégés par un mot de passe.
- Sur iPhone, les vibrations de fin de repos ne sont pas prises en charge par Safari.
- Les règles de régularité utilisent les objectifs actuels du profil : modifier le nombre de séances visé recalcule les bonus de semaine passés. Les pièces déjà débloquées restent acquises.
- La police arrondie des titres utilise celle du système quand elle existe (iPhone). Sinon, la police habituelle du téléphone s'applique.
- L'apparence du sélecteur de date dépend du téléphone et de sa langue.
