from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging

from database import client
from health_import import router as health_import_router, ensure_indexes

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "IronFlow API is running"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


api_router.include_router(health_import_router)
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


@app.on_event("startup")
async def startup_indexes():
    await ensure_indexes()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
