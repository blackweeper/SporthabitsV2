import { Program } from './programs';

/**
 * 6 programmes de mobilité/flexibilité :
 * - 5 transcrits manuellement depuis les PDFs 'Movement By David' (Flexy Hip,
 *   FS Shoulders, All the Young Dudes, Full Body Flexibility Plan, FS Spine)
 *   fournis par l'utilisateur. Structure périodisée réelle (4 semaines,
 *   3 séances/semaine, motifs de jour répétés), pas générée. 382/432 slots
 *   d'exercices résolus vers un `exerciseRecordId` réel (88%) ; les slots
 *   restants sont des noms libres (pas d'équivalent fiable dans la
 *   bibliothèque, comportement historique toujours supporté).
 * - 1 programme "Full Body" (`starter-full-body-combo`) généré en fusionnant
 *   les 4 programmes ci-dessus par zone (hanches/épaules/colonne/ischio-
 *   jambiers, hors "Flexibilité complète du corps" déjà existant) : les
 *   patrons repos/entraînement des 4 sources sont identiques jour par jour,
 *   donc chaque jour d'entraînement du combiné réunit les 4 séances
 *   d'origine (une par zone, indépendamment lançable) sans aucune
 *   retranscription — mêmes exercices, mêmes `exerciseRecordId`.
 */
