from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Union

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB (kept for future extensions, not used for user data since local-only)
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class ExerciseSchema(BaseModel):
    name: str
    sets: int = 3
    reps: str = "10"
    weight: Optional[str] = None
    rest_seconds: int = 60
    notes: Optional[str] = None


class ParsedPlan(BaseModel):
    title: str
    exercises: List[ExerciseSchema]


class ParseRequest(BaseModel):
    image_base64: str


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "IronFlow API is running"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "llm_key_configured": bool(EMERGENT_LLM_KEY)}


def _clean_json_str(text: str) -> str:
    """Strip markdown fences and extract the first JSON object."""
    text = text.strip()
    # remove code fences
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    # extract from first { to last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text


@api_router.post("/parse-plan", response_model=ParsedPlan)
async def parse_plan(req: ParseRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    system_message = (
        "Tu es un expert en analyse de plans d'entraînement sportifs. "
        "Tu extrais les informations des images de programmes de musculation, HIIT, ou cardio, "
        "et tu retournes UNIQUEMENT un objet JSON valide sans texte supplémentaire, "
        "sans balises markdown."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_message,
    ).with_model("gemini", "gemini-3-flash-preview")

    prompt = (
        "Analyse cette image de plan sportif et retourne un JSON avec cette structure exacte :\n"
        "{\n"
        '  "title": "nom du plan (ex: Jour 1 - Pectoraux)",\n'
        '  "exercises": [\n'
        "    {\n"
        '      "name": "nom de l\'exercice",\n'
        '      "sets": 4,\n'
        '      "reps": "8-12",\n'
        '      "weight": "40kg" ou null,\n'
        '      "rest_seconds": 60,\n'
        '      "notes": "notes ou null"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Règles :\n"
        "- reps est TOUJOURS une chaîne (string), même si c'est un nombre unique\n"
        "- rest_seconds est TOUJOURS un entier en secondes (par défaut 60 si non spécifié)\n"
        "- sets est TOUJOURS un entier (par défaut 3 si non spécifié)\n"
        "- Utilise les noms d'exercices en français si l'image est en français\n"
        "- Si tu vois 'Tabata', '30s effort / 15s repos', extrais correctement rest_seconds\n"
        "- Pour HIIT/circuit, chaque exercice peut avoir reps='30s' avec rest_seconds=15\n"
        "- Retourne UNIQUEMENT le JSON, rien d'autre."
    )

    image_content = ImageContent(image_base64=req.image_base64)

    try:
        response = await chat.send_message(
            UserMessage(text=prompt, file_contents=[image_content])
        )
    except Exception as e:
        logging.exception("LLM error")
        raise HTTPException(status_code=502, detail=f"AI parsing failed: {e}")

    raw = response if isinstance(response, str) else str(response)
    cleaned = _clean_json_str(raw)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logging.error("Failed to parse JSON. Raw: %s", raw[:500])
        raise HTTPException(
            status_code=422,
            detail="AI response could not be parsed as JSON. Try a clearer photo.",
        )

    # Normalize
    if "exercises" not in data or not isinstance(data["exercises"], list):
        raise HTTPException(status_code=422, detail="No exercises found in the image.")

    normalized_exercises = []
    for ex in data["exercises"]:
        if not isinstance(ex, dict) or "name" not in ex:
            continue
        normalized_exercises.append({
            "name": str(ex.get("name", "Exercice")),
            "sets": int(ex.get("sets") or 3),
            "reps": str(ex.get("reps") or "10"),
            "weight": (str(ex["weight"]) if ex.get("weight") not in (None, "", "null") else None),
            "rest_seconds": int(ex.get("rest_seconds") or 60),
            "notes": (str(ex["notes"]) if ex.get("notes") not in (None, "", "null") else None),
        })

    return ParsedPlan(
        title=str(data.get("title") or "Mon plan"),
        exercises=normalized_exercises,
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
