"""
AI Service - point d'entrée unique pour les appels IA.

Gère le provider configuré et expose une interface simple pour l'application.
"""
import os
import logging
from typing import Dict, Optional, Any
from .providers import AIProvider, AIResponse, NVIDIAProvider, GroqProvider

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    """Exception levée quand le provider IA échoue."""
    pass


class AITextResult:
    """Résultat de génération de texte (format compatible avec le router existant)."""
    def __init__(self, content: str, model: str, tokens_used: int = 0):
        self.content = content
        self.model = model
        self.tokens_used = tokens_used


class AIService:
    """
    Service IA principal.

    Initialise automatiquement le provider configuré via AI_PROVIDER.
    Par défaut : NVIDIA.

    Usage:
        service = AIService()
        response = await service.chat("Analyse ce programme...")
    """

    def __init__(self):
        provider_name = os.getenv("AI_PROVIDER", "nvidia").lower()

        if provider_name == "nvidia":
            self.provider: AIProvider = NVIDIAProvider()
        elif provider_name == "groq":
            self.provider: AIProvider = GroqProvider()
        else:
            raise ValueError(
                f"Provider IA inconnu : {provider_name}. "
                f"Providers supportés : nvidia, groq"
            )

        self.provider_name = provider_name
        logger.info(f"AIService initialisé avec provider : {provider_name}")

    async def chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
    ) -> AIResponse:
        """Appel IA simple avec un prompt."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        return await self.provider.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def chat_with_messages(
        self,
        messages: list[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
    ) -> AIResponse:
        """Appel IA avec une liste de messages complète."""
        return await self.provider.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    # ---------- API compatible avec le router existant ----------

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.1,
    ) -> AITextResult:
        """
        Génère du texte (API compatible avec routers/ai.py existant).

        Args:
            prompt: Le prompt utilisateur
            system_prompt: Instructions système optionnelles
            max_tokens: Limite de tokens de sortie
            temperature: Température de génération

        Returns:
            AITextResult avec le contenu et les métadonnées

        Raises:
            AIProviderError: Si l'appel échoue
        """
        try:
            response = await self.chat(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            tokens_used = response.usage.get("total_tokens", 0) if response.usage else 0
            return AITextResult(
                content=response.content,
                model=response.model,
                tokens_used=tokens_used,
            )
        except Exception as e:
            logger.error(f"Erreur generate_text : {e}")
            raise AIProviderError(str(e)) from e

    async def health_check(self) -> bool:
        """
        Vérifie que le service IA est opérationnel.

        Returns:
            True si le service répond, False sinon
        """
        try:
            # Appel léger pour vérifier la connectivité
            result = await self.generate_text(
                prompt="Hi",
                max_tokens=5,
            )
            return bool(result.content)
        except Exception as e:
            logger.warning(f"Health check échoué : {e}")
            return False

    async def analyze_pdf_program(
        self,
        pdf_text: str,
        system_prompt: str,
        user_prompt: str,
    ) -> AIResponse:
        """
        Analyse spécifique d'un programme PDF.

        Args:
            pdf_text: Texte extrait du PDF
            system_prompt: Prompt système (règles d'extraction)
            user_prompt: Prompt utilisateur avec le contenu du PDF

        Returns:
            AIResponse avec le JSON structuré
        """
        return await self.chat(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.1,
            max_tokens=4096,
        )


# Instance globale du service (singleton)
ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """
    Retourne l'instance globale du service IA.

    Lazy initialization : créé au premier appel.
    Réutilisé ensuite.
    """
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service

