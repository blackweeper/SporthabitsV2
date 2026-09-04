"""
Tests Groq — validation de la connexion IA.

Même structure que test_ai_nvidia.py : teste le vrai GroqProvider
(constructeur sans argument, lecture des variables d'env, chat_completion),
pas une API imaginée.

Lancement :
    cd backend
    pytest tests/test_ai_groq.py -v
"""
import json

import httpx
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from ai.providers.groq import GroqProvider


def _mock_response(status_code: int, json_data: dict | None = None, text: str = ""):
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
def groq(monkeypatch):
    """Instance GroqProvider configurée via les variables d'environnement."""
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")
    monkeypatch.setenv("GROQ_TIMEOUT", "5")
    return GroqProvider()


@pytest.mark.asyncio
async def test_chat_completion_ok(groq):
    mock_resp = _mock_response(200, {
        "choices": [{"message": {"content": "Bonjour !"}}],
        "usage": {"total_tokens": 15},
        "model": "openai/gpt-oss-120b",
    })
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await groq.chat_completion(messages=[{"role": "user", "content": "Dis bonjour"}])
        assert result.content == "Bonjour !"
        assert result.usage["total_tokens"] == 15


@pytest.mark.asyncio
async def test_chat_completion_json_payload(groq):
    mock_resp = _mock_response(200, {
        "choices": [{"message": {"content": '{"exercises": [{"name": "Squat"}]}'}}],
        "usage": {"total_tokens": 25},
        "model": "openai/gpt-oss-120b",
    })
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await groq.chat_completion(messages=[{"role": "user", "content": "Extrais les exercices"}])
        parsed = json.loads(result.content)
        assert "exercises" in parsed


@pytest.mark.asyncio
async def test_auth_error(groq):
    mock_resp = _mock_response(401, text="Unauthorized")
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError, match="invalide"):
            await groq.chat_completion(messages=[{"role": "user", "content": "Test"}])


@pytest.mark.asyncio
async def test_rate_limit_error(groq):
    mock_resp = _mock_response(429, text="Rate limited")
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError, match="Quota"):
            await groq.chat_completion(messages=[{"role": "user", "content": "Test"}])


@pytest.mark.asyncio
async def test_timeout_error(groq):
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(ValueError, match="Timeout"):
            await groq.chat_completion(messages=[{"role": "user", "content": "Test"}])


@pytest.mark.asyncio
async def test_empty_choices_error(groq):
    mock_resp = _mock_response(200, {"choices": []})
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError, match="choices"):
            await groq.chat_completion(messages=[{"role": "user", "content": "Test"}])


def test_missing_api_key_raises(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(ValueError, match="GROQ_API_KEY"):
        GroqProvider()


@pytest.mark.asyncio
async def test_ai_service_uses_groq_when_configured(monkeypatch):
    """AIService(AI_PROVIDER=groq) doit instancier GroqProvider, pas NVIDIAProvider."""
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_key")
    from ai.service import AIService

    service = AIService()
    assert service.provider_name == "groq"
    assert isinstance(service.provider, GroqProvider)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
