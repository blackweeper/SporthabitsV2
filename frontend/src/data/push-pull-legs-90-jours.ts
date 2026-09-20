import type { Program, ProgramDay, ProgramSession } from './programs';
import { buildExercises, type BuilderBlock, type BuilderItem } from './program-builder';

/**
 * "Push Pull Legs — 90 jours" — transcrit depuis le PDF "Plan d'entraînement
 * Push Pull Legs 2.0" (hypertrophie / build muscle) : 18 séances en 3 phases de
 * 6 séances (Volume & hypertrophie adaptative · Intensification & rest-pause ·
 * Haute intensité : clusters & rest-pause max).
 *
 * Calendrier (choisi avec l'utilisateur) : le PDF recommande 1 à 3 jours
 * d'entraînement puis 1 à 2 jours de repos, chaque séance sur une fenêtre de
 * 10 jours max. Chaque phase dure donc 30 jours = ses 6 séances répétées 3 fois
 * en cycles de 10 jours (3 séances · 2 repos · 3 séances · 2 repos), soit 54
 * séances et 36 jours de repos sur 90 jours. Les "JOUR 1…18" du PDF sont des
 * numéros de séance, pas des jours de calendrier.
 *
 * Supersets (D1/D2, E1/E2…) : `RoundBlock`, voir `program-builder.ts`. Rest-
 * pause, drop set, clusters, répétitions partielles… sont des techniques
 * décrites dans les consignes (notes) de l'exercice.
 *
 * Repos : quand le PDF ne donne pas de "repos partiel" (la ligne décrit une
 * technique à la place), 90 s pour un gros mouvement polyarticulaire, 60 s
 * sinon.
 *
 * Liens bibliothèque : `exerciseRecordId` réels de la bibliothèque v4 ; les
 * rapprochements approximatifs (variante non présente dans la bibliothèque)
 * sont marqués `manual` et précisés dans les consignes. `if_0118` (hip thrust
 * doublement surélevé) est créé avec ce programme : tant que la bibliothèque v4
 * n'est pas publiée, l'id ne se résout pas et l'app retombe sur le nom affiché.
 */

const LIB = {
  tirageUnilateralPouliehaute: 'wx_3563',
  rowingAssisPoulie: 'wx_0861',
  rowingBasAssisPoulie: 'wx_0180',
  ecarteArriereHalteres: 'wx_0378',
  pulloverHaltere: 'wx_0375',
  curlPoulie: 'wx_0868',
  developpeInclineHalteres: 'wx_0314',
  ecarteInclinePoulie: 'wx_0171',
  dipsPectoraux: 'wx_0251',
  elevationLateralePoulie: 'wx_0178',
  pushdownPoulie: 'wx_0201',
  legCurlAllonge: 'wx_0586',
  legCurlAssis: 'wx_0599',
  souleveTerreRoumainBarre: 'wx_0085',
  hipThrustDoublementSurelevee: 'if_0118',
  presseCuisses45: 'wx_0739',
  presseUnilaterale45: 'wx_1425',
  squatBulgare: 'wx_0410',
  molletsDebout: 'wx_0605',
  molletsAssis: 'wx_0594',
  tractionSupination: 'wx_1326',
  rowingHautMachine: 'wx_0581',
  tirageBarrePoulie: 'wx_0150',
  tirageBarreLatPro: 'wx_0197',
  tirageVerticalPoitrine: 'sys_tirage_poitrine_a_la_poulie',
  curlInclinePoulie: 'wx_1645',
  curlPupitreHalteres: 'wx_0372',
  developpeCoucheHalteres: 'wx_0289',
  developpeMilitaireHalteres: 'sys_developpe_militaire_aux_halteres',
  developpePectorauxDecline: 'wx_1300',
  reverseFlyPoulie: 'wx_0154',
  extensionTricepsUnBrasPoulie: 'wx_0231',
  pompesPriseSerree: 'wx_0259',
  squatBarre: 'sys_squat_avec_barre',
  nordicCurl: 'wx_0496',
  hyperextension: 'wx_0489',
  hackSquatBarre: 'wx_0046',
  legExtension: 'wx_0585',
  rowingUnBrasHaltere: 'wx_0292',
  developpeInclineBarre: 'wx_0047',
  elevationY: 'wx_3541',
  fentesMarchees: 'wx_1460',
  curlZottman: 'wx_0439',
  developpeDeclineHalteres: 'wx_0301',
  elevationLateraleAllongeCote: 'wx_0408',
  extensionTricepsPoidsDuCorps: 'wx_1771',
  rowingInclineHalteres: 'wx_0327',
  developpeCoucheBarre: 'wx_0025',
  developpeUnBrasHaltere: 'wx_0361',
  hackSquatMachine: 'wx_0743',
  curlMarteauIncline: 'wx_0320',
  curlAlterneHalteres: 'wx_0285',
  developpeInclineSmith: 'wx_0757',
  developpeCoucheSerre: 'wx_0030',
  squatSmith: 'wx_0770',
} as const;

