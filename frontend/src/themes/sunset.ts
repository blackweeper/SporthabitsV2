import { Theme } from "./types";

/**
 * Thème "Glacier Aurora" (id interne resté `"sunset"` — voir
 * `theme-settings.ts` : renommer la clé casserait le thème déjà choisi par
 * les utilisateurs existants pour un gain nul, seul `label`/`swatch`/les
 * couleurs comptent pour l'utilisateur) — succède à l'ancienne identité
 * corail/orange "Sunset". Esthétique "verre premium sombre" : fond (image,
 * voir `ThemedBackground.tsx`) inchangé dans son principe, mais l'accent
 * principal de toute l'interface superposée devient le Glacier Blue
 * (`#4DA3FF`), avec Cyan et Violet comme accents secondaires sémantiques
 * (voir `data` ci-dessous) — jamais l'orange, réduit au rôle de donnée
 * ("Calories" uniquement, `warning`/`data.energy`).
 *
 * Règle directrice (cf. brief) : le bleu ne doit jamais devenir "le nouvel
 * orange" — il reste réservé aux éléments actifs/CTA/graphiques/highlights,
 * jamais peint en aplat sur de grandes surfaces. Les tokens ci-dessous
 * fournissent la couleur ; c'est aux composants (`GlassCard`, `GlassButton`,
 * les chips "Active Glass" déjà bâtis dans tout le code) de la doser en
 * transparence plutôt qu'en aplat — déjà le cas partout où ce thème est
 * consommé via `theme.colors.brand`, donc cette seule recoloration des
 * tokens suffit à propager "Glacier Aurora" sans toucher ces composants un
 * par un (sauf `GlassCard`/`GlassButton` eux-mêmes, affinés séparément pour
 * une vraie hiérarchie de profondeur — voir leurs fichiers).
 */
