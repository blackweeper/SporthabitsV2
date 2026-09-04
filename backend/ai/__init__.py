"""AI package for IRONFLOW."""
from .service import AIService, get_ai_service, AIProviderError, AITextResult
from .providers import AIProvider, AIResponse, NVIDIAProvider

# NOTE: pas d'instanciation ici — construire NVIDIAProvider() au chargement du
# package lève une exception si NVIDIA_API_KEY est absente, ce qui plantait
# le démarrage de TOUTE l'app (server.py importe ce package au niveau module).
# Utiliser get_ai_service() pour obtenir l'instance paresseuse (lazy).

__all__ = [
    "AIService",
    "get_ai_service",
    "AIProviderError",
    "AITextResult",
    "AIProvider",
    "AIResponse",
    "NVIDIAProvider",
]
