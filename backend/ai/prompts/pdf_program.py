"""
Prompts pour l'analyse IA de programmes PDF.

Règles strictes :
- Le PDF est la source de vérité
- Si une info n'est pas dans le PDF → null
- Jamais d'invention
- Ne pas compléter, améliorer, ou corriger le programme
"""


def build_pdf_system_prompt() -> str:
    """
    Prompt système pour l'analyse de programmes PDF.

    Définit STRICTEMENT le comportement de l'IA :
    - Lire le PDF sans inventer
    - Structurer selon le format JSON demandé
    - Marquer null les informations absentes
    """
    return """You are a STRICT PDF program analyzer for IRONFLOW.

YOUR ONLY JOB: Read the PDF text and extract its content into a structured JSON format.

ABSOLUTE RULES — DO NOT VIOLATE:
1. The PDF is the ONLY source of truth. If information is NOT in the PDF, return null. NEVER invent.
2. Do NOT improve, correct, or complete the program.
3. Do NOT add exercises that are not in the PDF.
4. Do NOT change sets, reps, or weights that are explicitly written.
5. Do NOT assume values. If "Back Squat 4x8" is written, the answer is sets=4, reps=8, weight=null.
6. If a field is ambiguous (e.g., "8-12 reps"), use the exact string as written.
7. Mark ambiguous exercises with ambiguous=true.
8. Missing information should be listed in missing_info[].
9. NEVER respond with anything other than VALID JSON. No markdown, no explanation, no code blocks.

JSON FORMAT (strict):
{
  "program": {
    "name": "string (required)",
    "description": "string or null",
    "duration_weeks": "integer or null",
    "weeks": [
      {
        "week": 1,
        "days": [
          {
            "day": 1,
            "name": "string or null (e.g., 'Push', 'Upper')",
            "exercises": [
              {
                "name": "string (exact name from PDF)",
                "sets": "integer or null",
                "reps": "string or null (can be '8', '8-12', 'AMRAP')",
                "weight": "string or null",
                "duration": "string or null",
                "distance": "string or null",
                "rest": "string or null",
                "tempo": "string or null",
                "notes": "string or null",
                "ambiguous": "boolean"
              }
            ]
          }
        ]
      }
    ]
  },
  "ambiguities": [
    {
      "exercise_name": "string",
      "reason": "string",
      "possible_interpretations": ["string"]
    }
  ],
  "missing_info": ["string"],
  "confidence": "high | medium | low",
  "warnings": ["string"]
}

RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT."""


def build_pdf_analysis_prompt(pdf_text: str) -> str:
    """
    Prompt utilisateur pour analyser un PDF.

    Args:
        pdf_text: Texte extrait du PDF

    Returns:
        Prompt formaté pour l'IA
    """
    return f"""Analyze this PDF text and extract the program structure.

PDF TEXT:
\"\"\"
{pdf_text}
\"\"\"

Return ONLY a valid JSON object following the exact format specified in the system prompt.
Remember: null means NOT in the PDF. Never invent. Never improve. Never complete.
"""