type Item = BuilderItem;
const it = (
  name: string,
  libId: string,
  reps: string,
  rest: number,
  notes: string,
  confidence?: Item['confidence'],
): Item => ({ name, libId, reps, rest, notes, ...(confidence ? { confidence } : {}) });
const single = (sets: number, item: Item): BuilderBlock => ({ kind: 'single', sets, item });
const superset = (letter: string, rounds: number, a: Item, b: Item): BuilderBlock => ({
  kind: 'superset',
  letter,
  rounds,
  items: [a, b],
});

type SessionTemplate = { label: 'Pull' | 'Push' | 'Jambes'; title: string; blocks: BuilderBlock[] };

/** Les 18 séances du PDF, dans l'ordre (6 par phase). */
const SESSIONS: SessionTemplate[] = [
  // ───────────── PHASE 1 — Volume & hypertrophie adaptative ─────────────
  {
    label: 'Pull',
    title: 'Pull - Bodybuilding (Tirage - Hypertrophie)',
    blocks: [
      single(2, it('Tirage vertical unilatéral à la poulie', LIB.tirageUnilateralPouliehaute, '8-10', 90, 'Repos partiel : 90 s.')),
      single(2, it('Tirage horizontal à la poulie (haut du dos)', LIB.rowingAssisPoulie, '8-10', 90, 'Cible le haut du dos. Repos partiel : 90 s.', 'manual')),
      single(3, it('Oiseau aux haltères buste penché', LIB.ecarteArriereHalteres, '10-12', 60, 'Repos partiel : 60 s.')),
      single(2, it('Pullover (poulie ou haltère)', LIB.pulloverHaltere, '15-20', 45, 'Repos partiel : 45 s.')),
      single(2, it('Curl biceps à la corde (poulie)', LIB.curlPoulie, '8-10', 60, 'Corde. Termine toutes les séries par un drop set (dégressif) en réduisant le poids.', 'manual')),
    ],
  },
  {
    label: 'Push',
    title: 'Push (Poussée)',
    blocks: [
      single(3, it('Développé incliné aux haltères', LIB.developpeInclineHalteres, '8-10', 90, "Technique 1 & 1/4 : descente complète, remontée d'1/4, redescente, puis remontée complète.")),
      single(3, it('Press autour du corps à la poulie (haut de poitrine)', LIB.ecarteInclinePoulie, '12-15', 30, 'Haut de poitrine. Repos partiel : 30 s.', 'manual')),
      single(3, it('Dips poitrine', LIB.dipsPectoraux, '10', 60, 'Repos partiel : 60 s.')),
      superset(
        'D',
        2,
        it('Élévations latérales crucifix à la poulie', LIB.elevationLateralePoulie, '10', 0, 'Crucifix. Superset avec D2, repos minimal : 0 s.', 'manual'),
        it('Élévations latérales au-dessus de la tête (poulie)', LIB.elevationLateralePoulie, '10', 90, 'Au-dessus de la tête, à enchaîner après D1. Repos partiel : 90 s.', 'manual'),
      ),
      single(3, it('Extension triceps à la poulie haute', LIB.pushdownPoulie, '15', 60, 'Termine toutes les séries par un drop set (dégressif).')),
    ],
  },
  {
    label: 'Jambes',
    title: 'Hamstrings & Glutes (Ischios & Fessiers)',
    blocks: [
      single(3, it('Leg curl allongé', LIB.legCurlAllonge, '8-10', 60, 'Ajoute 10 répétitions partielles dans le bas du mouvement en fin de chaque série.')),
      single(3, it('Soulevé de terre roumain', LIB.souleveTerreRoumainBarre, '8-10', 90, 'Repos partiel : 90 s.')),
      single(2, it('Hip thrust doublement surélevé', LIB.hipThrustDoublementSurelevee, '12-15', 60, 'Haut du dos et pieds surélevés. Repos partiel : 60 s.')),
      single(3, it('Presse à cuisses', LIB.presseCuisses45, '8-10', 90, 'Pause obligatoire de 3 s en position basse (étirement).')),
      single(2, it('Squat bulgare', LIB.squatBulgare, '20/côté', 60, 'Repos partiel : 60 s.')),
      single(3, it('Extension mollets debout', LIB.molletsDebout, '10', 60, 'Pause de 3 s en contraction haute à chaque répétition.')),
    ],
  },
  {
    label: 'Pull',
    title: 'Pull - Strength (Tirage - Force)',
    blocks: [
      single(4, it('Tractions en supination', LIB.tractionSupination, '6-8', 90, 'Repos partiel : 90 s.')),
      single(3, it('Tirage haut (poulie ou machine)', LIB.rowingHautMachine, '8-10', 90, 'Repos partiel : 90 s.')),
      single(3, it('Tirage poitrine prise large', LIB.tirageBarrePoulie, '8-10', 90, 'Prise large. Repos partiel : 90 s.', 'manual')),
      superset(
        'D',
        2,
        it('Curl biceps incliné à la poulie', LIB.curlInclinePoulie, '10-12', 0, 'Superset avec D2, repos minimal : 0 s.'),
        it('Curl pupitre aux haltères (banc Larry Scott)', LIB.curlPupitreHalteres, '10-12', 60, 'À enchaîner après D1. Repos partiel : 60 s.'),
      ),
    ],
  },
  {
    label: 'Push',
    title: 'Push - Strength (Poussée - Force)',
    blocks: [
      single(4, it('Développé couché aux haltères', LIB.developpeCoucheHalteres, '6-8', 90, 'Repos partiel : 90 s.')),
      single(2, it('Développé épaules incliné à 65°', LIB.developpeMilitaireHalteres, '8-10', 90, 'Banc incliné à 65° (développé épaules/pectoraux). Repos partiel : 90 s.', 'manual')),
      single(2, it('Presse pectorale bas de poitrine (costal)', LIB.developpePectorauxDecline, '8-10', 60, 'Bas de poitrine (costal). Repos partiel : 60 s.', 'manual')),
      single(3, it('Oiseau unilatéral à la poulie (deltoïdes arrière)', LIB.reverseFlyPoulie, '12-15', 60, 'Un bras à la fois. Repos partiel : 60 s.', 'manual')),
      superset(
        'E',
        3,
        it('Extension triceps cross-body à la poulie', LIB.extensionTricepsUnBrasPoulie, '12-15/côté', 0, 'Cross-body. Superset avec E2, repos minimal : 0 s.', 'manual'),
        it('Pompes prise serrée', LIB.pompesPriseSerree, 'Max', 30, 'AMRAP : un maximum de répétitions, à enchaîner après E1. Repos partiel : 30 s.'),
      ),
    ],
  },
  {
    label: 'Jambes',
    title: 'Legs - Strength (Jambes - Force)',
    blocks: [
      single(4, it('Squat à la barre', LIB.squatBarre, '6-8', 90, 'Repos partiel : 90 s.')),
      single(3, it('Nordic hamstring curl', LIB.nordicCurl, '4-6', 90, 'Repos partiel : 90 s.', 'manual')),
      single(3, it('Hyperextension à 45°', LIB.hyperextension, '10-12', 60, 'Banc à lombaires. Repos partiel : 60 s.')),
      superset(
        'D',
        3,
        it('Hack squat à la barre (arrière)', LIB.hackSquatBarre, '10-12', 0, 'Superset avec D2, repos minimal : 0 s.'),
        it('Leg extension', LIB.legExtension, '10-12', 90, 'Quadriceps, à enchaîner après D1. Repos partiel : 90 s.'),
      ),
      single(3, it('Mollets assis', LIB.molletsAssis, '10', 60, "Pause de 3 s en position d'étirement maximal, en bas.")),
    ],
  },

  // ───────────── PHASE 2 — Intensification & rest-pause ─────────────
  {
    label: 'Pull',
    title: 'Pull - Classic (Tirage Classique)',
    blocks: [
      single(3, it('Tirage vertical poitrine', LIB.tirageVerticalPoitrine, '6', 90, 'Effectue une série rest-pause sur la toute dernière série.')),
      single(3, it('Rowing Meadows (unilatéral)', LIB.rowingUnBrasHaltere, '6-8', 90, 'Rowing Meadows, haut du dos. Repos partiel : 90 s.', 'manual')),
      single(3, it('Tirage assis à la poulie (deltoïdes arrière)', LIB.rowingAssisPoulie, '6-8', 90, 'Cible les deltoïdes arrière. Effectue un rest-pause sur la dernière série.', 'manual')),
      single(3, it('Soulevé de terre roumain prise large (arraché)', LIB.souleveTerreRoumainBarre, '4-6', 90, "Prise d'arraché (large). Repos partiel : 90 s.", 'manual')),
      single(3, it('Curl biceps incliné à la poulie', LIB.curlInclinePoulie, '6-8', 60, 'Effectue une série rest-pause sur TOUTES les séries.')),
    ],
  },
  {
    label: 'Push',
    title: 'Push - Classic (Poussée Classique)',
    blocks: [
      single(3, it('Développé incliné à la barre', LIB.developpeInclineBarre, '6', 90, 'Effectue un rest-pause sur la dernière série.')),
      single(3, it('Développé couché aux haltères', LIB.developpeCoucheHalteres, '6-8', 90, 'Repos partiel : 90 s.')),
      single(3, it('Dips (pectoraux/triceps)', LIB.dipsPectoraux, '6-8', 90, 'Repos partiel : 90 s.')),
      single(3, it('Élévation en Y avec surcharge excentrique', LIB.elevationY, '4', 90, '5 s de descente négative lente. Repos : 90 s.', 'manual')),
      single(3, it('Élévations en Y aux haltères', LIB.elevationY, '6-8', 60, 'Repos partiel : 60 s.')),
      single(3, it('Extension triceps cross-body à la poulie', LIB.extensionTricepsUnBrasPoulie, '8-10', 60, 'Cross-body. Repos partiel : 60 s.', 'manual')),
    ],
  },
  {
    label: 'Jambes',
    title: 'Hamstrings & Glutes (Ischios & Fessiers)',
    blocks: [
      single(3, it('Soulevé de terre roumain', LIB.souleveTerreRoumainBarre, '6', 120, 'Repos partiel : 120 s.')),
      single(3, it('Leg curl assis', LIB.legCurlAssis, '6-8', 60, 'Effectue un drop set sur la toute dernière série.')),
      single(3, it('Presse à cuisses unilatérale', LIB.presseUnilaterale45, '6-8', 90, 'Repos partiel : 90 s.')),
      single(3, it('Fentes marchées', LIB.fentesMarchees, '20 pas/côté', 90, 'Repos partiel : 90 s.')),
      single(3, it('Mollets debout', LIB.molletsDebout, '10', 60, 'Drop set dégressif en fin de chaque série (-20 % de charge).')),
    ],
  },
  {
    label: 'Pull',
    title: 'Pull - 5x5 (Tirage Force 5x5)',
    blocks: [
      single(5, it('Tractions en supination', LIB.tractionSupination, '5', 90, 'Repos partiel : 90 s.')),
      single(3, it('Tirage vertical haut du dos', LIB.tirageBarreLatPro, '6-8', 60, 'Haut du dos. Repos partiel : 60 s.', 'manual')),
      single(3, it('Rowing poulie déroulé', LIB.rowingAssisPoulie, '12-15', 60, "Rowing « déroulé » (articulation de l'épaule). Repos partiel : 60 s.", 'manual')),
      single(3, it('Rowing Gironda à la poulie basse', LIB.rowingBasAssisPoulie, '8-10', 60, 'Rowing Gironda. Repos partiel : 60 s.', 'manual')),
      single(3, it('Curl Zottman', LIB.curlZottman, '6-8', 60, 'Biceps et avant-bras. Repos partiel : 60 s.')),
    ],
  },
  {
    label: 'Push',
    title: 'Push - 5x5 (Poussée Force 5x5)',
    blocks: [
      single(5, it('Développé militaire debout (OHP)', LIB.developpeMilitaireHalteres, '5', 90, 'À la barre (OHP) si possible. Repos partiel : 90 s.', 'manual')),
      single(3, it('Dips accent triceps', LIB.dipsPectoraux, '6', 90, 'Buste droit, accent triceps. Repos partiel : 90 s.', 'manual')),
      single(3, it('Développé décliné aux haltères', LIB.developpeDeclineHalteres, '6-8', 90, 'Repos partiel : 90 s.')),
      single(3, it('Élévation latérale combinée couché sur le côté', LIB.elevationLateraleAllongeCote, '8-10/côté', 45, 'Repos partiel : 45 s.')),
      superset(
        'E',
        3,
        it('Barre au front au poids du corps', LIB.extensionTricepsPoidsDuCorps, '10-12', 0, 'Sur barre ou banc. Superset avec E2, repos minimal : 0 s.', 'manual'),
        it('Pompes mains serrées', LIB.pompesPriseSerree, '10-12', 60, 'À enchaîner après E1. Repos partiel : 60 s.'),
      ),
    ],
  },
  {
    label: 'Jambes',
    title: 'Legs - 5x5 (Jambes Force 5x5)',
    blocks: [
      single(5, it('Squat arrière à la barre', LIB.squatBarre, '5', 120, 'Repos partiel : 120 s.')),
      single(3, it('Nordic hamstring curl', LIB.nordicCurl, '4-6', 90, 'Repos partiel : 90 s.', 'manual')),
      single(3, it('Squat bulgare', LIB.squatBulgare, '8-10', 60, 'Repos partiel : 60 s.')),
      single(3, it('Hack squat à la barre', LIB.hackSquatBarre, '8-10', 90, 'Barre derrière les cuisses. Repos partiel : 90 s.')),
      single(3, it('Mollets assis', LIB.molletsAssis, '10', 60, 'Drop set dégressif en fin de chaque série (-20 % de charge).')),
    ],
  },

  // ───────────── PHASE 3 — Haute intensité : clusters & rest-pause max ─────────────
  {
    label: 'Pull',
    title: 'Pull - Clusters (Tirage Clusters)',
    blocks: [
      single(4, it('Tractions en supination', LIB.tractionSupination, '6-8 (cluster)', 90, 'Cluster : charge de ton 5RM, avec des micro-pauses pendant la série pour valider 6 à 8 répétitions au total.')),
      single(3, it('Rowing deltoïdes arrière appui poitrine', LIB.rowingInclineHalteres, '6', 90, 'Poitrine appuyée, coudes larges (deltoïdes arrière). Effectue un rest-pause sur la dernière série.', 'manual')),
      single(3, it('Tirage haut', LIB.rowingHautMachine, '6', 90, 'Effectue un rest-pause sur la dernière série.')),
      single(3, it('Curl pupitre unilatéral', LIB.curlPupitreHalteres, '6', 60, 'Un bras à la fois. Ajoute 3 répétitions excentriques (négatives retenues) en fin de chaque série.', 'manual')),
    ],
  },
  {
    label: 'Push',
    title: 'Push - Bench Clusters (Poussée Couché Clusters)',
    blocks: [
      single(4, it('Développé couché à la barre', LIB.developpeCoucheBarre, '6-8 (cluster)', 90, 'Cluster : charge de ton 5RM, avec des micro-pauses pendant la série.')),
      single(3, it('Développé très incliné aux haltères', LIB.developpeInclineHalteres, '6', 90, 'Banc très incliné. Effectue un rest-pause sur la dernière série.', 'manual')),
      single(3, it('Développé debout unilatéral aux haltères', LIB.developpeUnBrasHaltere, '12-15', 60, 'Repos partiel : 60 s.')),
      superset(
        'D',
        3,
        it('Extension triceps cross-body à la poulie', LIB.extensionTricepsUnBrasPoulie, '8', 0, 'Cross-body. Superset avec D2, repos minimal : 0 s.', 'manual'),
        it('Extension triceps course courte (poulie)', LIB.extensionTricepsUnBrasPoulie, '8', 90, 'Course courte, à enchaîner après D1. Repos partiel : 90 s.', 'manual'),
      ),
    ],
  },
  {
    label: 'Jambes',
    title: 'Legs - Clusters (Jambes Clusters)',
    blocks: [
      single(4, it('Leg curl assis', LIB.legCurlAssis, '6-8 (cluster)', 90, 'Cluster : charge à ton 5RM, avec de courtes pauses pendant la série.')),
      single(3, it('Soulevé de terre roumain', LIB.souleveTerreRoumainBarre, '5', 120, 'Repos partiel : 120 s.')),
      single(3, it('Hack squat machine', LIB.hackSquatMachine, '6', 90, 'Effectue un rest-pause sur la dernière série.')),
      single(3, it('Hyperextension à 45° avec bande', LIB.hyperextension, '15-20', 60, "Avec bande élastique. Drop set sur TOUTES les séries : passe au poids du corps immédiatement, jusqu'à l'échec (AMRAP).", 'manual')),
    ],
  },
  {
    label: 'Pull',
    title: 'Pull - Rest Pause (Tirage Rest-Pause)',
    blocks: [
      single(3, it('Tirage vertical poitrine', LIB.tirageVerticalPoitrine, '6', 90, 'Effectue une série rest-pause sur la dernière série.')),
      single(3, it('Rowing haut du dos', LIB.rowingAssisPoulie, '6', 90, 'Haut du dos. Effectue un rest-pause sur la dernière série.', 'manual')),
      single(3, it('Pullover', LIB.pulloverHaltere, '10-12', 60, 'Repos partiel : 60 s.')),
      single(3, it('Curl marteau incliné sur banc', LIB.curlMarteauIncline, '10-12', 60, 'Repos partiel : 60 s.')),
      single(3, it('Curl alterné aux haltères', LIB.curlAlterneHalteres, '10-12', 60, 'Repos partiel : 60 s.')),
    ],
  },
  {
    label: 'Push',
    title: 'Push - Clusters (Poussée Clusters)',
    blocks: [
      single(4, it('Développé légèrement incliné à la Smith machine', LIB.developpeInclineSmith, '6-8 (cluster)', 90, 'Cluster : charge de ton 5RM, avec de courtes pauses pendant la série.')),
      single(3, it('Dips triceps', LIB.dipsPectoraux, '10-12', 90, 'Buste droit, accent triceps. Repos partiel : 90 s.', 'manual')),
      single(4, it('Développé militaire (OHP)', LIB.developpeMilitaireHalteres, 'Max (cluster)', 90, 'À la barre (OHP) si possible. Cluster : charge de ton 5RM, un maximum de répétitions en format cluster.', 'manual')),
      single(3, it('Élévation latérale penchée à la poulie', LIB.elevationLateralePoulie, '10-12', 60, 'Penché sur le côté (lean away). Repos partiel : 60 s.', 'manual')),
      single(3, it('Développé couché prise serrée', LIB.developpeCoucheSerre, '4-6', 90, 'Repos partiel : 90 s.')),
    ],
  },
  {
    label: 'Jambes',
    title: 'Squat - Clusters (Squat & Cuisses Clusters)',
    blocks: [
      single(4, it('Squat à la Smith machine', LIB.squatSmith, '6-8 (cluster)', 90, 'Cluster : charge de ton 5RM, avec des micro-pauses pendant la série.')),
      single(3, it('Presse à cuisses', LIB.presseCuisses45, '6', 90, 'Effectue un rest-pause sur la dernière série.')),
      single(3, it('Squat bulgare (pied avant surélevé)', LIB.squatBulgare, '10-12', 60, 'Fente pied avant surélevé. Repos partiel : 60 s.', 'manual')),
      single(3, it('Leg curl allongé (technique 1 & 1/4)', LIB.legCurlAllonge, '8-10', 60, "Technique 1 & 1/4 : descente complète, remontée d'1/4, redescente complète, puis flexion complète.")),
      single(3, it('Mollets debout', LIB.molletsDebout, '20 au total', 60, '10 répétitions avec pause de 3 s en position haute, puis 10 répétitions avec pause de 3 s en position basse (étirement).')),
    ],
  },
];

