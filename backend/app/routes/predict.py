"""
Prediction routes:
  POST /predict       — pre-extracted features (15 per channel)
  POST /predict/raw   — raw EEG signal (full pipeline)
  POST /predict/batch — batch of pre-extracted feature sets
"""

import logging
import time

from fastapi import APIRouter, HTTPException

from app.exceptions import InferenceNotReadyError
from app.schemas.schemas import (
    BatchPredictRequest,
    BatchPredictResponse,
    PredictFromFeaturesRequest,
    PredictFromRawRequest,
    PredictResponse,
)
from app.services.inference_service import InferenceService
from app.services.model_service import ModelService

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Single prediction — pre-extracted features ────────────────────────────────

@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictFromFeaturesRequest):
    """
    Predict SOZ electrodes from pre-extracted features.

    Provide 15 features per channel in the exact order defined in the model docs.
    Optionally include raw_eeg for accurate coherence-based graph construction.
    """
    t0 = time.time()
    try:
        result = InferenceService.predict_from_features(
            features=request.features,
            channel_names=request.channel_names,
            raw_eeg=request.raw_eeg,
            sfreq=request.sfreq,
        )
        logger.info(
            f"/predict | channels={result['n_channels']} | "
            f"soz={result['n_soz_predicted']} | "
            f"risk={result['risk_score']:.3f} | "
            f"elapsed={1000*(time.time()-t0):.1f}ms"
        )
        return {**result, "status": "ok"}
    except InferenceNotReadyError as e:
        raise HTTPException(status_code=503, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"/predict error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Single prediction — raw EEG ───────────────────────────────────────────────

@router.post("/predict/raw", response_model=PredictResponse)
async def predict_raw(request: PredictFromRawRequest):
    """
    Full pipeline inference from raw EEG signal.

    Preprocessing applied internally:
      bandpass 0.5–200 Hz → notch → resample → re-reference →
      15-feature extraction → StandardScaler → coherence graph → GAT → prediction
    """
    t0 = time.time()
    try:
        result = InferenceService.predict_from_raw(
            raw_eeg=request.raw_eeg,
            sfreq=request.sfreq,
            channel_names=request.channel_names,
        )
        logger.info(
            f"/predict/raw | channels={result['n_channels']} | "
            f"soz={result['n_soz_predicted']} | "
            f"elapsed={1000*(time.time()-t0):.1f}ms"
        )
        return {**result, "status": "ok"}
    except InferenceNotReadyError as e:
        raise HTTPException(status_code=503, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"/predict/raw error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch prediction ──────────────────────────────────────────────────────────

@router.post("/predict/batch", response_model=BatchPredictResponse)
async def predict_batch(request: BatchPredictRequest):
    """
    Batch prediction for multiple samples.
    Each sample follows the same schema as POST /predict.
    Max 50 samples per request.
    """
    try:
        ModelService.assert_inference_ready()
    except InferenceNotReadyError as e:
        raise HTTPException(status_code=503, detail=e.message)

    results = []
    errors = []

    for i, sample in enumerate(request.samples):
        try:
            result = InferenceService.predict_from_features(
                features=sample.features,
                channel_names=sample.channel_names,
                raw_eeg=sample.raw_eeg,
                sfreq=sample.sfreq,
            )
            results.append({**result, "sample_index": i, "status": "ok"})
        except Exception as e:
            errors.append({"sample_index": i, "error": str(e)})

    logger.info(f"/predict/batch | total={len(request.samples)} | errors={len(errors)}")
    return BatchPredictResponse(
        status="ok" if not errors else "partial",
        n_samples=len(request.samples),
        results=results + errors,
    )
