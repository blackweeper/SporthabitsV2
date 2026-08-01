# Rapport de correspondance — exercices des programmes vs bibliothèque IronFlow

Bibliothèque version 3 (1348 exercices). 87 noms d'exercice uniques trouvés dans les 6 programmes embarqués (fullbody-30, hiit-30, mass-30, stretch-daily-14, stretch-week-7, cardio-endurance-21).

**Aucune association n'est appliquée automatiquement.** Remplir la colonne Décision puis appliquer manuellement dans `src/data/programs.ts` (simple édition de chaîne dans les appels `ex(...)`, sans risque — voir le plan pour la justification).

## ✅ Correspondance exacte (2) — rien à faire

- Développé couché
- Pompes

## ⚠️ Correspondance floue ≥0.65 — À VALIDER (46)

Triées par score croissant (les cas limites, les plus risqués de faux positif, en premier).

| Nom programme | Meilleur candidat | Score | Tier | Autres candidats | Décision |
|---|---|---|---|---|---|
| Curl marteau | Curl marteau aux haltères (`wx_0313`) | 0.67 | official_core | Curl marteau avec haltères V. 2 (0.55), Curl marteau assis avec haltères (0.55) | |
| Curl pupitre | Curl au pupitre à la barre (`wx_0070`) | 0.67 | collection_only | Curl au pupitre à la poulie (0.65), Curl au pupitre avec haltères (0.59) | |
| Élévations frontales | Élévation frontale à la barre (`wx_0041`) | 0.67 | collection_only | Élévation frontale avec haltères (0.67), Élévation frontale à la poulie (0.65) | |
| Étirement ischios (assis) | Étirement du bas du dos assis (`wx_0690`) | 0.67 | official_core | Étirement des ischio-jambiers (0.63), Étirement des fessiers assis (0.61) | |
| Étirement adducteurs | Étirement du coureur (`wx_1585`) | 0.67 | official_core | Étirement assisté des adducteurs en décubitus latéral (0.60), Étirement du tibial postérieur (0.55) | |
| Étirement papillon assis | Étirement assis du piriforme (`wx_2567`) | 0.67 | official_core | Étirement du bas du dos assis (0.62), Étirement assisté des mollets allongé (0.62) | |
| Sprint | Sprints courts (`wx_0858`) | 0.67 | official_core | Fente sprint à la machine Smith (0.45), Sphinx (0.40) | |
| Pushdown triceps | Extension triceps à la poulie (barre en V) (`wx_0241`) | 0.68 | collection_only | Extension triceps unilatérale à la poulie (0.62), Extension triceps à la poulie avec barre V et Arm Blaster (0.51) | |
| Rotations hanches | Relevé de hanches avec rotation (`wx_1466`) | 0.68 | collection_only | Planche avec rotation (0.61), Élévation des hanches genoux fléchis (0.51) | |
| Rowing haltère | Rowing incliné avec haltères (`wx_0327`) | 0.68 | collection_only | Rowing menton aux haltères (0.68), Rowing buste penché aux haltères (0.62) | |
| Étirement dos rond | Étirement du haut du dos (`wx_1365`) | 0.69 | official_core | Étirement des péroniers (0.68), Étirement du dos avec rouleau (0.68) | |
| Rowing barre | Rowing incliné à la barre (`wx_0049`) | 0.69 | official_core | Rowing menton à la barre (0.67), Rowing Pendlay à la barre (0.67) | |
| Curl biceps | Curl biceps à la barre (`wx_0031`) | 0.69 | collection_only | Curl des biceps avec haltères (0.69), Curl biceps à la poulie (0.65) | |
| Curl barre | Curl avec barre EZ (`wx_0447`) | 0.69 | collection_only | Drag curl à la barre (0.67), Curl biceps à la barre (0.64) | |
| Jumping jacks | Jumping jack (homme) (`wx_3224`) | 0.71 | official_core | Saut vers l'arrière (0.50), Squat sauté depuis les genoux (0.47) | |
| Élévations latérales | Élévation latérale aux haltères (`wx_0334`) | 0.71 | official_core | Traction latérale (0.69), Élévation latérale à la poulie (0.68) | |
| Étirement biceps mur | Étirement des triceps (`wx_0817`) | 0.72 | official_core | Étirement du coureur (0.56), Étirement des triceps au-dessus de la tête (0.55) | |
| Fentes barre | Fente à la barre (`wx_0054`) | 0.72 | official_core | Fente arrière à la barre (0.64), Fente arrière à la barre V.2 (0.58) | |
| Mollets debout | Mollets debout à la barre (`wx_0108`) | 0.72 | collection_only | Extension des mollets debout (0.70), Mollets debout à la machine (0.68) | |
| Face pulls | Face pull à la poulie (`wx_5203`) | 0.73 | collection_only | Traction pour biceps (0.45), Tirage vertical à la poulie (0.45) | |
| Étirement du dos allongé | Étirement du bas du dos assis (`wx_0690`) | 0.73 | official_core | Étirement de côté allongé au sol (0.72), Étirement du haut du dos (0.70) | |
| Étirement des ischios debout | Étirement des ischio-jambiers (`wx_1511`) | 0.73 | official_core | Étirement du mollet debout (0.65), Étirement latéral debout (0.64) | |
| Squats poids du corps | Quadriceps : squat au poids du corps (`wx_3533`) | 0.73 | collection_only | Tirage en squat au poids du corps (0.72), Squat sauté en chute (poids du corps) (0.67) | |
| Extensions triceps corde | Extension triceps à la machine (`wx_0607`) | 0.74 | collection_only | Extension latérale des triceps avec bande (0.74), Extension triceps inclinée avec corde à la poulie (0.66) | |
| Étirement quadriceps | Étirement des quadriceps à quatre pattes (`wx_1512`) | 0.75 | official_core | Étirement des triceps (0.72), Étirement des quadriceps allongé (de côté) (0.67) | |
| Étirement pectoraux au mur | Étirement du dos et des pectoraux (`wx_1405`) | 0.75 | official_core | Étirement du mollet avec corde (0.55), Étirement du coureur (0.54) | |
| Planche | Planche inclinée (`wx_3300`) | 0.75 | collection_only | Planche complète (0.71), Planche grenouille (0.71) | |
| Dips lestés | Dips triceps lestés (`wx_1755`) | 0.75 | collection_only | Dips lestés sur banc (0.69), Dips lestés sur trois bancs (0.56) | |
| Curl haltères | Curl haut avec haltères (`wx_1664`) | 0.75 | collection_only | Curl marteau aux haltères (0.71), Curl Zottman avec haltères (0.65) | |
| Étirement quadriceps debout | Étirement des quadriceps à quatre pattes (`wx_1512`) | 0.76 | official_core | Étirement des triceps (0.74), Étirement des quadriceps allongé (de côté) (0.69) | |
| Écarté haltères | Écarté arrière avec haltères (`wx_0378`) | 0.79 | official_core | Écarté inversé avec haltères (0.74), Écarté Hyght avec haltères (0.74) | |
| Extensions mollets | Extension des mollets debout (`wx_1397`) | 0.80 | collection_only | Extension des mollets donkey lestée (0.73), Extension des mollets sur barre au sol (0.64) | |
| Étirement mollets contre mur | Étirement du mollet, mains contre le mur (`wx_1377`) | 0.80 | official_core | Étirement du mollet avec les mains contre le mur (0.75), Étirement assisté des mollets allongé (0.65) | |
| Étirement triceps derrière la tête | Étirement des triceps au-dessus de la tête (`wx_0643`) | 0.81 | essential | Étirement des triceps (0.81), Étirement de la poitrine derrière la tête (0.80) | |
| Squats sautés | Squat sauté (`wx_0514`) | 0.82 | collection_only | Squat sauté V. 2 (0.67), Squat sauté depuis les genoux (0.56) | |
| Développé militaire barre | Développé militaire assis à la barre (`wx_0091`) | 0.83 | essential | Développé militaire assis derrière la tête à la barre (0.73), Développé militaire aux haltères (0.71) | |
| Soulevé de terre roumain | Soulevé de terre roumain à la barre (`wx_0085`) | 0.83 | official_core | Soulevé de terre (0.82), Soulevé de terre roumain aux haltères (0.80) | |
| Squat barre | Squat à la barre (`wx_0026`) | 0.83 | essential | Squat avec barre (0.80), Squat large à la barre (0.74) | |
| Extensions triceps | Extension triceps à la machine (`wx_0607`) | 0.84 | collection_only | Extension latérale des triceps avec bande (0.78), Extension triceps inclinée à la poulie (0.73) | |
| Burpees | Burpee (`wx_1160`) | 0.91 | official_core | Jack burpee (0.63), Burpee avec haltères (0.50) | |
| Tirage vertical poulie | Tirage vertical à la poulie (`wx_0198`) | 0.91 | collection_only | Tirage vertical à la poulie (barre lat pro) (0.73), Tirage latéral alterné à la poulie (0.68) | |
| Développé incliné haltères | Développé incliné avec haltères (`wx_0316`) | 0.92 | collection_only | Développé incliné alterné avec haltères (0.90), Développé couché incliné aux haltères (0.82) | |
| Développé militaire haltères | Développé militaire aux haltères (`sys_developpe_militaire_aux_halteres`) | 0.93 | collection_only | Développé Tate avec haltères (0.73), Développé W avec haltères (0.71) | |
| Tractions | Traction (`wx_0652`) | 0.93 | collection_only | Traction en L (0.74), Tractions strictes (0.70) | |
| Étirement du cou | Étirement du coureur (`wx_1585`) | 0.94 | official_core | Étirement latéral du cou (0.79), Étirement du haut du dos (0.73) | |
| Mountain climbers | Mountain Climber (`wx_0630`) | 0.97 | official_core | Mountain climber en pont (croisé) (0.65), Grimper à la corde (0.40) | |

