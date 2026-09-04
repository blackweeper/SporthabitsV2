"""
NVIDIA AI provider implementation.

Utilise l'API NVIDIA NIM pour les appels IA.
Documentation: https://docs.api.nvidia.com/nim/reference/llm-apis
"""
import os
import logging
from typing import Dict, Optional, Any
import httpx
from .base import AIProvider, AIResponse

logger = logging.getLogger(__name__)


class NVIDIAProvider(AIProvider):
    """
    Provider NVIDIA NIM.

    Configuration via variables d'environnement :
    - NVIDIA_API_KEY : clé API (obligatoire)
    - NVIDIA_BASE_URL : base URL (défaut: https://integrate.api.nvidia.com/v1)
    - NVIDIA_MODEL : modèle à utiliser (défaut: meta/llama-3.1-70b-instruct)
    - NVIDIA_TIMEOUT : timeout en secondes (défaut: 120)
    """

    def __init__(self):
        self.api_key = os.getenv("NVIDIA_API_KEY")
        self.base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
        self.timeout = int(os.getenv("NVIDIA_TIMEOUT", "120"))

        self.validate_config()

    def validate_config(self) -> bool:
        """
        Vérifie que la configuration NVIDIA est valide.

        Raises:
            ValueError: Si la configuration est invalide
        """
        if not self.api_key:
            raise ValueError(
                "NVIDIA_API_KEY manquante. "
                "Configurez-la dans .env (voir .env.example)"
            )

        if not self.api_key.startswith("nvapi-"):
            logger.warning(
                "NVIDIA_API_KEY ne commence pas par 'nvapi-'. "
                "Vérifiez que la clé est valide."
            )

        if not self.base_url:
            raise ValueError("NVIDIA_BASE_URL ne peut pas être vide")

        if not self.model:
            raise ValueError("NVIDIA_MODEL ne peut pas être vide")

        logger.info(f"NVIDIA provider configuré : modèle={self.model}, base_url={self.base_url}")
        return True

    async def chat_completion(
        self,
        messages: list[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        Appel IA via NVIDIA NIM API.

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

        logger.info(f"Appel NVIDIA API : modèle={self.model}, messages={len(messages)}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()

                data = response.json()

                # Extraction du contenu
                if "choices" not in data or len(data["choices"]) == 0:
                    raise ValueError("Réponse NVIDIA invalide : aucun 'choices'")

                content = data["choices"][0]["message"]["content"]

                # Extraction des métadonnées d'usage
                usage = data.get("usage", {})

                logger.info(
                    f"NVIDIA API succès : tokens={usage.get('total_tokens', 'N/A')}"
                )

                return AIResponse(
                    content=content,
                    model=data.get("model", self.model),
                    usage=usage,
                    raw_response=data,
                )

            except httpx.HTTPStatusError as e:
                # Erreur HTTP (401, 429, 500, etc.)
                logger.error(f"Erreur HTTP NVIDIA API : {e.response.status_code}")
                logger.error(f"Détails : {e.response.text}")

                if e.response.status_code == 401:
                    raise ValueError(
                        "NVIDIA_API_KEY invalide. Vérifiez votre clé dans .env"
                    ) from e
                elif e.response.status_code == 429:
                    raise ValueError(
                        "Quota NVIDIA dépassé. Attendez avant de réessayer."
                    ) from e
                else:
                    raise

            except httpx.TimeoutException:
                logger.error(f"Timeout NVIDIA API après {self.timeout}s")
                raise ValueError(
                    f"Timeout NVIDIA API après {self.timeout}s. "
                    "Augmentez NVIDIA_TIMEOUT dans .env si nécessaire."
                )

            except Exception as e:
                logger.error(f"Erreur inattendue NVIDIA API : {e}")
                raise
