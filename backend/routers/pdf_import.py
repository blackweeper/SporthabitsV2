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

import httpx
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

# Nombre total de tentatives d'analyse IA avant d'abandonner (1 = pas de
# retry). La génération LLM est probabiliste : un JSON cassé ou une
# structure invalide ne sont pas forcément reproductibles.
MAX_ANALYSIS_ATTEMPTS = 2


class _AnalysisGenerationError(Exception):
    """Échec de génération IA jugé "retentable" — JSON cassé, structure
    invalide, réponse tronquée, ou rejet strict côté provider (ex. Groq
    json_validate_failed). Distinct d'une erreur de config/auth/réseau, qui
    doit échouer immédiatement plutôt que d'être retentée pour rien."""

    def __init__(self, user_message: str, log_message: str, status_code: int = 500):
        self.user_message = user_message
        self.log_message = log_message
        self.status_code = status_code
        super().__init__(log_message)


async def _analyze_once(ai_service, system_prompt: str, user_prompt: str, response_format: Optional[dict]):
    """Un essai d'analyse IA : appel + parsing JSON + validation Pydantic.

    Lève _AnalysisGenerationError pour tout échec qui vaut le coup d'être
    retenté (voir MAX_ANALYSIS_ATTEMPTS côté appelant). Toute autre exception
    (clé API invalide, quota, réseau...) remonte telle quelle — retenter ne
    changerait rien à ces cas-là.
    """
    try:
        response = await ai_service.chat(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.1,
            max_tokens=8192,
            response_format=response_format,
        )
    except httpx.HTTPStatusError as e:
        # 401/429 sont déjà convertis en ValueError par les providers avant
        # d'arriver ici (voir ai/providers/*.py) — un HTTPStatusError à ce
        # niveau est donc un autre code (ex. 400 json_validate_failed côté
        # Groq quand son JSON mode rejette sa propre génération).
        raise _AnalysisGenerationError(
            "L'IA a rejeté la génération. Réessaie.",
            f"Erreur HTTP provider (retentable) : {e} — {e.response.text[:1000]}",
        ) from e

    # Détecte une réponse coupée par la limite de tokens du modèle AVANT
    # même d'essayer de parser le JSON — un JSON tronqué produit une erreur
    # de parsing peu parlante ("Expecting ',' delimiter...") alors que la
    # vraie cause (programme trop long pour la sortie du modèle) est
    # explicite via finish_reason côté API (format OpenAI-compatible).
    finish_reason = None
    if response.raw_response:
        choices = response.raw_response.get("choices") or []
        if choices:
            finish_reason = choices[0].get("finish_reason")

    if finish_reason == "length":
        raise _AnalysisGenerationError(
            "Ce PDF est trop long pour être analysé en une seule fois "
            "(le modèle IA a atteint sa limite de sortie avant la fin). "
            "Essaie avec un PDF plus court, ou scinde le programme en "
            "plusieurs fichiers (par exemple une semaine à la fois).",
            "Réponse IA tronquée (finish_reason=length)",
            status_code=422,
        )

    # Nettoyer la réponse (parfois l'IA ajoute du texte autour du JSON)
    content = response.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        content = content.strip()

    try:
        analysis_data = json.loads(content)
    except json.JSONDecodeError as e:
        raise _AnalysisGenerationError(
            "L'IA a retourné une réponse invalide. Réessaie.",
            f"JSON invalide de l'IA : {e} — contenu (longueur={len(response.content)}) : {response.content[:2000]}",
        ) from e

    try:
        analysis = ProgramAnalysis(**analysis_data)
    except Exception as e:
        raise _AnalysisGenerationError(
            "L'IA a retourné une structure invalide.",
            f"Validation Pydantic échouée : {e} — données : {analysis_data}",
        ) from e

    return analysis_data, analysis, response


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
        ai_service = get_ai_service()
        system_prompt = build_pdf_system_prompt()
        user_prompt = build_pdf_analysis_prompt(draft["extracted_text"])

        # JSON mode natif : force une syntaxe JSON valide au niveau du
        # décodage du modèle plutôt que de compter uniquement sur la
        # consigne du prompt (constaté en prod : le modèle peut produire un
        # JSON syntaxiquement cassé — guillemet manquant, etc. — malgré des
        # instructions explicites). Activé seulement pour les providers
        # confirmés compatibles ; NVIDIA NIM ne le supporte pas forcément
        # selon le modèle configuré, donc laissé à None dans ce cas.
        response_format = {"type": "json_object"} if ai_service.provider_name == "groq" else None

        # La génération LLM est probabiliste : un JSON cassé, une structure
        # qui ne colle pas au schéma, ou un rejet strict côté provider
        # (ex. Groq json_validate_failed) ne sont pas forcément reproductibles
        # — un deuxième essai réussit souvent là où le premier a échoué, sans
        # qu'il y ait de vrai bug. On retente donc une fois avant d'abandonner.
        last_error: Optional[_AnalysisGenerationError] = None
        analysis_data = None
        analysis = None
        response = None
        for attempt in range(1, MAX_ANALYSIS_ATTEMPTS + 1):
            try:
                analysis_data, analysis, response = await _analyze_once(
                    ai_service, system_prompt, user_prompt, response_format
                )
                last_error = None
                break
            except _AnalysisGenerationError as e:
                last_error = e
                logger.warning(
                    f"Analyse draft {request.draft_id} — tentative {attempt}/{MAX_ANALYSIS_ATTEMPTS} "
                    f"échouée : {e.log_message}"
                )

        if last_error is not None:
            await drafts_store.update_draft_status(
                db=db,
                draft_id=request.draft_id,
                status="failed",
                error=last_error.log_message,
            )
            raise HTTPException(status_code=last_error.status_code, detail=last_error.user_message)

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