## ❌ Sans correspondance fiable (score <0.65, ≥0.4) (34)

| Nom programme | Meilleur candidat (pour contexte, non suggéré) | Score | Décision |
|---|---|---|---|
| Tirage horizontal élastique | Pallof press horizontal à la bande élastique (`wx_0979`) | 0.65 | |
| Fentes sautées | Fente avec saut (`wx_3582`) | 0.64 | |
| Gainage bras tendus | Tirage bras tendus à la poulie (`wx_0238`) | 0.64 | |
| Étirement dynamique ischios | Étirement des ischio-jambiers (`wx_1511`) | 0.63 | |
| Leg curl | Curl biceps à la poulie (`wx_0868`) | 0.63 | |
| Récupération active | Traction arrière (`wx_0670`) | 0.63 | |
| Superman au sol | Pompe Superman (`wx_0803`) | 0.62 | |
| Étirement pigeon | Étirement des péroniers (`wx_1388`) | 0.61 | |
| Gainage latéral | Élévation latérale à la landmine (`wx_3237`) | 0.61 | |
| Dips sur chaise | Dips sur les coudes (`wx_3287`) | 0.60 | |
| Fentes alternées | Fente avec haltères (`wx_0336`) | 0.60 | |
| Presse à cuisses | Presse à cuisses au Smith machine (`wx_0760`) | 0.60 | |
| Étirement hanches (papillon) | Étirement des hanches avec rouleau (`wx_2202`) | 0.59 | |
| Chaise contre le mur | Crunch latéral assis contre le mur (`wx_0691`) | 0.58 | |
| Étirement chat-vache | Étirement du coureur (`wx_1585`) | 0.57 | |
| Marches genoux haut | Fente marchée avec montées de genoux (`wx_3655`) | 0.57 | |
| Rotations d'épaules | Élévation frontale d'épaule à la poulie (`wx_0164`) | 0.56 | |
| Crunchs vélo | Crunch au sol (`wx_0274`) | 0.55 | |
| Répétitions côtes ou résistance vélo | Développé couché avec haltères et rotation (`wx_1743`) | 0.54 | |
| Torsion allongée | Extension allongé à la barre (`wx_0057`) | 0.53 | |
| Torsions assises | Élévation des jambes assise (`wx_0689`) | 0.53 | |
| Squats profonds | Pompe profonde (`wx_1274`) | 0.52 | |
| Sprint sur place | Course (sur place) (`wx_0684`) | 0.52 | |
| Respiration profonde | Pompe profonde (`wx_1274`) | 0.52 | |
| Pompes classiques | Pompes (`sys_pompes`) | 0.50 | |
| Pompes explosives | Pompes (`sys_pompes`) | 0.50 | |
| Fente basse (hip flexor) | Étirement du fléchisseur de hanche avec ballon d'exercice (`wx_1559`) | 0.50 | |
| Étirement enfant (yoga) | Étirement du coureur (`wx_1585`) | 0.50 | |
| Course allure soutenue | Course avec roue (`wx_3637`) | 0.50 | |
| Rotations de nuque | Relevé de hanches avec rotation (`wx_1466`) | 0.49 | |
| Marche rapide / vélo doux | Marche de l'ours (`wx_3360`) | 0.49 | |
| Rotations bras complet | Rotation de la colonne vertébrale (`wx_2329`) | 0.48 | |
| Aigle (croiser les bras) | Relevé de jambes à plat ventre avec ballon d'exercice (`wx_1343`) | 0.43 | |
| Course/vélo endurance longue | Course sur vélo stationnaire V. 3 (`wx_2138`) | 0.42 | |

## 🚫 Probablement pas un exercice réel (score <0.4) (5)

Vraisemblablement des libellés de format d'entraînement (AMRAP, circuit…) plutôt que de vrais noms d'exercices — à reformuler plutôt qu'à faire correspondre.

- AMRAP finisher
- Cardio modéré
- Circuit AMRAP
- Cobra
- Pigeon
