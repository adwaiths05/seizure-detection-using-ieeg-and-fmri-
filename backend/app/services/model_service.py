"""
ModelService — singleton that loads and holds the model + scaler.
Loaded once at startup; all inference calls reuse the same instance.
"""

import logging
import os
import pickle
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F

from app.config.settings import settings
from app.exceptions import InferenceNotReadyError
from app.models.soz_gat import SOZ_GAT

logger = logging.getLogger(__name__)


def _nonempty_file(path: str) -> bool:
    return os.path.isfile(path) and os.path.getsize(path) > 0


class _ModelService:
    """
    Singleton container for the loaded model and scaler.
    Call .load() at startup. Call .predict() for inference.
    Inference is blocked unless both a valid checkpoint and scaler are loaded.
    """

    def __init__(self):
        self._model: Optional[SOZ_GAT] = None
        self._scaler = None
        self._device = torch.device(settings.DEVICE)
        self._input_dim: int = 15
        self._loaded: bool = False
        self._checkpoint_loaded: bool = False
        self._scaler_loaded: bool = False

    # ── Loading ───────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load model + scaler from disk. Called once at startup."""
        self._checkpoint_loaded = False
        self._scaler_loaded = False
        self._model = None
        self._scaler = None

        self._load_scaler()
        self._load_model()
        self._loaded = True

        if self.inference_ready:
            logger.info(f"SOZ_GAT inference ready on device={self._device}")
        else:
            logger.warning(
                "SOZ_GAT is not inference-ready: %s",
                self.readiness_detail or "checkpoint and scaler required",
            )

    def _load_model(self) -> None:
        model_path = settings.MODEL_PATH
        if not _nonempty_file(model_path):
            logger.warning(
                "Model checkpoint missing or empty at %s. "
                "Place a non-empty trained soz_gat.pt (with model_state_dict) to enable predictions.",
                model_path,
            )
            self._model = None
            self._checkpoint_loaded = False
            return

        try:
            logger.info("Loading model from %s", model_path)
            checkpoint = torch.load(model_path, map_location=self._device)

            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
                self._input_dim = int(checkpoint.get("input_dim", 15))
            else:
                state_dict = checkpoint
                self._input_dim = 15

            self._model = SOZ_GAT(input_dim=self._input_dim).to(self._device)
            self._model.load_state_dict(state_dict)
            self._model.eval()
            self._checkpoint_loaded = True
        except Exception as e:
            logger.exception("Failed to load model checkpoint: %s", e)
            self._model = None
            self._checkpoint_loaded = False

    def _load_scaler(self) -> None:
        scaler_path = settings.SCALER_PATH
        if not _nonempty_file(scaler_path):
            logger.warning(
                "Scaler missing or empty at %s. "
                "Place a non-empty scaler.pkl (StandardScaler) to enable predictions.",
                scaler_path,
            )
            self._scaler = None
            self._scaler_loaded = False
            return

        try:
            logger.info("Loading scaler from %s", scaler_path)
            with open(scaler_path, "rb") as f:
                self._scaler = pickle.load(f)
            self._scaler_loaded = True
        except Exception as e:
            logger.exception("Failed to load scaler: %s", e)
            self._scaler = None
            self._scaler_loaded = False

    @property
    def checkpoint_loaded(self) -> bool:
        return self._checkpoint_loaded

    @property
    def scaler_loaded(self) -> bool:
        return self._scaler_loaded

    # ── Readiness ─────────────────────────────────────────────────────────────

    @property
    def inference_ready(self) -> bool:
        return bool(self._checkpoint_loaded and self._scaler_loaded and self._model is not None)

    @property
    def readiness_detail(self) -> Optional[str]:
        if self.inference_ready:
            return None
        missing = []
        if not self._checkpoint_loaded:
            missing.append(
                f"trained checkpoint at {settings.MODEL_PATH} (non-empty .pt with model_state_dict)"
            )
        if not self._scaler_loaded:
            missing.append(f"StandardScaler at {settings.SCALER_PATH} (non-empty .pkl)")
        return (
            "Inference disabled until you provide: " + "; ".join(missing) + "."
        )

    def assert_inference_ready(self) -> None:
        if not self._loaded:
            raise InferenceNotReadyError("Model service is still initializing.")
        if not self.inference_ready:
            raise InferenceNotReadyError(
                self.readiness_detail
                or "Place valid soz_gat.pt and scaler.pkl under saved_models/ (see backend README)."
            )

    # ── Inference ─────────────────────────────────────────────────────────────

    def predict(
        self,
        node_features: np.ndarray,  # (n_channels, 15) unnormalised
        edge_index: list,  # list of [i, j] pairs
        edge_attr: list,  # list of coherence weights
    ) -> dict:
        self.assert_inference_ready()

        features_scaled = self._scale(node_features)

        x = torch.tensor(features_scaled, dtype=torch.float).to(self._device)
        ei = torch.tensor(edge_index, dtype=torch.long).t().contiguous().to(self._device)
        ea = torch.tensor(edge_attr, dtype=torch.float).unsqueeze(1).to(self._device)

        self._model.eval()
        with torch.no_grad():
            logits = self._model(x, ei)
            probs = F.softmax(logits, dim=1).cpu().numpy()

        soz_probs = probs[:, 1].tolist()
        predictions = (probs[:, 1] >= 0.5).astype(int).tolist()
        confidence = float(np.max(probs, axis=1).mean())
        risk_score = float(np.mean(soz_probs))

        return {
            "predictions": predictions,
            "class_probabilities": [
                {"normal": float(p[0]), "soz": float(p[1])} for p in probs
            ],
            "soz_probabilities": soz_probs,
            "confidence": round(confidence, 4),
            "risk_score": round(risk_score, 4),
            "n_soz_predicted": int(sum(predictions)),
            "n_channels": len(predictions),
        }

    def _scale(self, features: np.ndarray) -> np.ndarray:
        if self._scaler is not None:
            return self._scaler.transform(features).astype(np.float32)
        raise RuntimeError("Scaler required for inference — should be gated by assert_inference_ready.")

    # ── Info ──────────────────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def weights_in_memory(self) -> bool:
        """True when a model object exists and checkpoint bytes were loaded successfully."""
        return self._checkpoint_loaded and self._model is not None

    def info(self) -> dict:
        return {
            "model_name": "SOZ_GAT",
            "architecture": "Graph Attention Network (3-layer GAT + skip connection)",
            "version": settings.MODEL_VERSION,
            "input_features": 15,
            "feature_names": [
                "variance", "skewness", "kurtosis", "line_length", "zero_crossing_rate",
                "logpower_delta", "logpower_theta", "logpower_alpha",
                "logpower_beta", "logpower_low_gamma", "logpower_high_gamma",
                "spectral_entropy", "hfo_rate", "spike_rate", "pac_theta_gamma",
            ],
            "output_classes": ["normal_zone", "soz"],
            "loss_function": "Focal Loss (alpha=0.75, gamma=2.0)",
            "graph_construction": "Gamma-band coherence (adaptive median threshold)",
            "dataset": "OpenNeuro ds004752 (iEEG, clinical SOZ labels)",
            "scaler": "StandardScaler (fitted per LOSO fold on training subjects)",
            "device": str(self._device),
            "loaded": self._loaded,
            "inference_ready": self.inference_ready,
            "checkpoint_loaded": self.checkpoint_loaded,
            "scaler_loaded": self.scaler_loaded,
            "readiness_detail": self.readiness_detail,
        }


# ── Singleton export ──────────────────────────────────────────────────────────
ModelService = _ModelService()
