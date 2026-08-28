"""
Import de données de santé depuis l'app iOS "Health Auto Export" (webhook REST).

Endpoints exposés (montés sous /api par server.py) :
- POST /health-import              reçoit un payload {"data": {"metrics": [...], "workouts": [...]}}
- GET  /health-import/metrics       pagination par curseur pour que l'app récupère les métriques importées
- GET  /health-import/workouts      idem pour les séances

Authentification : un seul token secret partagé (pas de comptes utilisateurs dans IronFlow — l'app
est mono-utilisateur/local, voir gym-storage.ts côté frontend), vérifié via `Authorization: Bearer
<token>` avant tout traitement du payload.

`user_id` est fixé à une constante : il n'existe aucun système de comptes IronFlow aujourd'hui, mais
le champ est déjà là pour ne jamais avoir à remodeler le schéma Mongo si de vrais comptes arrivent.
"""

import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from pymongo import UpdateOne

from database import db

DEFAULT_USER_ID = "default_user"
BATCH_SIZE = 500

router = APIRouter(prefix="/health-import", tags=["health-import"])
_bearer = HTTPBearer(auto_error=False)


# ---------- Auth ----------

def _expected_token() -> str:
    token = os.environ.get("HEALTH_IMPORT_TOKEN")
    if not token:
        # Refuser plutôt que d'accepter n'importe quel token si la variable
        # d'env n'est pas configurée — jamais de mode "ouvert" par accident.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HEALTH_IMPORT_TOKEN n'est pas configuré côté serveur.",
        )
    return token


async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> str:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization: Bearer <token> manquant.",
        )
    expected = _expected_token()
    if not secrets.compare_digest(credentials.credentials, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide.",
        )
    return DEFAULT_USER_ID


# ---------- Modèles (permissifs — Health Auto Export ajoute des champs
# additionnels selon le type de métrique ; on ne veut jamais rejeter un
# payload légitime pour un champ non prévu) ----------

class MetricSample(BaseModel):
    model_config = ConfigDict(extra="allow")
    date: str
    qty: Optional[float] = None


