from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil

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
        nf_arr = np.stack([arr.mean(axis=1), arr.std(axis=1), deg, np.zeros_like(deg), np.zeros_like(deg)], axis=1)
        nf_arr = np.nan_to_num(nf_arr, nan=0.0, posinf=0.0, neginf=0.0)
        nf = nf_arr.tolist()

    try:
        out = FMRI.predict(fc, nf)
        if "roi_probs" in out:
            out["roi_probs"] = np.nan_to_num(out["roi_probs"], nan=0.0).tolist()
        if "prob_gat" in out:
            out["prob_gat"] = float(np.nan_to_num(out["prob_gat"], nan=0.0))
        return {"status": "ok", **out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/fmri/upload")
async def predict_fmri_file(file: UploadFile = File(...)):
    """Accepts an fMRI NIfTI file (.nii or .nii.gz), extracts FC matrix, and returns prediction."""
    if not FMRI.loaded:
        raise HTTPException(status_code=503, detail="FMRI model not loaded on server")

    if not (file.filename.endswith(".nii") or file.filename.endswith(".nii.gz")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .nii or .nii.gz file.")

    temp_path = f"/tmp/{file.filename}" if os.name != 'nt' else f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        import numpy as np
        try:
            import nilearn
            from nilearn import datasets
            from nilearn.maskers import NiftiLabelsMasker
            from nilearn.connectome import ConnectivityMeasure
        except ImportError:
            raise HTTPException(status_code=500, detail="nilearn not installed on server.")

        # Load a default atlas (AAL or Schaefer) to extract ROIs
        # Schaefer 2018 is lightweight and standard for rs-fMRI
        atlas = datasets.fetch_atlas_schaefer_2018(n_rois=100, yeo_networks=7, resolution_mm=2)
        atlas_filename = atlas.maps

        # Assuming preprocessed fMRI, extract time series
        masker = NiftiLabelsMasker(labels_img=atlas_filename, standardize="zscore_sample", memory="nilearn_cache")
        time_series = masker.fit_transform(temp_path)

        # Compute FC Matrix (Correlation)
        correlation_measure = ConnectivityMeasure(kind='correlation')
        fc_matrix = correlation_measure.fit_transform([time_series])[0]
        
        # Zero out self-connections just in case
        np.fill_diagonal(fc_matrix, 0.0)
        
        # Replace NaNs or infinite values with 0s to avoid JSON serialization crash
        fc_matrix = np.nan_to_num(fc_matrix, nan=0.0, posinf=0.0, neginf=0.0)
        
        fc = fc_matrix.tolist()
        
        # Derive simple node features from fc
        arr = np.array(fc, dtype=float)
        deg = np.sum(np.abs(arr) > 0.15, axis=1)
        
        # Construct and clean node features to prevent NaN serialization issues
        nf_arr = np.stack([arr.mean(axis=1), arr.std(axis=1), deg, np.zeros_like(deg), np.zeros_like(deg)], axis=1)
        nf_arr = np.nan_to_num(nf_arr, nan=0.0, posinf=0.0, neginf=0.0)
        nf = nf_arr.tolist()

        out = FMRI.predict(fc, nf)
        
        # Clean predictions of any potential NaNs
        if "roi_probs" in out:
            out["roi_probs"] = np.nan_to_num(out["roi_probs"], nan=0.0).tolist()
        if "prob_gat" in out:
            out["prob_gat"] = float(np.nan_to_num(out["prob_gat"], nan=0.0))
        
        return {"status": "ok", "fc_matrix_shape": list(arr.shape), **out}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

