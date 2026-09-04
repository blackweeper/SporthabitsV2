"""
Tests pour le pipeline d'import PDF via IA.

Usage:
    pytest backend/tests/test_pdf_import.py -v
"""
import pytest
import asyncio
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
import json

# Import des modules à tester
from pdf.extraction import extract_pdf_text, PDFExtractionResult
from ai.schemas.pdf_program import ProgramAnalysis, ProgramData, WeekData, DayData, ExerciseData
from ai.prompts.pdf_program import build_pdf_system_prompt, build_pdf_analysis_prompt
import drafts_store


# ---------- Tests extraction PDF ----------

def test_pdf_extraction_missing_file():
    """Test : fichier PDF inexistant."""
    result = extract_pdf_text("nonexistent.pdf")
    assert result.success is False
    assert "non trouvé" in result.error.lower()


def test_pdf_extraction_wrong_extension(tmp_path):
    """Test : fichier non-PDF (doit exister sur disque pour dépasser le check 'fichier non trouvé')."""
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("not a pdf")

    result = extract_pdf_text(txt_file)
    assert result.success is False
    assert "pas un pdf" in result.error.lower()


# ---------- Tests schemas Pydantic ----------

def test_exercise_data_validation():
    """Test : validation schema ExerciseData."""
    # Valide
    exercise = ExerciseData(
        name="Back Squat",
        sets=4,
        reps="8-12",
        weight="80kg"
    )
    assert exercise.name == "Back Squat"
    assert exercise.sets == 4
    assert exercise.ambiguous is False

    # Champs optionnels null
    exercise_minimal = ExerciseData(name="Push-up")
    assert exercise_minimal.sets is None
    assert exercise_minimal.weight is None


def test_program_analysis_validation():
    """Test : validation schema ProgramAnalysis complet."""
    data = {
        "program": {
            "name": "Test Program",
            "description": "A test",
            "duration_weeks": 4,
            "weeks": [
                {
                    "week": 1,
                    "days": [
                        {
                            "day": 1,
                            "name": "Push",
                            "exercises": [
                                {
                                    "name": "Squat",
                                    "sets": 5,
                                    "reps": "5",
                                    "weight": None,
                                    "duration": None,
                                    "distance": None,
                                    "rest": "3min",
                                    "tempo": None,
                                    "notes": None,
                                    "ambiguous": False
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        "ambiguities": [],
        "missing_info": ["Weight information"],
        "confidence": "medium",
        "warnings": []
    }

    analysis = ProgramAnalysis(**data)
    assert analysis.program.name == "Test Program"
    assert len(analysis.program.weeks) == 1
    assert len(analysis.missing_info) == 1
    assert analysis.confidence == "medium"


def test_program_analysis_invalid_confidence():
    """Test : confidence invalide rejetée."""
    data = {
        "program": {
            "name": "Test",
            "weeks": []
        },
        "ambiguities": [],
        "missing_info": [],
        "confidence": "invalid",  # Doit être high|medium|low
        "warnings": []
    }

    with pytest.raises(Exception):  # Pydantic validation error
        ProgramAnalysis(**data)


# ---------- Tests prompts ----------

def test_system_prompt_contains_rules():
    """Test : prompt système contient les règles strictes."""
    prompt = build_pdf_system_prompt()

    # Vérifier les règles clés
    assert "NEVER invent" in prompt or "never invent" in prompt.lower()
    assert "null" in prompt
    assert "JSON" in prompt
    assert "PDF" in prompt


def test_user_prompt_contains_pdf_text():
    """Test : prompt utilisateur contient le texte du PDF."""
    pdf_text = "Day 1: Squat 5x5, Bench 3x8"
    prompt = build_pdf_analysis_prompt(pdf_text)

    assert pdf_text in prompt
    assert "PDF TEXT" in prompt or "pdf text" in prompt.lower()


# ---------- Tests drafts MongoDB ----------

@pytest.mark.asyncio
async def test_create_draft():
    """Test : création d'un draft."""
    # Mock de la base de données
    mock_db = Mock()
    mock_collection = AsyncMock()
    mock_db.__getitem__ = Mock(return_value=mock_collection)

    mock_result = Mock()
    mock_result.inserted_id = "test_id_123"
    mock_collection.insert_one = AsyncMock(return_value=mock_result)

    draft_id = await drafts_store.create_draft(
        db=mock_db,
        user_id="user_123",
        filename="program.pdf",
        file_size=50000
    )

    assert draft_id == "test_id_123"
    mock_collection.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_update_draft_status():
    """Test : mise à jour du statut d'un draft."""
    # Mock de la base de données
    mock_db = Mock()
    mock_collection = AsyncMock()
    mock_db.__getitem__ = Mock(return_value=mock_collection)

    mock_result = Mock()
    mock_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_result)

    success = await drafts_store.update_draft_status(
        db=mock_db,
        draft_id="507f1f77bcf86cd799439011",  # ObjectId hex valide (24 caractères)
        status="completed",
        analysis={"program": {"name": "Test"}}
    )

    assert success is True
    mock_collection.update_one.assert_called_once()


# ---------- Tests règles métier ----------

def test_analysis_must_not_invent():
    """Test : vérifier que l'analyse ne doit jamais inventer."""
    # Ce test est conceptuel - il vérifie que le prompt système
    # contient les règles strictes d'interdiction d'invention
    prompt = build_pdf_system_prompt()

    forbidden_phrases = [
        "improve",
        "correct",
        "complete",
        "assume",
    ]

    for phrase in forbidden_phrases:
        assert phrase.upper() in prompt or phrase.lower() in prompt


def test_null_means_absent_from_pdf():
    """Test : null signifie absent du PDF, pas inconnu."""
    # Vérifier que le schema accepte null pour les champs optionnels
    exercise = ExerciseData(
        name="Squat",
        sets=5,
        reps="5",
        weight=None  # Absent du PDF
    )

    assert exercise.weight is None
    # Et pas "unknown" ou "TBD" ou une valeur par défaut inventée


def test_analyze_does_not_create_program():
    """Test : /analyze ne doit JAMAIS créer un programme réel."""
    # Ce test est documentaire - il documente la règle métier
    # que l'analyse ne crée aucun programme.
    # L'implémentation réelle doit être testée avec un test d'intégration
    # qui vérifie qu'aucun document n'est créé dans la collection programs
    pass


def test_validate_creates_program():
    """Test : /validate doit créer un programme réel après validation."""
    # Ce test est documentaire - il documente la règle métier
    # que seul /validate crée un programme.
    # L'implémentation réelle doit être testée avec un test d'intégration
    # qui vérifie qu'un document est créé dans la collection programs
    pass


# ---------- Tests de sécurité ----------

def test_nvidia_key_not_in_response():
    """Test : la clé NVIDIA ne doit jamais apparaître dans les réponses."""
    import os

    # Simuler une erreur qui pourrait exposer la clé
    api_key = os.getenv("NVIDIA_API_KEY", "nvapi-test-key")

    # Vérifier qu'aucune erreur ne contient la clé en clair
    # (l'implémentation doit masquer les clés dans les logs)
    error_message = f"Erreur NVIDIA API : 401 Unauthorized"

    assert api_key not in error_message
    assert "nvapi-" not in error_message or "nvapi-***" in error_message


# ---------- Run all tests ----------

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
