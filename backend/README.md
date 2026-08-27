# IronFlow backend — Import santé (Health Auto Export)

Petit service FastAPI qui reçoit les données envoyées par l'app iOS **Health Auto Export**
(fréquence cardiaque, autres métriques, séances Apple Health) via un webhook REST, les stocke
dans MongoDB, et les expose à l'app IronFlow pour affichage.

C'est le seul rôle de ce backend aujourd'hui — IronFlow reste par ailleurs une app locale/mono-
appareil (aucun compte utilisateur, tout le reste des données vit dans l'app elle-même).

## 1. Créer un cluster MongoDB Atlas (gratuit)

1. Créer un compte sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register).
2. Créer un cluster **M0 (gratuit)**.
3. **Database Access** → créer un utilisateur (nom + mot de passe).
4. **Network Access** → ajouter `0.0.0.0/0` (autoriser depuis n'importe où — Render a des IP
   dynamiques sur le plan gratuit) ou, si disponible sur votre plan, les IP sortantes de Render.
5. **Connect** → "Drivers" → copier la chaîne de connexion, de la forme :
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
   C'est la valeur de `MONGO_URL` à l'étape suivante.

## 2. Déployer sur Render

**Via le Blueprint (recommandé)** : dans le dashboard Render → "New" → "Blueprint" → connecter ce
dépôt GitHub → Render détecte `backend/render.yaml` et propose de créer le service.

**Ou manuellement** : "New" → "Web Service" → connecter le dépôt →
- Root Directory : `backend`
- Build Command : `pip install -r requirements.txt`
- Start Command : `uvicorn server:app --host 0.0.0.0 --port $PORT`

Dans les deux cas, renseigner ces 3 variables d'environnement (onglet "Environment") :

| Variable | Valeur |
|---|---|
| `MONGO_URL` | la chaîne de connexion Atlas de l'étape 1 |
| `DB_NAME` | `ironflow` (ou le nom de votre choix) |
| `HEALTH_IMPORT_TOKEN` | un secret fort — générer avec `openssl rand -hex 32` |

Une fois déployé, noter l'URL du service (`https://<nom-du-service>.onrender.com`) et vérifier
qu'il répond :
```bash
curl https://<nom-du-service>.onrender.com/api/health
# {"status":"ok"}
```

⚠️ Sur le plan Render gratuit, le service s'endort après une période d'inactivité — la première
requête après une pause peut prendre 30-60s le temps qu'il redémarre (comportement normal du plan
gratuit, pas un bug). Health Auto Export retente automatiquement en cas d'échec.

## 3. Configurer l'automatisation dans Health Auto Export

Dans l'app iOS **Health Auto Export** :

1. Onglet **Automations** → **+** (nouvelle automation).
2. **Data Type** : choisir les métriques à exporter (ex. Heart Rate) et/ou les séances (Workouts).
3. **Destination** : **REST API**.
4. **URL** : `https://<nom-du-service>.onrender.com/api/health-import`
5. **Method** : `POST`
6. **Headers** → ajouter un header personnalisé :
   - Nom : `Authorization`
   - Valeur : `Bearer <le HEALTH_IMPORT_TOKEN configuré sur Render>`
7. **Format** : JSON.
8. Choisir la fréquence de déclenchement (ex. toutes les heures, ou "à chaque nouvelle donnée").
9. Sauvegarder, puis déclencher l'automation manuellement une première fois pour vérifier — Health
   Auto Export affiche le code de réponse HTTP dans son historique d'automations (200 = succès).

## 4. Côté app IronFlow

Dans l'app : Profil → **Import santé (Health Auto Export)** → renseigner :
- **URL du backend** : `https://<nom-du-service>.onrender.com`
- **Token** : le même `HEALTH_IMPORT_TOKEN`

Puis "Synchroniser maintenant" pour récupérer les données déjà reçues par le backend. Les données
importées ne modifient jamais les séances/stats propres à IronFlow — elles s'affichent dans leur
propre section, séparée du suivi d'entraînement de l'app.

## Développement local

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # ou .venv\Scripts\activate sous Windows
pip install -r requirements.txt
cp .env.example .env  # puis éditer MONGO_URL/HEALTH_IMPORT_TOKEN
uvicorn server:app --reload
```

Tester l'import sans passer par Health Auto Export :
```bash
curl -X POST http://localhost:8000/api/health-import \
  -H "Authorization: Bearer <HEALTH_IMPORT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"data":{"metrics":[{"name":"heart_rate","units":"bpm","data":[{"date":"2024-01-01T12:00:00","qty":72}]}],"workouts":[]}}'
```

Lancer la suite de tests (aucun MongoDB réel requis, `mongomock-motor` simule la base) :
```bash
pytest tests/test_health_import.py -v
```

## Limites connues

- **Gros exports historiques ponctuels** (plusieurs centaines de Mo en un seul envoi) : le corps de
  la requête est chargé en mémoire par le serveur avant traitement (comportement par défaut de
  FastAPI/Starlette). Sur le plan Render gratuit (RAM limitée), un tout premier export historique
  très volumineux peut échouer. Pour un premier import, réduire la plage de dates exportée dans
  Health Auto Export plutôt que d'exporter tout l'historique en une fois ; les synchronisations
  incrémentales suivantes (automation régulière) sont largement plus légères et ne posent aucun
  problème.
- Pas de vrais comptes utilisateurs : un seul token = un seul "utilisateur" (`default_user`) côté
  base de données — cohérent avec le reste d'IronFlow, qui n'a pas de notion de compte.