const SESSIONS_PER_PHASE = 6;
const CYCLES_PER_PHASE = 3;
const REST_DAY: ProgramDay = { rest: true, title: 'Repos complet', sessions: [] };

function buildSession(sessionNumber: number, blockIdPrefix: string): ProgramSession {
  const tpl = SESSIONS[sessionNumber];
  return { label: tpl.label, title: tpl.title, exercises: buildExercises(tpl.blocks, blockIdPrefix) };
}

/** Un cycle de 10 jours : 3 séances · 2 repos · 3 séances · 2 repos. */
function buildCycle(phase: number, cycle: number): ProgramDay[] {
  const first = phase * SESSIONS_PER_PHASE;
  const training = (dayInCycle: number, sessionOffset: number): ProgramDay => ({
    rest: false,
    title: `Phase ${phase + 1} · Cycle ${cycle + 1} — Jour ${dayInCycle}`,
    sessions: [buildSession(first + sessionOffset, `ppl-p${phase + 1}-c${cycle + 1}-s${sessionOffset + 1}`)],
  });
  return [
    training(1, 0),
    training(2, 1),
    training(3, 2),
    { ...REST_DAY },
    { ...REST_DAY },
    training(6, 3),
    training(7, 4),
    training(8, 5),
    { ...REST_DAY },
    { ...REST_DAY },
  ];
}

