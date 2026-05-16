from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.fmri_service import FMRI

router = APIRouter()


class FMRIPredictRequest(BaseModel):
    fc_matrix: List[List[float]]
    node_features: Optional[List[List[float]]]


@router.post("/predict/fmri")
async def predict_fmri(req: FMRIPredictRequest):
    if not FMRI.loaded:
        raise HTTPException(status_code=503, detail="FMRI model not loaded on server")

    fc = req.fc_matrix
    nf = req.node_features
    if nf is None:
        # derive simple node features from fc: mean, std, degree, betweenness (approx), clustering (zeros)
        import numpy as np
        arr = np.array(fc, dtype=float)
        deg = np.sum(np.abs(arr) > 0.15, axis=1)
        nf = np.stack([arr.mean(axis=1), arr.std(axis=1), deg, np.zeros_like(deg), np.zeros_like(deg)], axis=1).tolist()

    try:
        out = FMRI.predict(fc, nf)
        return {"status": "ok", **out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
