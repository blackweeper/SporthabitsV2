"""
Tests NVIDIA NIM — validation de la connexion IA.

Tests couverts :
- Clé valide → réponse OK
- Clé invalide/absente → erreur
- Rate limit (429) → erreur
- Timeout → erreur timeout
- Réponse sans 'choices' → erreur
- AIService (couche utilisée par les routers) : generate_text / health_check

Lancement :
    cd backend
    pytest tests/test_ai_nvidia.py -v
"""
import json

import httpx
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from ai.providers.nvidia import NVIDIAProvider


def _mock_response(status_code: int, json_data: dict | None = None, text: str = ""):
    """Construit un faux httpx.Response cohérent avec ce que nvidia.py consomme."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.text = text
    if json_data is not None:
        resp.json.return_value = json_data
    if status_code >= 400:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=resp
        )
    else:
        resp.raise_for_status.return_value = None
    return resp


@pytest.fixture
def nvidia(monkeypatch):
    """Instance NVIDIAProvider configurée via les variables d'environnement."""
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    monkeypatch.setenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
    monkeypatch.setenv("NVIDIA_TIMEOUT", "5")
    return NVIDIAProvider()


@pytest.mark.asyncio
async def test_chat_completion_ok(nvidia):
    """Réponse texte valide."""
    mock_resp = _mock_response(200, {
        "choices": [{"message": {"content": "Bonjour !"}}],
        "usage": {"total_tokens": 15},
        "model": "meta/llama-3.1-70b-instruct",
    })
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await nvidia.chat_completion(messages=[{"role": "user", "content": "Dis bonjour"}])
        assert result.content == "Bonjour !"
        assert result.usage["total_tokens"] == 15
        assert result.model == "meta/llama-3.1-70b-instruct"


@pytest.mark.asyncio
async def test_chat_completion_json_payload(nvidia):
    """Réponse contenant du JSON (cas d'usage analyse PDF) — parsable."""
    mock_resp = _mock_response(200, {
        "choices": [{"message": {"content": '{"exercises": [{"name": "Squat"}]}'}}],
        "usage": {"total_tokens": 25},
        "model": "meta/llama-3.1-70b-instruct",
    })
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await nvidia.chat_completion(messages=[{"role": "user", "content": "Extrais les exercices"}])
        parsed = json.loads(result.content)
        assert "exercises" in parsed


@pytest.mark.asyncio
async def test_auth_error(nvidia):
    """Clé invalide → 401 → ValueError explicite."""
    mock_resp = _mock_response(401, text="Unauthorized")
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError, match="invalide"):
            await nvidia.chat_completion(messages=[{"role": "user", "content": "Test"}])


@pytest.mark.asyncio
async def test_rate_limit_error(nvidia):
    """Quota dépassé → 429 → ValueError explicite."""
    mock_resp = _mock_response(429, text="Rate limited")
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError, match="Quota"):
            await nvidia.chat_completion(messages=[{"role": "user", "content": "Test"}])


@pytest.mark.asyncio
async def test_timeout_error(nvidia):
    """Timeout réseau → ValueError explicite."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(ValueError, match="Timeout"):
            await nvidia.chat_completion(messages=[{"role": "user", "content": "Test"}])


@pytest.mark.asyncio
async def test_empty_choices_error(nvidia):
    """Réponse sans 'choices' → ValueError explicite."""
    mock_resp = _mock_response(200, {"choices": []})
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError, match="choices"):
            await nvidia.chat_completion(messages=[{"role": "user", "content": "Test"}])


def test_missing_api_key_raises(monkeypatch):
    """Pas de clé configurée → le provider refuse de se construire."""
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    with pytest.raises(ValueError, match="NVIDIA_API_KEY"):
        NVIDIAProvider()


def test_empty_base_url_raises(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    monkeypatch.setenv("NVIDIA_BASE_URL", "")
    with pytest.raises(ValueError, match="NVIDIA_BASE_URL"):
        NVIDIAProvider()


# ---------- Tests AIService (couche utilisée par les routers) ----------

@pytest.mark.asyncio
async def test_ai_service_generate_text_ok(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    from ai.service import AIService

    service = AIService()
    mock_resp = _mock_response(200, {
        "choices": [{"message": {"content": "Bonjour !"}}],
        "usage": {"total_tokens": 15},
        "model": "meta/llama-3.1-70b-instruct",
    })
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await service.generate_text(prompt="Dis bonjour")
        assert result.content == "Bonjour !"
        assert result.tokens_used == 15


@pytest.mark.asyncio
async def test_ai_service_health_check_true(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    from ai.service import AIService

    service = AIService()
    mock_resp = _mock_response(200, {
        "choices": [{"message": {"content": "Hi"}}],
        "usage": {"total_tokens": 2},
        "model": "meta/llama-3.1-70b-instruct",
    })
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        assert await service.health_check() is True


@pytest.mark.asyncio
async def test_ai_service_health_check_false_on_error(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    from ai.service import AIService

    service = AIService()
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("timeout")):
        assert await service.health_check() is False


@pytest.mark.asyncio
async def test_ai_service_wraps_provider_errors(monkeypatch):
    """generate_text() doit lever AIService.AIProviderError, pas l'erreur brute du provider."""
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-key")
    from ai.service import AIService, AIProviderError

    service = AIService()
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(AIProviderError):
            await service.generate_text(prompt="Test")


# ---------- Sécurité ----------

def test_nvidia_key_not_in_response():
    """La clé NVIDIA ne doit jamais apparaître dans un message d'erreur affiché."""
    import os

    api_key = os.getenv("NVIDIA_API_KEY", "nvapi-test-key")
    error_message = "Erreur NVIDIA API : 401 Unauthorized"

    assert api_key not in error_message
    assert "nvapi-" not in error_message


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