export const STARTER_PROGRAMS: Program[] = [
  {
    "id": "starter-hip-mobility",
    "title": "Mobilité des hanches — 4 semaines",
    "description": "Programme de mobilité des hanches sur 4 semaines, 3 séances par semaine. Basé sur \"Hip Flexibility\" (Movement By David).",
    "durationDays": 28,
    "level": "debutant",
    "goal": "Mobilité & flexibilité",
    "goalTag": "mobilite",
    "coverEmoji": "🧘",
    "color": "#00E676",
    "days": [
      {
        "rest": false,
        "title": "Semaine 1 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 1",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0002",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0003",
                "matchConfidence": "exact"
              },
              {
                "name": "Butterfly Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0004",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 2",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0005",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0006",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Flexor Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0007",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0008",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 3",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0002",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0003",
                "matchConfidence": "exact"
              },
              {
                "name": "Butterfly Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0004",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 1",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0005",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0006",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Flexor Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0007",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0008",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 2",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0011",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 3",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0013",
                "matchConfidence": "exact"
              },
              {
                "name": "Cossack Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0014",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Quad Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0015",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 1",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0011",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 2",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0013",
                "matchConfidence": "exact"
              },
              {
                "name": "Cossack Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0014",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Quad Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0015",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 3",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Donkey Kicks",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0018",
                "matchConfidence": "exact"
              },
              {
                "name": "Figure Four Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0019",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 1",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 60,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Iso",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0022",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Couch Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "sys_couch_stretch",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 2",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Donkey Kicks",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0018",
                "matchConfidence": "exact"
              },
              {
                "name": "Figure Four Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0019",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 3",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 60,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Iso",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0022",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Couch Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "sys_couch_stretch",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      }
    ],
    "isCustom": true,
    "category": "stretch"
  },
  {
    "id": "starter-shoulder-mobility",
    "title": "Mobilité des épaules — 4 semaines",
    "description": "Programme de mobilité des épaules sur 4 semaines, 3 séances par semaine. Basé sur \"Shoulder Mobility\" (Movement By David).",
    "durationDays": 28,
    "level": "debutant",
    "goal": "Mobilité & flexibilité",
    "goalTag": "mobilite",
    "coverEmoji": "🙆",
    "color": "#00B0FF",
    "days": [
      {
        "rest": false,
        "title": "Semaine 1 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 1",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dips",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0033",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Shoulder Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0034",
                "matchConfidence": "exact"
              },
              {
                "name": "Doorframe Chest Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0035",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 2",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lat Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0036",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dip Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0037",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole Internal Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0038",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole External Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0039",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 3",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dips",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0033",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Shoulder Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0034",
                "matchConfidence": "exact"
              },
              {
                "name": "Doorframe Chest Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0035",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 1",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lat Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0036",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dip Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0037",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole Internal Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0038",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole External Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0039",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 2",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Banded Chest Pull Backs",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0040",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Bicep Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0041",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Sleeper Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0043",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 3",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Chest & Bicep",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0044",
                "matchConfidence": "exact"
              },
              {
                "name": "Rear Delt Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0045",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort Internal Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0046",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort External Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0047",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 1",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Banded Chest Pull Backs",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0040",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Bicep Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0041",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Sleeper Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0043",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 2",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Chest & Bicep",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0044",
                "matchConfidence": "exact"
              },
              {
                "name": "Rear Delt Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0045",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort Internal Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0046",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort External Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0047",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 3",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Flappy Bird",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0048",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Tricep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0049",
                "matchConfidence": "exact"
              },
              {
                "name": "Floor Bicep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0050",
                "matchConfidence": "exact"
              },
              {
                "name": "Shoulder Dislocations",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0051",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 1",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Lat Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0052",
                "matchConfidence": "exact"
              },
              {
                "name": "Jumper Delt Pull",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0053",
                "matchConfidence": "exact"
              },
              {
                "name": "Internal Elbow Pull",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0054",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 2",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Flappy Bird",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0048",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Tricep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0049",
                "matchConfidence": "exact"
              },
              {
                "name": "Floor Bicep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0050",
                "matchConfidence": "exact"
              },
              {
                "name": "Shoulder Dislocations",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0051",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 3",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Lat Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0052",
                "matchConfidence": "exact"
              },
              {
                "name": "Jumper Delt Pull",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0053",
                "matchConfidence": "exact"
              },
              {
                "name": "Internal Elbow Pull",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0054",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      }
    ],
    "isCustom": true,
    "category": "stretch"
  },
  {
    "id": "starter-spinal-mobility",
    "title": "Mobilité de la colonne — 4 semaines",
    "description": "Programme de mobilité vertébrale sur 4 semaines, 3 séances par semaine. Basé sur \"Spinal Mobility\" (Movement By David).",
    "durationDays": 28,
    "level": "debutant",
    "goal": "Mobilité & flexibilité",
    "goalTag": "mobilite",
    "coverEmoji": "🌀",
    "color": "#7C4DFF",
    "days": [
      {
        "rest": false,
        "title": "Semaine 1 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 1",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cat Cow",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0056",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Active Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0057",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Pike",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0058",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 2",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lateral Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0059",
                "matchConfidence": "exact"
              },
              {
                "name": "Side Plank Lifts",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0060",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0061",
                "matchConfidence": "exact"
              },
              {
                "name": "Seal Pose",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0062",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 3",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cat Cow",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0056",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Active Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0057",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Pike",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0058",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 1",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lateral Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0059",
                "matchConfidence": "exact"
              },
              {
                "name": "Side Plank Lifts",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0060",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0061",
                "matchConfidence": "exact"
              },
              {
                "name": "Seal Pose",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0062",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 2",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0063",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Passive Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0064",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 3",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cobra Push-ups",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0065",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunging Side Bend",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0067",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Reps",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0068",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 1",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0063",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Passive Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0064",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 2",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cobra Push-ups",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0065",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunging Side Bend",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0067",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Reps",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0068",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 3",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Basic Back Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0069",
                "matchConfidence": "exact"
              },
              {
                "name": "Hollow Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0070",
                "matchConfidence": "exact"
              },
              {
                "name": "Cat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Cow",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 1",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Seated Roll Downs",
                "mode": "reps",
                "sets": 2,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0090",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Backbend Walkdown",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0091",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Bridge Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0089",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 2",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Basic Back Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0069",
                "matchConfidence": "exact"
              },
              {
                "name": "Hollow Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0070",
                "matchConfidence": "exact"
              },
              {
                "name": "Cat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Cow",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 3",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Seated Roll Downs",
                "mode": "reps",
                "sets": 2,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0090",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Backbend Walkdown",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0091",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Bridge Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0089",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      }
    ],
    "isCustom": true,
    "category": "stretch"
  },
  {
    "id": "starter-hamstring-flexibility",
    "title": "Souplesse des ischio-jambiers — 4 semaines",
    "description": "Programme de flexibilité des ischio-jambiers sur 4 semaines, 3 séances par semaine. Basé sur \"Hamstring Flexibility\" (Movement By David).",
    "durationDays": 28,
    "level": "debutant",
    "goal": "Mobilité & flexibilité",
    "goalTag": "mobilite",
    "coverEmoji": "🦵",
    "color": "#FFC400",
    "days": [
      {
        "rest": false,
        "title": "Semaine 1 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Single Leg Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Active Hamstring Lunge",
                "mode": "reps",
                "sets": 1,
                "reps": "5",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0025",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Basic Toe Touch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0026",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Single Leg Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Active Hamstring Lunge",
                "mode": "reps",
                "sets": 1,
                "reps": "5",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0025",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Basic Toe Touch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0026",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Kneeling Hamstring Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0031",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Kneeling Hamstring Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0031",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Hurdler Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0027",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Shift",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0028",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Sit and Reach Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0030",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Hurdler Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0027",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Shift",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0028",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Sit and Reach Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0030",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      }
    ],
    "isCustom": true,
    "category": "stretch"
  },
  {
    "id": "starter-full-body-flexibility",
    "title": "Flexibilité complète du corps — 4 semaines",
    "description": "Programme de flexibilité corps entier sur 4 semaines, 3 séances par semaine. Basé sur \"Full Body: A Complete Flexibility Plan\" (Movement By David).",
    "durationDays": 28,
    "level": "debutant",
    "goal": "Mobilité & flexibilité",
    "goalTag": "mobilite",
    "coverEmoji": "🔥",
    "color": "#FF6B00",
    "days": [
      {
        "rest": false,
        "title": "Semaine 1 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Good Morning",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0005",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0095",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Hip Flexor Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Butterfly Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0004",
                "matchConfidence": "exact"
              },
              {
                "name": "Figure Four Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0019",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0036",
                "matchConfidence": "exact"
              },
              {
                "name": "Cat Cow",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0056",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0093",
                "matchConfidence": "exact"
              },
              {
                "name": "Bicep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0094",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Spinal Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0063",
                "matchConfidence": "exact"
              },
              {
                "name": "Pike Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0092",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 1 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Good Morning",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0005",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0095",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Hip Flexor Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Butterfly Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0004",
                "matchConfidence": "exact"
              },
              {
                "name": "Figure Four Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0019",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Arm Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0071",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Side Bend",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0072",
                "matchConfidence": "exact"
              },
              {
                "name": "Cobra Pose Press Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "8",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0073",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "5",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Box Shoulder Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0074",
                "matchConfidence": "exact"
              },
              {
                "name": "Lateral Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0059",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Torso Twist",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0075",
                "matchConfidence": "exact"
              },
              {
                "name": "Chair Dip Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0076",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Good Morning",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0077",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              },
              {
                "name": "Couch Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "sys_couch_stretch",
                "matchConfidence": "exact"
              },
              {
                "name": "Modified Pigeon",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0078",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 2 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Arm Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0071",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Side Bend",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0072",
                "matchConfidence": "exact"
              },
              {
                "name": "Cobra Pose Press Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "8",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0073",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "5",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Box Shoulder Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0074",
                "matchConfidence": "exact"
              },
              {
                "name": "Lateral Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0059",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Torso Twist",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0075",
                "matchConfidence": "exact"
              },
              {
                "name": "Chair Dip Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0076",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Good Morning",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0077",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              },
              {
                "name": "Couch Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "sys_couch_stretch",
                "matchConfidence": "exact"
              },
              {
                "name": "Modified Pigeon",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0078",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Bicep Back Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0086",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Dips",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0087",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Seal Pose",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0062",
                "matchConfidence": "exact"
              },
              {
                "name": "QL Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0088",
                "matchConfidence": "exact"
              },
              {
                "name": "Wrist Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0079",
                "matchConfidence": "exact"
              },
              {
                "name": "Wrist Flexion",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0080",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 3 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossed Leg Toe Taps",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0081",
                "matchConfidence": "exact"
              },
              {
                "name": "Full Range Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0082",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Hip Flexor Reach",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0083",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0084",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 1",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 1",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Bicep Back Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0086",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Dips",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0087",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Seal Pose",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0062",
                "matchConfidence": "exact"
              },
              {
                "name": "QL Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0088",
                "matchConfidence": "exact"
              },
              {
                "name": "Wrist Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0079",
                "matchConfidence": "exact"
              },
              {
                "name": "Wrist Flexion",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0080",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 2",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 2",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0002",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossed Leg Toe Taps",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0081",
                "matchConfidence": "exact"
              },
              {
                "name": "Full Range Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0082",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Flexor Reach",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0083",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Crossbody Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0084",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 3",
        "sessions": [
          {
            "label": "Séance",
            "title": "Semaine 4 — Jour 3",
            "exercises": [
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque jambe",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Pulse",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0036",
                "matchConfidence": "exact"
              },
              {
                "name": "Cat Cow",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0056",
                "matchConfidence": "exact"
              },
              {
                "name": "Chest Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0093",
                "matchConfidence": "exact"
              },
              {
                "name": "Bicep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0094",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Spinal Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0063",
                "matchConfidence": "exact"
              },
              {
                "name": "Pike Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0092",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      }
    ],
    "isCustom": true,
    "category": "stretch"
  },
  {
    "id": "starter-full-body-combo",
    "title": "Full Body — 4 semaines",
    "description": "Programme complet combinant les 4 routines de mobilité (hanches, épaules, colonne, ischio-jambiers) en un seul plan. Chaque jour d'entraînement propose les 4 séances par zone, à faire à la suite ou séparément selon ton temps disponible.",
    "durationDays": 28,
    "level": "debutant",
    "goal": "Mobilité & flexibilité",
    "goalTag": "mobilite",
    "coverEmoji": "🧘",
    "color": "#FF3D00",
    "days": [
      {
        "rest": false,
        "title": "Semaine 1 — Jour 1",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0002",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0003",
                "matchConfidence": "exact"
              },
              {
                "name": "Butterfly Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0004",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dips",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0033",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Shoulder Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0034",
                "matchConfidence": "exact"
              },
              {
                "name": "Doorframe Chest Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0035",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cat Cow",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0056",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Active Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0057",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Pike",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0058",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Single Leg Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 2",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0005",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0006",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Flexor Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0007",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0008",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lat Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0036",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dip Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0037",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole Internal Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0038",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole External Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0039",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lateral Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0059",
                "matchConfidence": "exact"
              },
              {
                "name": "Side Plank Lifts",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0060",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0061",
                "matchConfidence": "exact"
              },
              {
                "name": "Seal Pose",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0062",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Active Hamstring Lunge",
                "mode": "reps",
                "sets": 1,
                "reps": "5",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0025",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Basic Toe Touch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0026",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 1 — Jour 3",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0002",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0003",
                "matchConfidence": "exact"
              },
              {
                "name": "Butterfly Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0004",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Chest Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0032",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dips",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0033",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Shoulder Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0034",
                "matchConfidence": "exact"
              },
              {
                "name": "Doorframe Chest Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0035",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cat Cow",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0056",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Active Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0057",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Pike",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0058",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 1,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Single Leg Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 1",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0005",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0006",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Flexor Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0007",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Lunge",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0008",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lat Pulse",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0036",
                "matchConfidence": "exact"
              },
              {
                "name": "Low Dip Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0037",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole Internal Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0038",
                "matchConfidence": "exact"
              },
              {
                "name": "Pole External Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0039",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Lateral Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0059",
                "matchConfidence": "exact"
              },
              {
                "name": "Side Plank Lifts",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0060",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0061",
                "matchConfidence": "exact"
              },
              {
                "name": "Seal Pose",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0062",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Active Hamstring Lunge",
                "mode": "reps",
                "sets": 1,
                "reps": "5",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0025",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Basic Toe Touch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0026",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 2",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0011",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Banded Chest Pull Backs",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0040",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Bicep Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0041",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Sleeper Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0043",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0063",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Passive Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0064",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 2 — Jour 3",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0013",
                "matchConfidence": "exact"
              },
              {
                "name": "Cossack Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0014",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Quad Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0015",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Chest & Bicep",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0044",
                "matchConfidence": "exact"
              },
              {
                "name": "Rear Delt Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0045",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort Internal Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0046",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort External Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0047",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cobra Push-ups",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0065",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunging Side Bend",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0067",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Reps",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0068",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Kneeling Hamstring Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0031",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 1",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Kick",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0009",
                "matchConfidence": "exact"
              },
              {
                "name": "Deep Split Squat",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0010",
                "matchConfidence": "exact"
              },
              {
                "name": "Pigeon Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0011",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Banded Chest Pull Backs",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0040",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Bicep Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0041",
                "matchConfidence": "exact"
              },
              {
                "name": "Lat Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0042",
                "matchConfidence": "exact"
              },
              {
                "name": "Sleeper Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0043",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              },
              {
                "name": "Roll Down",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0099",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Extension",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0063",
                "matchConfidence": "exact"
              },
              {
                "name": "Seated Passive Twist Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0064",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              },
              {
                "name": "Single Leg RDL",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0001",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 2",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0013",
                "matchConfidence": "exact"
              },
              {
                "name": "Cossack Switch",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0014",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunge Quad Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0015",
                "matchConfidence": "exact"
              },
              {
                "name": "Flat Back Hamstring Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0016",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Chest & Bicep",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0044",
                "matchConfidence": "exact"
              },
              {
                "name": "Rear Delt Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0045",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort Internal Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0046",
                "matchConfidence": "exact"
              },
              {
                "name": "Max Effort External Rotation",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0047",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Cobra Push-ups",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0065",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Lunging Side Bend",
                "mode": "reps",
                "sets": 2,
                "reps": "10 de chaque côté",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0067",
                "matchConfidence": "exact"
              },
              {
                "name": "Thread the Needle Reps",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0068",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Spine Stretch",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "wx_1363",
                "matchConfidence": "exact"
              },
              {
                "name": "Kneeling Hamstring Good Morning",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0031",
                "matchConfidence": "exact"
              },
              {
                "name": "Pancake Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0012",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 3 — Jour 3",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Donkey Kicks",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0018",
                "matchConfidence": "exact"
              },
              {
                "name": "Figure Four Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0019",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Flappy Bird",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0048",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Tricep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0049",
                "matchConfidence": "exact"
              },
              {
                "name": "Floor Bicep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0050",
                "matchConfidence": "exact"
              },
              {
                "name": "Shoulder Dislocations",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0051",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Basic Back Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0069",
                "matchConfidence": "exact"
              },
              {
                "name": "Hollow Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0070",
                "matchConfidence": "exact"
              },
              {
                "name": "Cat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Cow",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Hurdler Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0027",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 1",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 60,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Iso",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0022",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Couch Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "sys_couch_stretch",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Lat Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0052",
                "matchConfidence": "exact"
              },
              {
                "name": "Jumper Delt Pull",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0053",
                "matchConfidence": "exact"
              },
              {
                "name": "Internal Elbow Pull",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0054",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Seated Roll Downs",
                "mode": "reps",
                "sets": 2,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0090",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Backbend Walkdown",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0091",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Bridge Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0089",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Shift",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0028",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Sit and Reach Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0030",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 2",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Donkey Kicks",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0018",
                "matchConfidence": "exact"
              },
              {
                "name": "Figure Four Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0019",
                "matchConfidence": "exact"
              },
              {
                "name": "Hamstring Choke",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0020",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Flappy Bird",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0048",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Tricep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0049",
                "matchConfidence": "exact"
              },
              {
                "name": "Floor Bicep Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0050",
                "matchConfidence": "exact"
              },
              {
                "name": "Shoulder Dislocations",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0051",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Basic Back Extension",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0069",
                "matchConfidence": "exact"
              },
              {
                "name": "Hollow Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0070",
                "matchConfidence": "exact"
              },
              {
                "name": "Cat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              },
              {
                "name": "Cow",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Crossbody Leg Swings",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0017",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Hurdler Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0027",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": false,
        "title": "Semaine 4 — Jour 3",
        "sessions": [
          {
            "label": "Hanches",
            "title": "Hanches",
            "exercises": [
              {
                "name": "Hip Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "5 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0098",
                "matchConfidence": "exact"
              },
              {
                "name": "Body Weight Squats",
                "mode": "reps",
                "sets": 1,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0097",
                "matchConfidence": "exact"
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Deep Squat",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 60,
                "notes": null,
                "exerciseRecordId": "if_0021",
                "matchConfidence": "exact"
              },
              {
                "name": "90/90 Iso",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0022",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0023",
                "matchConfidence": "exact"
              },
              {
                "name": "Couch Stretch",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "sys_couch_stretch",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Épaules",
            "title": "Épaules",
            "exercises": [
              {
                "name": "Shoulder Circles",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque direction",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0100",
                "matchConfidence": "exact"
              },
              {
                "name": "Push-Ups",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Wall Lat Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0052",
                "matchConfidence": "exact"
              },
              {
                "name": "Jumper Delt Pull",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0053",
                "matchConfidence": "exact"
              },
              {
                "name": "Internal Elbow Pull",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0054",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Angels",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0055",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Colonne",
            "title": "Colonne",
            "exercises": [
              {
                "name": "Cherry Pickers",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0085",
                "matchConfidence": "exact"
              },
              {
                "name": "Hip Stirs",
                "mode": "reps",
                "sets": 1,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Seated Roll Downs",
                "mode": "reps",
                "sets": 2,
                "reps": "10 dans chaque sens",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0090",
                "matchConfidence": "exact"
              },
              {
                "name": "Wall Backbend Walkdown",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0091",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "15",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Bridge Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0089",
                "matchConfidence": "exact"
              }
            ]
          },
          {
            "label": "Ischio-jambiers",
            "title": "Ischio-jambiers",
            "exercises": [
              {
                "name": "Hamstring Over Step",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null
              },
              {
                "name": "Elephant Walks",
                "mode": "reps",
                "sets": 1,
                "reps": "30",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0096",
                "matchConfidence": "exact"
              },
              {
                "name": "Standing Pancake Shift",
                "mode": "reps",
                "sets": 1,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0028",
                "matchConfidence": "exact"
              },
              {
                "name": "Double Elephant",
                "mode": "reps",
                "sets": 2,
                "reps": "10",
                "weight": null,
                "rest_seconds": 30,
                "duration_seconds": null,
                "notes": null,
                "exerciseRecordId": "if_0029",
                "matchConfidence": "exact"
              },
              {
                "name": "Sit and Reach Hold",
                "mode": "time",
                "sets": 2,
                "reps": "1",
                "weight": null,
                "rest_seconds": 20,
                "duration_seconds": 30,
                "notes": null,
                "exerciseRecordId": "if_0030",
                "matchConfidence": "exact"
              }
            ]
          }
        ]
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      },
      {
        "rest": true,
        "title": "Repos",
        "sessions": []
      }
    ],
    "isCustom": true,
    "category": "stretch"
  }
];
