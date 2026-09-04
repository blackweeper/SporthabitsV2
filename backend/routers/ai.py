"""
Router AI — Endpoints pour les fonctionnalités IA d'IronFlow.

Architecture sécurisée :
- La clé NVIDIA reste STRICTEMENT côté serveur
- Le frontend n'appelle que ces endpoints, jamais NVIDIA directement
- Les erreurs sont masquées côté frontend (pas de détails sensibles)
- Chaque endpoint nécessite Authorization: Bearer <HEALTH_IMPORT_TOKEN> (même
  token que /api/health-import — voir health_import.verify_token) pour éviter
  qu'un appel non authentifié ne consomme le quota NVIDIA.

Endpoints :
- GET  /api/ai/health      — vérifie la connexion IA
- POST /api/ai/test        — test simple de génération
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ai import get_ai_service, AIProviderError
from health_import import verify_token

router = APIRouter(prefix="/ai", tags=["ai"])
log = logging.getLogger("api.ai")


@router.get("/health")
async def ai_health(user_id: str = Depends(verify_token)):
    """
    Vérifie que le service IA est opérationnel.

    Retourne un statut simplifié (pas de détails sensibles).
    """
    try:
        service = get_ai_service()
    except Exception as e:
        log.error(f"[AI Health] Service IA non initialisable : {e}")
        return {
            "status": "error",
            "provider": None,
            "message": "Service IA non configuré côté serveur",
        }

    try:
        is_healthy = await service.health_check()
        if is_healthy:
            return {
                "status": "ok",
                "provider": service.provider_name,
                "message": "Service IA opérationnel",
            }
        else:
            return {
                "status": "error",
                "provider": service.provider_name,
                "message": "Impossible de contacter le service IA",
            }
    except Exception as e:
        log.error(f"[AI Health] Erreur inattendue : {e}")
        return {
            "status": "error",
            "provider": service.provider_name,
            "message": "Erreur interne du service IA",
        }


@router.post("/test")
async def ai_test_generation(prompt: Optional[str] = None, user_id: str = Depends(verify_token)):
    """
    Test simple de génération IA.

    Utilisé uniquement en développement/test pour valider la connexion.
    Ne pas utiliser en production.
    """
    test_prompt = prompt or "Dis 'Bonjour' en français, rien d'autre."

    try:
        service = get_ai_service()
        result = await service.generate_text(
            prompt=test_prompt,
            max_tokens=50,
        )

        return {
            "status": "ok",
            "response": result.content,
            "tokens_used": result.tokens_used,
            "model": result.model,
        }

    except AIProviderError as e:
        log.warning(f"[AI Test] Erreur provider : {e}")
        # Message générique pour le frontend — pas de détails internes
        raise HTTPException(
            status_code=503,
            detail="Impossible de contacter le service IA. Réessaie dans quelques instants.",
        )
    except Exception as e:
        log.error(f"[AI Test] Erreur inattendue : {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne du service IA.",
        )
