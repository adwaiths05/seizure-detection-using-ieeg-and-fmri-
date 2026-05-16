from fastapi import APIRouter

from app.config.settings import settings
from app.schemas.schemas import HealthResponse
from app.services.model_service import ModelService

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="running",
        model_loaded=ModelService.weights_in_memory,
        version=settings.MODEL_VERSION,
        inference_ready=ModelService.inference_ready,
        checkpoint_loaded=ModelService.checkpoint_loaded,
        scaler_loaded=ModelService.scaler_loaded,
        readiness_detail=ModelService.readiness_detail,
    )
