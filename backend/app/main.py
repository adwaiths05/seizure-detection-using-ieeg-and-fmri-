"""
SOZ_GAT Backend — FastAPI entry point
Brain iEEG Seizure Onset Zone (SOZ) detection via Graph Attention Network
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.middleware.rate_limiter import RateLimitMiddleware
from app.routes import health, predict, model_info, fmri
from app.services.model_service import ModelService
from app.services.fmri_service import FMRI
from app.utils.logger import setup_logging

# ── Logging ──────────────────────────────────────────────────────────────────
setup_logging()
logger = logging.getLogger(__name__)


# ── Lifespan: load model once at startup ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading SOZ_GAT model...")
    ModelService.load()
    logger.info("Loading FMRI model (if available)...")
    FMRI.load()
    logger.info("Model ready.")
    yield
    logger.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SOZ_GAT API",
    description="Seizure Onset Zone detection via iEEG Graph Attention Network",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.add_middleware(RateLimitMiddleware, max_requests=settings.RATE_LIMIT, window_seconds=60)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{(time.time() - start)*1000:.2f}ms"
    return response


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(predict.router, tags=["Prediction"])
app.include_router(model_info.router, tags=["Model Info"])
app.include_router(fmri.router, tags=["FMRI Prediction"])