export const PUSH_PULL_LEGS_90_JOURS_PROGRAM: Program = {
  id: 'push-pull-legs-90-jours',
  title: 'Push Pull Legs — 90 jours',
  description:
    'Programme Push Pull Legs 2.0 (hypertrophie / build muscle) sur 90 jours, en 3 phases de 30 jours : Volume & hypertrophie adaptative, Intensification & rest-pause, Haute intensité (clusters & rest-pause max). ' +
    'Chaque phase compte 6 séances (Pull, Push, Jambes, puis leur version Force), répétées 3 fois en cycles de 10 jours : 3 séances, 2 repos, 3 séances, 2 repos. ' +
    'Rest-pause : série menée à l\'échec, quelques secondes de pause, puis quelques répétitions en plus. Drop set : enchaîne avec une charge réduite, sans repos. Cluster : micro-pauses pendant la série pour tenir plus de répétitions avec une charge lourde (5RM). ' +
    'Superset : enchaîne l\'exercice 1 et l\'exercice 2 sans repos, puis prends le repos indiqué.',
  durationDays: 90,
  level: 'avance',
  goal: 'Hypertrophie & muscle',
  goalTag: 'prise_de_masse',
  coverEmoji: '💪',
  color: '#8B5CFF',
  days: Array.from({ length: 3 }, (_, phase) =>
    Array.from({ length: CYCLES_PER_PHASE }, (_, cycle) => buildCycle(phase, cycle)).flat(),
  ).flat(),
  isCustom: true,
  category: 'workout',
  phases: [
    { startDay: 1, endDay: 30, kind: 'volume', label: 'Phase 1 — Volume & hypertrophie adaptative' },
    { startDay: 31, endDay: 60, kind: 'intensity', label: 'Phase 2 — Intensification & rest-pause' },
    { startDay: 61, endDay: 90, kind: 'intensity', label: 'Phase 3 — Haute intensité : clusters & rest-pause max' },
  ],
};
