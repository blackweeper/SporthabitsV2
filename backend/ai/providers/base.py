"""
Base abstraction for AI providers.

Permet de changer facilement de provider (NVIDIA, OpenAI, Anthropic, etc.)
sans modifier toute l'application.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel


class AIProviderError(Exception):
    """Exception levée quand un provider IA échoue."""
    pass


class AIResponse(BaseModel):
    """Réponse normalisée d'un provider IA."""
    content: str
    model: str
    # Dict[str, Any] et non Dict[str, int] : certains providers (Groq) renvoient
    # des champs d'usage non-entiers (queue_time/prompt_time/... en float,
    # completion_tokens_details en objet imbriqué). On ne consomme ici que
    # usage.get("total_tokens"), donc pas besoin de typer strictement le reste.
    usage: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None


class AIProvider(ABC):
    """
    Classe abstraite pour tous les providers IA.

    Un provider doit implémenter :
    - validate_config() : vérifier que la configuration est valide
    - chat_completion() : appel IA standard
    """

    @abstractmethod
    def validate_config(self) -> bool:
        """
        Vérifie que la configuration du provider est valide.

        Lève une exception si la config est invalide.
        Retourne True si tout est OK.
        """
        pass

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        Appel IA standard avec messages.

        Args:
            messages: Liste de messages au format OpenAI
                      [{"role": "system", "content": "..."}, ...]
            temperature: Température de génération (0.0 à 1.0)
            max_tokens: Limite de tokens de sortie
            **kwargs: Paramètres spécifiques au provider

        Returns:
            AIResponse normalisée

        Raises:
            Exception si l'appel échoue
        """
        pass
