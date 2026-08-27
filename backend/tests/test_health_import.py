"""
Suite de tests pour l'endpoint d'import de données de santé (Health Auto Export).

Aucun MongoDB réel requis : `mongomock_motor.AsyncMongoMockClient` fournit une
base en mémoire compatible motor, injectée à la place de `database.db` via
monkeypatch avant chaque test.
"""

import os

os.environ.setdefault("HEALTH_IMPORT_TOKEN", "test-token")

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import health_import
import server

TOKEN = "test-token"
AUTH = {"Authorization": f"Bearer {TOKEN}"}

SAMPLE_PAYLOAD = {
    "data": {
        "metrics": [
            {
                "name": "heart_rate",
                "units": "bpm",
                "data": [
                    {"date": "2024-01-01T12:00:00", "qty": 72},
                    {"date": "2024-01-01T13:00:00", "qty": 75},
                ],
            }
        ],
        "workouts": [
            {
                "name": "Functional Strength Training",
                "start": "2024-01-01T10:00:00",
                "end": "2024-01-01T11:00:00",
                "duration": 3600,
                "totalEnergyBurned": {"qty": 350, "units": "kcal"},
            }
        ],
    }
}


@pytest.fixture(autouse=True)
def fake_db(monkeypatch):
    mongo_client = AsyncMongoMockClient()
    fake = mongo_client["test_db"]
    monkeypatch.setattr(health_import, "db", fake)
    yield fake


@pytest.fixture
def client():
    with TestClient(server.app) as c:
        yield c


def test_rejects_missing_token(client):
    r = client.post("/api/health-import", json=SAMPLE_PAYLOAD)
    assert r.status_code == 401


def test_rejects_bad_token(client):
    r = client.post(
        "/api/health-import", json=SAMPLE_PAYLOAD, headers={"Authorization": "Bearer wrong"}
    )
    assert r.status_code == 401


def test_rejects_malformed_payload(client):
    r = client.post("/api/health-import", json={"data": {"metrics": "not-a-list"}}, headers=AUTH)
    assert r.status_code == 422


def test_import_success_reports_counts(client):
    r = client.post("/api/health-import", json=SAMPLE_PAYLOAD, headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["metrics"] == {"received": 2, "inserted": 2, "updated": 0, "unchanged": 0}
    assert body["workouts"] == {"received": 1, "inserted": 1, "updated": 0, "unchanged": 0}


def test_reimport_identical_payload_is_idempotent(client):
    client.post("/api/health-import", json=SAMPLE_PAYLOAD, headers=AUTH)
    r = client.post("/api/health-import", json=SAMPLE_PAYLOAD, headers=AUTH)
    body = r.json()
    assert body["metrics"] == {"received": 2, "inserted": 0, "updated": 0, "unchanged": 2}
    assert body["workouts"] == {"received": 1, "inserted": 0, "updated": 0, "unchanged": 1}

    stored = client.get("/api/health-import/metrics", headers=AUTH).json()
    assert len(stored["items"]) == 2  # jamais de doublon après 2 imports identiques


def test_resend_with_changed_value_counts_as_updated(client):
    client.post("/api/health-import", json=SAMPLE_PAYLOAD, headers=AUTH)
    corrected = {
        "data": {
            "metrics": [
                {
                    "name": "heart_rate",
                    "units": "bpm",
                    "data": [{"date": "2024-01-01T12:00:00", "qty": 80}],
                }
            ],
            "workouts": [],
        }
    }
    r = client.post("/api/health-import", json=corrected, headers=AUTH)
    body = r.json()
    assert body["metrics"] == {"received": 1, "inserted": 0, "updated": 1, "unchanged": 0}

    stored = client.get("/api/health-import/metrics", headers=AUTH).json()
    updated_sample = next(i for i in stored["items"] if i["date"] == "2024-01-01T12:00:00")
    assert updated_sample["qty"] == 80


def test_get_metrics_paginates_without_skipping_same_timestamp_docs(client):
    # Les 2 échantillons de SAMPLE_PAYLOAD partagent le même `ingested_at`
    # (calculé une fois par requête POST) — le curseur doit être basé sur
    # l'_id Mongo, pas sur ce timestamp, sinon le 2e élément serait sauté.
    client.post("/api/health-import", json=SAMPLE_PAYLOAD, headers=AUTH)

    page1 = client.get("/api/health-import/metrics?limit=1", headers=AUTH).json()
    assert len(page1["items"]) == 1
    assert page1["has_more"] is True
    assert page1["next_cursor"] is not None

    page2 = client.get(
        f"/api/health-import/metrics?limit=1&since={page1['next_cursor']}", headers=AUTH
    ).json()
    assert len(page2["items"]) == 1
    assert page2["has_more"] is False
    assert page1["items"][0]["date"] != page2["items"][0]["date"]


def test_get_workouts_returns_stored_fields(client):
    client.post("/api/health-import", json=SAMPLE_PAYLOAD, headers=AUTH)
    body = client.get("/api/health-import/workouts", headers=AUTH).json()
    assert len(body["items"]) == 1
    item = body["items"][0]
    assert item["name"] == "Functional Strength Training"
    assert item["energy_kcal"] == 350
    assert item["duration"] == 3600


def test_get_endpoints_also_require_auth(client):
    assert client.get("/api/health-import/metrics").status_code == 401
    assert client.get("/api/health-import/workouts").status_code == 401