class Metric(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    units: Optional[str] = None
    data: List[MetricSample] = Field(default_factory=list)


class Workout(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    start: str
    end: Optional[str] = None
    duration: Optional[float] = None
    totalEnergyBurned: Optional[Dict[str, Any]] = None


class HealthExportPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    metrics: List[Metric] = Field(default_factory=list)
    workouts: List[Workout] = Field(default_factory=list)


class HealthImportRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    data: HealthExportPayload


def _extras(model: BaseModel, known_fields: set) -> Dict[str, Any]:
    """Champs additionnels non modélisés explicitement (extra='allow'), pour ne
    jamais perdre silencieusement une donnée envoyée par Health Auto Export."""
    dumped = model.model_dump()
    return {k: v for k, v in dumped.items() if k not in known_fields}


async def _upsert_items(
    collection,
    items: List[Dict[str, Any]],
    identity_fields: Tuple[str, ...],
    content_fields: Tuple[str, ...],
    user_id: str,
) -> Dict[str, int]:
    """Upsert idempotent avec classification honnête insert/update/unchanged.

    Health Auto Export renvoie régulièrement des fenêtres historiques qui se
    chevauchent (l'automation resynchronise plusieurs jours à chaque
    déclenchement) — un renvoi identique NE DOIT PAS faire avancer
    `ingested_at` (le curseur de synchro de l'app), sinon chaque appareil
    re-télécharge indéfiniment des données qu'il a déjà. On pré-lit donc les
    documents existants pour ne toucher que ce qui a réellement changé.
    """
    if not items:
        return {"received": 0, "inserted": 0, "updated": 0, "unchanged": 0}

    values_by_field = {f: list({it[f] for it in items}) for f in identity_fields}
    query = {"user_id": user_id, **{f: {"$in": v} for f, v in values_by_field.items()}}
    projection = {f: 1 for f in identity_fields + content_fields}
    existing_docs = await collection.find(query, projection).to_list(length=None)
    existing_by_key = {tuple(d[f] for f in identity_fields): d for d in existing_docs}

    now = datetime.now(timezone.utc)
    ops: List[UpdateOne] = []
    inserted = updated = unchanged = 0
    # Si le même échantillon apparaît 2x dans CE payload (rare mais pas
    # invalide), `existing_by_key` est mis à jour à chaque passage : la 2e
    # occurrence se compare à la 1re (déjà "vue"), pas aux données Mongo
    # d'avant l'appel — comportement correct sans suivi supplémentaire.
    for it in items:
        key = tuple(it[f] for f in identity_fields)
        content = {f: it[f] for f in content_fields}
        identity = {f: it[f] for f in identity_fields}
        existing = existing_by_key.get(key)
        if existing is None:
            ops.append(
                UpdateOne(
                    {"user_id": user_id, **identity},
                    {"$set": {**content, "ingested_at": now}},
                    upsert=True,
                )
            )
            existing_by_key[key] = {**identity, **content}  # évite un double "inserted" si dupliqué dans le payload
            inserted += 1
        elif any(existing.get(f) != content[f] for f in content_fields):
            ops.append(
                UpdateOne({"user_id": user_id, **identity}, {"$set": {**content, "ingested_at": now}})
            )
            existing_by_key[key] = {**identity, **content}
            updated += 1
        else:
            unchanged += 1

    for i in range(0, len(ops), BATCH_SIZE):
        batch = ops[i : i + BATCH_SIZE]
        if batch:
            await collection.bulk_write(batch, ordered=False)

    return {"received": len(items), "inserted": inserted, "updated": updated, "unchanged": unchanged}


@router.post("")
async def import_health_data(
    payload: HealthImportRequest,
    user_id: str = Depends(verify_token),
):
    metric_items: List[Dict[str, Any]] = []
    for metric in payload.data.metrics:
        for sample in metric.data:
            if not sample.date:
                continue
            metric_items.append(
                {
                    "metric_name": metric.name,
                    "date": sample.date,
                    "units": metric.units,
                    "qty": sample.qty,
                    "raw": _extras(sample, {"date", "qty"}),
                }
            )

    workout_items: List[Dict[str, Any]] = []
    for workout in payload.data.workouts:
        if not workout.start:
            continue
        energy = workout.totalEnergyBurned or {}
        workout_items.append(
            {
                "name": workout.name,
                "start": workout.start,
                "end": workout.end,
                "duration": workout.duration,
                "energy_kcal": energy.get("qty"),
                "raw": _extras(workout, {"name", "start", "end", "duration", "totalEnergyBurned"}),
            }
        )

    metrics_result = await _upsert_items(
        db.health_metrics, metric_items, ("metric_name", "date"), ("units", "qty", "raw"), user_id
    )
    workouts_result = await _upsert_items(
        db.health_workouts,
        workout_items,
        ("name", "start"),
        ("end", "duration", "energy_kcal", "raw"),
        user_id,
    )

    return {
        "status": "ok",
        "metrics": metrics_result,
        "workouts": workouts_result,
    }


# ---------- Lecture paginée (consommée par l'app IronFlow) ----------

def _encode_cursor(ingested_at: datetime, doc_id: ObjectId) -> str:
    return f"{ingested_at.isoformat()}|{doc_id}"


def _decode_cursor(since: Optional[str]) -> Optional[Tuple[datetime, ObjectId]]:
    if not since:
        return None
    try:
        ts_part, id_part = since.split("|", 1)
        return datetime.fromisoformat(ts_part), ObjectId(id_part)
    except (ValueError, InvalidId, TypeError):
        raise HTTPException(status_code=422, detail="Paramètre 'since' invalide (curseur opaque attendu).")


async def _paginated(collection, projection: Dict[str, int], since: Optional[str], limit: int, user_id: str):
    # Curseur composé (ingested_at, _id) — pas seulement `ingested_at` (les
    # échantillons d'un même import partagent le même horodatage, ce qui
    # sauterait des documents avec un curseur simple), et pas seulement `_id`
    # (une mise à jour d'un document existant doit redevenir visible pour un
    # client déjà passé au-delà de son `_id` d'origine — seul `ingested_at`
    # avance dans ce cas, `_id` reste fixe).
    cursor = _decode_cursor(since)
    query: Dict[str, Any] = {"user_id": user_id}
    if cursor is not None:
        ts, oid = cursor
        query["$or"] = [{"ingested_at": {"$gt": ts}}, {"ingested_at": ts, "_id": {"$gt": oid}}]
    projection = {**projection, "_id": 1, "ingested_at": 1}
    capped_limit = max(1, min(limit, 2000))
    docs = (
        await collection.find(query, projection)
        .sort([("ingested_at", 1), ("_id", 1)])
        .limit(capped_limit + 1)
        .to_list(length=capped_limit + 1)
    )
    has_more = len(docs) > capped_limit
    docs = docs[:capped_limit]
    # Le curseur doit toujours avancer jusqu'au dernier document RENVOYÉ, que
    # d'autres documents restent après ou non — le conditionner à `has_more`
    # (bug corrigé ici) faisait que la dernière page d'une synchro ne faisait
    # jamais avancer le curseur stocké côté app, qui re-redemandait donc
    # indéfiniment cette même page à chaque synchro suivante (inoffensif
    # grâce à la déduplication côté app, mais jamais résolu).
    next_cursor = _encode_cursor(docs[-1]["ingested_at"], docs[-1]["_id"]) if docs else None
    for d in docs:
        d.pop("_id", None)
        d.pop("user_id", None)
        d["ingested_at"] = d["ingested_at"].isoformat()
    return {"items": docs, "next_cursor": next_cursor, "has_more": has_more}


@router.get("/metrics")
async def list_metrics(
    since: Optional[str] = Query(None, description="Curseur opaque renvoyé par un appel précédent"),
    limit: int = Query(500, ge=1, le=2000),
    user_id: str = Depends(verify_token),
):
    return await _paginated(
        db.health_metrics,
        {"metric_name": 1, "units": 1, "date": 1, "qty": 1, "raw": 1},
        since,
        limit,
        user_id,
    )


@router.get("/workouts")
async def list_workouts(
    since: Optional[str] = Query(None, description="Curseur opaque renvoyé par un appel précédent"),
    limit: int = Query(500, ge=1, le=2000),
    user_id: str = Depends(verify_token),
):
    return await _paginated(
        db.health_workouts,
        {"name": 1, "start": 1, "end": 1, "duration": 1, "energy_kcal": 1, "raw": 1},
        since,
        limit,
        user_id,
    )


async def ensure_indexes() -> None:
    await db.health_metrics.create_index(
        [("user_id", 1), ("metric_name", 1), ("date", 1)], unique=True, name="uniq_metric_sample"
    )
    await db.health_metrics.create_index(
        [("user_id", 1), ("ingested_at", 1), ("_id", 1)], name="sync_cursor_metrics"
    )
    await db.health_workouts.create_index(
        [("user_id", 1), ("name", 1), ("start", 1)], unique=True, name="uniq_workout"
    )
    await db.health_workouts.create_index(
        [("user_id", 1), ("ingested_at", 1), ("_id", 1)], name="sync_cursor_workouts"
    )
