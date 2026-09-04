"""
Groq AI provider implementation.

Utilise l'API Groq (OpenAI-compatible) pour les appels IA.
Documentation: https://console.groq.com/docs/api-reference
Inférence très rapide, palier gratuit sans carte bancaire — bonne option
pour un usage personnel peu fréquent (voir README).
"""
import os
import logging
from typing import Dict, Optional, Any
import httpx
from .base import AIProvider, AIResponse

logger = logging.getLogger(__name__)


class GroqProvider(AIProvider):
    """
    Provider Groq.

    Configuration via variables d'environnement :
    - GROQ_API_KEY : clé API (obligatoire, commence par 'gsk_')
    - GROQ_BASE_URL : base URL (défaut: https://api.groq.com/openai/v1)
    - GROQ_MODEL : modèle à utiliser (défaut: openai/gpt-oss-120b)
    - GROQ_TIMEOUT : timeout en secondes (défaut: 120)
    """

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        self.timeout = int(os.getenv("GROQ_TIMEOUT", "120"))

        self.validate_config()

    def validate_config(self) -> bool:
        """
        Vérifie que la configuration Groq est valide.

        Raises:
            ValueError: Si la configuration est invalide
        """
        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY manquante. "
                "Configurez-la dans .env (voir .env.example)"
            )

        if not self.api_key.startswith("gsk_"):
            logger.warning(
                "GROQ_API_KEY ne commence pas par 'gsk_'. "
                "Vérifiez que la clé est valide."
            )

        if not self.base_url:
            raise ValueError("GROQ_BASE_URL ne peut pas être vide")

        if not self.model:
            raise ValueError("GROQ_MODEL ne peut pas être vide")

        logger.info(f"Groq provider configuré : modèle={self.model}, base_url={self.base_url}")
        return True

    async def chat_completion(
        self,
        messages: list[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        Appel IA via l'API Groq.

        Args:
            messages: Liste de messages au format OpenAI
            temperature: Température (0.0-1.0)
            max_tokens: Limite de tokens de sortie
            **kwargs: Paramètres supplémentaires (ignorés pour l'instant)

        Returns:
            AIResponse normalisée

        Raises:
            httpx.HTTPStatusError: Si l'API retourne une erreur HTTP
            httpx.TimeoutException: Si le timeout est dépassé
            ValueError: Si la réponse est invalide
        """
        endpoint = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        logger.info(f"Appel Groq API : modèle={self.model}, messages={len(messages)}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()

                data = response.json()

                if "choices" not in data or len(data["choices"]) == 0:
                    raise ValueError("Réponse Groq invalide : aucun 'choices'")

                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})

                logger.info(
                    f"Groq API succès : tokens={usage.get('total_tokens', 'N/A')}"
                )

                return AIResponse(
                    content=content,
                    model=data.get("model", self.model),
                    usage=usage,
                    raw_response=data,
                )

            except httpx.HTTPStatusError as e:
                logger.error(f"Erreur HTTP Groq API : {e.response.status_code}")
                logger.error(f"Détails : {e.response.text}")

                if e.response.status_code == 401:
                    raise ValueError(
                        "GROQ_API_KEY invalide. Vérifiez votre clé dans .env"
                    ) from e
                elif e.response.status_code == 429:
                    raise ValueError(
                        "Quota Groq dépassé. Attendez avant de réessayer."
                    ) from e
                else:
                    raise

            except httpx.TimeoutException:
                logger.error(f"Timeout Groq API après {self.timeout}s")
                raise ValueError(
                    f"Timeout Groq API après {self.timeout}s. "
                    "Augmentez GROQ_TIMEOUT dans .env si nécessaire."
                )

            except Exception as e:
                logger.error(f"Erreur inattendue Groq API : {e}")
                raise
