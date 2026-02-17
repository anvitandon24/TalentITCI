import logging
import os
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database.connection import init_db
from auth import auth_router
from admin import admin_router
from chatbot.router import router as chatbot_router
from chatbot_candidate.router import router as candidate_chatbot_router
from routers.signup import router as signup_router
from routers.candidates import router as candidates_router
from routers.resumes import router as resumes_router
from routers.jobs import router as jobs_router
from routers.applications import router as applications_router
from routers.scoring import router as scoring_router
from routers.evaluation import router as evaluation_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS: localhost for dev; CORS_ORIGINS env var for production (comma-separated URLs)
_base = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
]
_extra = os.getenv("CORS_ORIGINS", "")
origins = _base + [x.strip() for x in _extra.split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router, prefix="/api/admin")
app.include_router(chatbot_router)
app.include_router(candidate_chatbot_router)
app.include_router(signup_router)
app.include_router(candidates_router)
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(scoring_router)
app.include_router(evaluation_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": True, "detail": "Internal server error. Please try again later."},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "detail": exc.detail},
    )


def _validate_environment():
    from dotenv import load_dotenv
    load_dotenv()

    required_vars = {
        "DATABASE_URL": os.getenv("DATABASE_URL"),
        "JWT_SECRET": os.getenv("JWT_SECRET"),
    }
    recommended_vars = {
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
        "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID"),
    }

    missing_required = [k for k, v in required_vars.items() if not v]
    missing_recommended = [k for k, v in recommended_vars.items() if not v]

    if missing_required:
        logger.warning(
            f"MISSING REQUIRED environment variables: {', '.join(missing_required)}. "
            "The application may not function correctly."
        )
    if missing_recommended:
        logger.warning(
            f"Missing recommended environment variables: {', '.join(missing_recommended)}. "
            "Some features (RAG scoring, Google OAuth) may not work."
        )

    jwt_secret = os.getenv("JWT_SECRET", "")
    if jwt_secret == "CHANGE-ME-generate-a-random-256-bit-key-for-production":
        logger.warning(
            "JWT_SECRET is set to the default value! "
            "Generate a proper secret for production: python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if api_key and not api_key.startswith("sk-or-"):
        logger.warning("OPENROUTER_API_KEY doesn't look like a valid OpenRouter key (expected 'sk-or-' prefix).")


@app.on_event("startup")
def on_startup():
    _validate_environment()
    logger.info("Creating database tables if they don't exist...")
    init_db()
    logger.info("Database tables ready.")
