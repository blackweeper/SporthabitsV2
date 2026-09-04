"""
Extraction robuste de texte depuis des PDF.

Pipeline :
PDF → détection texte exploitable → extraction texte
si texte insuffisant → retour "OCR requis"
"""
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Seuil minimum de caractères pour considérer que le PDF contient du texte exploitable
MIN_TEXT_LENGTH = 50

# Seuil minimum de mots
MIN_WORD_COUNT = 10


@dataclass
class PDFExtractionResult:
    """Résultat de l'extraction de texte depuis un PDF."""
    success: bool
    text: Optional[str] = None
    page_count: int = 0
    total_chars: int = 0
    total_words: int = 0
    needs_ocr: bool = False
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


def extract_pdf_text(pdf_path: str | Path) -> PDFExtractionResult:
    """
    Extrait le texte d'un fichier PDF.

    Args:
        pdf_path: Chemin vers le fichier PDF

    Returns:
        PDFExtractionResult avec le texte extrait ou le statut OCR requis
    """
    pdf_path = Path(pdf_path)

    if not pdf_path.exists():
        return PDFExtractionResult(
            success=False,
            error=f"Fichier non trouvé : {pdf_path}",
        )

    if not pdf_path.suffix.lower() == ".pdf":
        return PDFExtractionResult(
            success=False,
            error=f"Le fichier n'est pas un PDF : {pdf_path.suffix}",
        )

    # Vérifier la taille (max 50 Mo)
    file_size_mb = pdf_path.stat().st_size / (1024 * 1024)
    if file_size_mb > 50:
        return PDFExtractionResult(
            success=False,
            error=f"PDF trop volumineux : {file_size_mb:.1f} Mo (max 50 Mo)",
        )

    try:
        return _extract_with_pdfplumber(pdf_path)
    except Exception as e:
        logger.warning(f"pdfplumber a échoué : {e}, essai avec pypdf")
        try:
            return _extract_with_pypdf(pdf_path)
        except Exception as e2:
            logger.error(f"Les deux extracteurs ont échoué : {e}, {e2}")
            return PDFExtractionResult(
                success=False,
                error=f"Impossible d'extraire le texte du PDF : {e2}",
            )


def _extract_with_pdfplumber(pdf_path: Path) -> PDFExtractionResult:
    """Extraction avec pdfplumber (meilleur pour les tableaux)."""
    import pdfplumber

    all_text = []
    metadata = {}

    with pdfplumber.open(pdf_path) as pdf:
        metadata = pdf.metadata or {}
        page_count = len(pdf.pages)

        for i, page in enumerate(pdf.pages):
            # Extraire le texte
            text = page.extract_text()
            if text:
                all_text.append(f"--- PAGE {i + 1} ---\n{text}")

    full_text = "\n\n".join(all_text).strip()

    return _build_result(
        text=full_text,
        page_count=page_count,
        metadata=metadata,
    )


def _extract_with_pypdf(pdf_path: Path) -> PDFExtractionResult:
    """Extraction avec pypdf (fallback)."""
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)

    all_text = []
    metadata = {}

    if reader.metadata:
        metadata = {
            k: v for k, v in reader.metadata.items()
            if v and isinstance(v, str)
        }

    page_count = len(reader.pages)

    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            all_text.append(f"--- PAGE {i + 1} ---\n{text}")

    full_text = "\n\n".join(all_text).strip()

    return _build_result(
        text=full_text,
        page_count=page_count,
        metadata=metadata,
    )


def _build_result(
    text: str,
    page_count: int,
    metadata: dict,
) -> PDFExtractionResult:
    """Construit le résultat en déterminant si OCR est nécessaire."""
    total_chars = len(text)
    total_words = len(text.split()) if text else 0

    # Déterminer si le texte est exploitable
    if total_chars < MIN_TEXT_LENGTH or total_words < MIN_WORD_COUNT:
        logger.warning(
            f"Texte insuffisant : {total_chars} caractères, {total_words} mots. "
            "OCR probablement requis."
        )
        return PDFExtractionResult(
            success=True,
            text=text if text else None,
            page_count=page_count,
            total_chars=total_chars,
            total_words=total_words,
            needs_ocr=True,
            metadata=metadata,
        )

    logger.info(
        f"Texte extrait avec succès : {total_chars} caractères, "
        f"{total_words} mots, {page_count} pages"
    )

    return PDFExtractionResult(
        success=True,
        text=text,
        page_count=page_count,
        total_chars=total_chars,
        total_words=total_words,
        needs_ocr=False,
        metadata=metadata,
    )
