"""
Pydantic schemas pour l'analyse IA de programmes PDF.

Ces schemas définissent STRICTEMENT la structure de sortie de l'IA.
Règle d'or : si une info n'est pas dans le PDF → null / unknown.
Jamais d'invention.
"""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class ExerciseData(BaseModel):
    """Données d'un exercice structurées depuis le PDF."""
    # Nom de l'exercice TEL QUEL dans le PDF (pas d'invention)
    name: str = Field(..., description="Nom exact de l'exercice comme dans le PDF")

    # Champs optionnels - TOUS peuvent être null si absents du PDF
    sets: Optional[int] = Field(None, description="Nombre de séries (null si absent)")
    reps: Optional[str] = Field(None, description="Répétitions (peut être '8-12', 'AMRAP', etc.)")
    weight: Optional[str] = Field(None, description="Charge (peut être '80kg', '70%', 'bodyweight')")
    duration: Optional[str] = Field(None, description="Durée (peut être '30s', '5min')")
    distance: Optional[str] = Field(None, description="Distance (peut être '5km', '400m')")
    rest: Optional[str] = Field(None, description="Temps de repos (peut être '90s', '2min')")
    tempo: Optional[str] = Field(None, description="Tempo (peut être '3-1-1-0')")
    notes: Optional[str] = Field(None, description="Notes/instructions supplémentaires")

    # Indicateur d'ambiguïté
    ambiguous: bool = Field(
        False,
        description="True si l'exercice est ambigu (plusieurs interprétations possibles)"
    )


class DayData(BaseModel):
    """Données d'une séance/jour."""
    day: int = Field(..., description="Numéro du jour (1, 2, 3...)")
    name: Optional[str] = Field(None, description="Nom du jour (ex: 'Push', 'Upper')")
    exercises: List[ExerciseData] = Field(
        default_factory=list,
        description="Liste des exercices de ce jour"
    )


class WeekData(BaseModel):
    """Données d'une semaine."""
    week: int = Field(..., description="Numéro de la semaine (1, 2, 3...)")
    days: List[DayData] = Field(
        default_factory=list,
        description="Liste des jours/séances de cette semaine"
    )


class ProgramData(BaseModel):
    """Données complètes du programme."""
    name: str = Field(..., description="Nom du programme")
    description: Optional[str] = Field(None, description="Description du programme")
    duration_weeks: Optional[int] = Field(None, description="Durée en semaines")
    weeks: List[WeekData] = Field(
        default_factory=list,
        description="Liste des semaines du programme"
    )


class AmbiguityInfo(BaseModel):
    """Information sur une ambiguïté détectée."""
    exercise_name: str
    reason: str
    possible_interpretations: List[str] = Field(default_factory=list)


class ProgramAnalysis(BaseModel):
    """Résultat complet de l'analyse IA d'un PDF."""
    program: ProgramData
    ambiguities: List[AmbiguityInfo] = Field(
        default_factory=list,
        description="Liste des ambiguïtés détectées"
    )
    missing_info: List[str] = Field(
        default_factory=list,
        description="Informations manquantes importantes"
    )
    confidence: Literal["high", "medium", "low"] = Field(
        "medium",
        description="Confiance globale de l'analyse"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Avertissements divers"
    )
