"""
Router FastAPI pour l'import de programmes PDF via IA.

Pipeline :
POST /api/pdf-import/upload  → crée un draft, extrait le texte
POST /api/pdf-import/analyze → lance l'analyse IA sur le draft
GET  /api/pdf-import/draft/{id} → récupère un draft
POST /api/pdf-import/validate/{id} → valide et importe le programme

Règle d'or : ANALYZE ≠ IMPORT
L'analyse ne modifie JAMAIS les programmes réels.
L'import ne se fait qu'après validation explicite de l'utilisateur.
"""
import logging
import json
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel

from database import db as database
from pdf import extract_pdf_text
from ai import get_ai_service
from ai.schemas import ProgramAnalysis
from ai.prompts import build_pdf_analysis_prompt, build_pdf_system_prompt
from health_import import verify_token
import drafts_store

logger = logging.getLogger("api.pdf_import")

router = APIRouter(prefix="/pdf-import", tags=["pdf-import"])


# ---------- Schemas ----------

class UploadResponse(BaseModel):
    draft_id: str
    filename: str
    page_count: int
    total_chars: int
    total_words: int
    needs_ocr: bool
    extracted_text: Optional[str] = None
    message: str


class AnalyzeRequest(BaseModel):
    draft_id: str


class AnalyzeResponse(BaseModel):
    draft_id: str
    status: str
    analysis: Optional[ProgramAnalysis] = None
    message: str


class ValidateRequest(BaseModel):
    draft_id: str
    corrections: Optional[dict] = None  # Corrections utilisateur optionnelles


class ValidateResponse(BaseModel):
    draft_id: str
    program_id: Optional[str] = None
    status: str
    message: str


# ---------- Endpoints ----------

@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), user_id: str = Depends(verify_token)):
    """
    Upload un PDF et crée un draft.

    Le texte est extrait immédiatement (ou détecté comme nécessitant OCR).
    L'analyse IA n'est pas lancée automatiquement.
    """
    # Vérifier l'extension
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF")

    # Sauvegarder temporairement
    content = await file.read()
    file_size = len(content)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        # Extraire le texte
        result = extract_pdf_text(tmp_path)

        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)

        # Créer le draft dans MongoDB
        draft_id = await drafts_store.create_draft(
            db=database,
            user_id=user_id,
            filename=file.filename,
            file_size=file_size,
        )

        # Mettre à jour le draft avec le texte extrait
        await drafts_store.update_draft_status(
            db=database,
            draft_id=draft_id,
            status="pending",
            extracted_text=result.text if not result.needs_ocr else None,
            page_count=result.page_count,
        )

        message = (
            "PDF reçu. Texte extrait avec succès."
            if not result.needs_ocr
            else "PDF reçu mais le texte n'a pas pu être extrait. OCR requis."
        )

        return UploadResponse(
            draft_id=draft_id,
            filename=file.filename,
            page_count=result.page_count,
            total_chars=result.total_chars,
            total_words=result.total_words,
            needs_ocr=result.needs_ocr,
            extracted_text=result.text if not result.needs_ocr else None,
            message=message,
        )

    finally:
        # Nettoyer le fichier temporaire
        try:
            tmp_path.unlink()
        except Exception:
            pass


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_draft(request: AnalyzeRequest, user_id: str = Depends(verify_token)):
    """
    Lance l'analyse IA sur un draft.

    Le PDF est analysé par l'IA selon les règles strictes :
    - Pas d'invention
    - null si info absente
    - JSON strict validé par Pydantic
    """
    db = database
    draft = await drafts_store.get_draft(db, request.draft_id)

    if not draft:
        raise HTTPException(status_code=404, detail="Draft non trouvé")

    if draft["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    if draft["status"] not in ("pending", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"Impossible d'analyser un draft en statut '{draft['status']}'"
        )

    if not draft.get("extracted_text"):
        raise HTTPException(
            status_code=400,
            detail="Aucun texte extrait. Le PDF nécessite probablement un OCR."
        )

    # Marquer comme en cours de traitement
    await drafts_store.update_draft_status(
        db=db,
        draft_id=request.draft_id,
        status="processing",
    )

    try:
        # Appeler l'IA
        ai_service = get_ai_service()
        system_prompt = build_pdf_system_prompt()
        user_prompt = build_pdf_analysis_prompt(draft["extracted_text"])

        response = await ai_service.chat(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.1,
            max_tokens=4096,
        )

        # Parser et valider le JSON
        try:
            # Nettoyer la réponse (parfois l'IA ajoute du texte autour du JSON)
            content = response.content.strip()

            # Enlever les markdown code blocks si présents
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
                content = content.strip()

            analysis_data = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON invalide de l'IA : {e}")
            logger.error(f"Contenu reçu : {response.content[:500]}")

            await drafts_store.update_draft_status(
                db=db,
                draft_id=request.draft_id,
                status="failed",
                error=f"Réponse IA invalide (JSON) : {str(e)}",
            )

            raise HTTPException(
                status_code=500,
                detail="L'IA a retourné une réponse invalide. Réessaie."
            )

        # Valider avec Pydantic
        try:
            analysis = ProgramAnalysis(**analysis_data)
        except Exception as e:
            logger.error(f"Validation Pydantic échouée : {e}")
            logger.error(f"Données : {analysis_data}")

            await drafts_store.update_draft_status(
                db=db,
                draft_id=request.draft_id,
                status="failed",
                error=f"Structure invalide : {str(e)}",
            )

            raise HTTPException(
                status_code=500,
                detail="L'IA a retourné une structure invalide."
            )

        # Sauvegarder l'analyse
        await drafts_store.update_draft_status(
            db=db,
            draft_id=request.draft_id,
            status="completed",
            analysis=analysis_data,
            model_used=response.model,
        )

        return AnalyzeResponse(
            draft_id=request.draft_id,
            status="completed",
            analysis=analysis,
            message="Analyse terminée. Vérifie les correspondances avant de valider.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur analyse : {e}")
        await drafts_store.update_draft_status(
            db=db,
            draft_id=request.draft_id,
            status="failed",
            error=str(e),
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de l'analyse. Réessaie."
        )


