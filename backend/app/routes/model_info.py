from fastapi import APIRouter
from app.schemas.schemas import ModelInfoResponse
from app.services.model_service import ModelService

router = APIRouter()


@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info():
    return ModelService.info()
