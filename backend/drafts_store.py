"""
Gestion des drafts d'import PDF dans MongoDB.

Statuts :
- pending : draft créé, en attente de traitement
- processing : analyse IA en cours
- completed : analyse terminée, en attente de review utilisateur
- failed : échec de l'analyse
- validated : programme validé par l'utilisateur et importé

Règle : ANALYZE ≠ IMPORT
L'analyse ne doit JAMAIS modifier les programmes réels.
L'import ne se fait qu'après validation explicite.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Literal
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Collection MongoDB
COLLECTION_NAME = "pdf_drafts"

# Statuts possibles d'un draft
DRAFT_STATUS_PENDING = "pending"
DRAFT_STATUS_PROCESSING = "processing"
DRAFT_STATUS_COMPLETED = "completed"
DRAFT_STATUS_FAILED = "failed"
DRAFT_STATUS_VALIDATED = "validated"


class PDFDraft(BaseModel):
    """Représentation d'un draft d'import PDF."""
    draft_id: Optional[str] = None
    user_id: str
    filename: str
    status: Literal["pending", "processing", "completed", "failed", "validated"]
    created_at: datetime
    updated_at: datetime
    # Contenu extrait du PDF
    extracted_text: Optional[str] = None
    page_count: Optional[int] = None
    # Résultat de l'analyse IA
    analysis: Optional[Dict[str, Any]] = None
    # Erreur éventuelle
    error: Optional[str] = None
    # Métadonnées
    file_size: Optional[int] = None
    model_used: Optional[str] = None


async def create_draft(
    db: AsyncIOMotorDatabase,
    user_id: str,
    filename: str,
    file_size: Optional[int] = None,
) -> str:
    """
    Crée un nouveau draft pour l'import PDF.

    Args:
        db: Base de données MongoDB
        user_id: ID de l'utilisateur
        filename: Nom du fichier PDF
        file_size: Taille du fichier en octets

    Returns:
        ID du draft créé
    """
    from bson import ObjectId

    now = datetime.now(timezone.utc)
    draft = {
        "user_id": user_id,
        "filename": filename,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "extracted_text": None,
        "page_count": None,
        "analysis": None,
        "error": None,
        "file_size": file_size,
        "model_used": None,
    }

    result = await db[COLLECTION_NAME].insert_one(draft)
    draft_id = str(result.inserted_id)

    logger.info(f"Draft créé : {draft_id} pour {filename}")
    return draft_id


async def update_draft_status(
    db: AsyncIOMotorDatabase,
    draft_id: str,
    status: str,
    **kwargs
) -> bool:
    """
    Met à jour le statut et/ou d'autres champs d'un draft.

    Args:
        db: Base de données MongoDB
        draft_id: ID du draft
        status: Nouveau statut
        **kwargs: Champs supplémentaires à mettre à jour

    Returns:
        True si mis à jour, False si le draft n'existe pas (y compris si
        draft_id n'est pas un ObjectId valide)
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        object_id = ObjectId(draft_id)
    except InvalidId:
        return False

    update_fields = {
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    update_fields.update(kwargs)

    result = await db[COLLECTION_NAME].update_one(
        {"_id": object_id},
        {"$set": update_fields}
    )

    if result.modified_count > 0:
        logger.info(f"Draft {draft_id} mis à jour : status={status}")
        return True
    else:
        logger.warning(f"Draft {draft_id} non trouvé pour mise à jour")
        return False


async def get_draft(
    db: AsyncIOMotorDatabase,
    draft_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Récupère un draft par son ID.

    Args:
        db: Base de données MongoDB
        draft_id: ID du draft

    Returns:
        Le draft ou None si non trouvé (y compris si draft_id n'est pas un
        ObjectId valide)
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        object_id = ObjectId(draft_id)
    except InvalidId:
        return None

    draft = await db[COLLECTION_NAME].find_one({"_id": object_id})

    if draft:
        draft["draft_id"] = str(draft["_id"])
        del draft["_id"]

    return draft


async def list_user_drafts(
    db: AsyncIOMotorDatabase,
    user_id: str,
    status: Optional[str] = None,
    limit: int = 20,
) -> list[Dict[str, Any]]:
    """
    Liste les drafts d'un utilisateur.

    Args:
        db: Base de données MongoDB
        user_id: ID de l'utilisateur
        status: Filtrer par statut optionnel
        limit: Nombre maximum de drafts à retourner

    Returns:
        Liste des drafts
    """
    query = {"user_id": user_id}
    if status:
        query["status"] = status

    cursor = db[COLLECTION_NAME].find(query).sort("created_at", -1).limit(limit)
    drafts = []

    async for draft in cursor:
        draft["draft_id"] = str(draft["_id"])
        del draft["_id"]
        drafts.append(draft)

    return drafts


async def delete_draft(
    db: AsyncIOMotorDatabase,
    draft_id: str,
) -> bool:
    """
    Supprime un draft.

    Args:
        db: Base de données MongoDB
        draft_id: ID du draft

    Returns:
        True si supprimé, False si non trouvé (y compris si draft_id n'est
        pas un ObjectId valide)
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        object_id = ObjectId(draft_id)
    except InvalidId:
        return False

    result = await db[COLLECTION_NAME].delete_one({"_id": object_id})

    if result.deleted_count > 0:
        logger.info(f"Draft {draft_id} supprimé")
        return True
    else:
        logger.warning(f"Draft {draft_id} non trouvé pour suppression")
        return False