@router.get("/draft/{draft_id}")
async def get_draft(draft_id: str, user_id: str = Depends(verify_token)):
    """Récupère un draft par son ID."""
    db = database
    draft = await drafts_store.get_draft(db, draft_id)

    if not draft:
        raise HTTPException(status_code=404, detail="Draft non trouvé")

    if draft["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    return draft


@router.post("/validate", response_model=ValidateResponse)
async def validate_draft(request: ValidateRequest, user_id: str = Depends(verify_token)):
    """
    Valide un draft et importe le programme.

    ⚠️ C'EST LE SEUL ENDPOINT qui crée un programme réel.
    Aucune validation automatique n'est faite.
    """
    db = database
    draft = await drafts_store.get_draft(db, request.draft_id)

    if not draft:
        raise HTTPException(status_code=404, detail="Draft non trouvé")

    if draft["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    if draft["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de valider un draft en statut '{draft['status']}'"
        )

    if not draft.get("analysis"):
        raise HTTPException(status_code=400, detail="Aucune analyse à valider")

    # Ici, dans une vraie implémentation, on appellerait saveCustomProgram()
    # avec les corrections utilisateur.
    # Pour l'instant, on marque juste le draft comme validé.

    analysis = draft["analysis"]

    # Si des corrections sont fournies, les appliquer
    if request.corrections:
        # TODO: appliquer les corrections à l'analysis
        pass

    # TODO: appel à saveCustomProgram() avec matching des exercices
    # Pour l'instant, on simule juste la validation

    await drafts_store.update_draft_status(
        db=db,
        draft_id=request.draft_id,
        status="validated",
    )

    return ValidateResponse(
        draft_id=request.draft_id,
        program_id=None,  # Sera rempli par saveCustomProgram()
        status="validated",
        message=f"Programme '{analysis['program']['name']}' validé. Import en cours...",
    )