export const sunsetTheme: Theme = {
  id: "sunset",
  label: "Glacier Aurora",
  swatch: "#4DA3FF",
  colors: {
    // Surface sombre à très légère dominante froide (bleu-noir plutôt que
    // neutre) — sert de repli opaque (SafeAreaView non-glass, chips plats)
    // derrière/à côté du fond image, cohérent avec "espace sombre + lumière
    // froide" même là où aucun accent n'est visible.
    surface: "#080A0D",
    surfaceSecondary: "#0F131A",
    surfaceTertiary: "#161B24",
    onSurface: "#FFFFFF",
    // Blanc translucide neutre — la hiérarchie de texte reste neutre,
    // l'accent Glacier Blue ne sert qu'aux éléments qui doivent ressortir
    // (cf. règle directrice ci-dessus : le bleu comme lumière, pas comme
    // couleur de fond de l'interface).
    onSurfaceSecondary: "rgba(255,255,255,0.65)",
    onSurfaceTertiary: "rgba(255,255,255,0.40)",
    // Glacier Blue — accent principal de toute l'interface (CTA, états
    // actifs, icônes importantes, bordures fines de sélection).
    brand: "#4DA3FF",
    brandSecondary: "#8CC8FF",
    // Teinte "carte tertiaire d'accent" (bannières/notes) — bleu marine
    // sombre plutôt que le brun-orangé précédent.
    brandTertiary: "#12233A",
    success: "#30D158",
    // Orange — conservé UNIQUEMENT comme couleur sémantique de donnée
    // (Calories, cf. `data.energy` ci-dessous) : ne plus jamais l'utiliser
    // comme accent principal d'un CTA/onglet/carte générique.
    warning: "#FF9F43",
    error: "#FF453A",
    // Cyan — même famille que `data.cardio` : un événement cardio du
    // calendrier et une série cardio d'un graphique partagent la même teinte.
    info: "#35D6E8",
    scheduleBoth: "#FFC24A",
    // "Performance" (violet) — Niveau/XP, PR, progression — deuxième accent
    // secondaire de la palette Glacier Aurora, jamais la couleur dominante.
    progress: "#8B5CFF",
    progressSecondary: "#A78BFA",
    progressTertiary: "#1E1A3A",
    border: "rgba(255,255,255,0.12)",
    borderStrong: "rgba(255,255,255,0.18)",
    divider: "rgba(255,255,255,0.08)",
    overlay: "rgba(0,0,0,0.6)",
    // Blanc translucide plutôt qu'un disque sombre plein — laisse deviner le
    // fond/l'effet glass à travers la piste plutôt qu'un simple
    // `surfaceTertiary` sombre, cohérent avec le reste du thème.
    ringTrack: "rgba(255,255,255,0.20)",
    // Platine froid opaque — badge du rang NOVICE (voir le commentaire sur
    // `rankNeutral` dans `types.ts`), cohérent avec la dominante Glacier
    // Blue plutôt qu'un gris neutre.
    rankNeutral: "#9FB8D9",
    metricColors: {
      // Calories reste orange (seule survivance légitime de l'orange, sur
      // demande explicite : "donnée", jamais "identité") — teinte assombrie
      // sur demande explicite (orange plus profond/sombre que le pastel
      // précédent).
      caloriesBurn: ["#E8790C", "#B45309"],
      steps: ["#8CC8FF", "#247BFF"],
      sleep: ["#C4B5FD", "#8B5CFF"],
      // Vert partout pour le temps d'entraînement (cohérence demandée avec
      // Classique, qui utilise déjà #10B981) — distinct du bleu des Pas.
      training: ["#6EE7A8", "#30D158"],
    },
    // Couleurs de DONNÉES (graphiques/badges par catégorie) — jamais la
    // couleur principale d'un écran générique, voir le commentaire sur
    // `DataColorSet`. Mapping sémantique demandé : Force/Musculation =
    // Glacier Blue, Cardio = Cyan, Performance/PR = Violet,
    // Progression/Objectifs = Vert, Calories = Orange (seul survivant).
    data: {
      strength: "#4DA3FF",
      cardio: "#35D6E8",
      performance: "#8B5CFF",
      success: "#30D158",
      energy: "#FF9F43",
      achievement: "#FF5C8A",
      danger: "#FF453A",
      // Corail ember — l'orange (`warning`/`energy`) est réservé aux
      // Calories sous ce thème (voir règle directrice plus haut), donc
      // l'identité WOD emprunte une teinte chaude voisine mais distincte,
      // jamais confondue avec Calories ni avec `danger`.
      workout: "#FF6B4A",
    },
    // 4 phases de sommeil (fiche Sommeil) — du plus sombre/froid (Profond) au
    // plus clair (Éveil), dans la famille Glacier déjà en place pour
    // `metricColors.sleep` (violet). REM tranche sur le Cyan `info` (distinct
    // de la famille violette) ; Éveil sur `brandSecondary` (bleu clair) plutôt
    // que sur l'orange — réservé aux Calories sous ce thème (voir le
    // commentaire sur `warning`/`data.energy` plus haut).
    sleepStages: {
      deep: "#2E2168",
      light: "#8B5CFF",
      rem: "#35D6E8",
      awake: "#8CC8FF",
    },
  },
  radius: { sm: 8, md: 16, lg: 26, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xl2: 32, xl3: 48 },
  // `mode:"gradient"` reste le signal utilisé ailleurs (ex. transparence du
  // `SafeAreaView` des écrans migrés) pour "ce thème a un fond non-plat" —
  // `ThemedBackground` affiche en réalité "IronFlow Aurora"
  // (`AuroraBackground`, généré en code) ou le fond choisi par
  // l'utilisateur, jamais ce dégradé directement : ces couleurs ne sont plus
  // lues nulle part pour peindre l'écran, gardées ici à titre de repli
  // théorique documenté (mise à jour vers une teinte froide cohérente avec
  // Glacier Aurora plutôt que l'ancien dégradé chaud bleu→rose→orange).
  background: {
    mode: "gradient",
    colors: ["#0B1220", "#12233D", "#1B1030", "#080A0D"],
    locations: [0, 0.35, 0.7, 1],
  },
  // Verre "Liquid Glass" : teinte blanche à très légère dominante froide
  // (bleu très désaturé) plutôt qu'un blanc pur — laisse le fond
  // transparaître largement (jamais opaque) tout en donnant une sensation de
  // verre dépoli légèrement teinté par la lumière Glacier Blue ambiante.
  card: { mode: "glass", tint: "rgba(190,215,255,0.055)", blurIntensity: 30 },
  // Trois paliers de profondeur (voir `GlassLevel` dans `types.ts`) — `card`
  // reprend exactement `card.tint`/`blurIntensity` ci-dessus (même valeur),
  // `subtle` est plus discret (lignes de liste, chips inactifs), `elevated`
  // plus marqué (carte héros, sheet modale) sans jamais devenir opaque —
  // affiné dans `GlassCard.tsx` avec un léger halo Glacier Blue ambiant pour
  // ce dernier palier (profondeur perçue, jamais un néon).
  glass: {
    subtle: { tint: "rgba(180,205,255,0.035)", blurIntensity: 16 },
    card: { tint: "rgba(190,215,255,0.055)", blurIntensity: 30 },
    elevated: { tint: "rgba(200,220,255,0.09)", blurIntensity: 40 },
  },
  ringFill: { type: "spring", damping: 14, stiffness: 120 },
  // "IronFlow Aurora" — valeurs reprises telles quelles de l'ancien
  // `AuroraBackground.AURORA_PALETTE` (désormais générique, voir ce
  // fichier) : rendu byte-identique à avant l'introduction du token.
  aurora: {
    base: "#05070B",
    deepGradientTop: "#071426",
    glowPrimary: "#4DA3FF",
    glowPrimaryDim: "#1769D2",
    glowSecondary: "#39206B",
    glowTertiary: "#075A6B",
  },
};
