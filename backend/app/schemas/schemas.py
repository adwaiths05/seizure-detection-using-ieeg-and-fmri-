"""
Pydantic schemas — request validation and response serialization.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator


# ── Shared ────────────────────────────────────────────────────────────────────

FEATURE_NAMES = [
    "variance", "skewness", "kurtosis", "line_length", "zero_crossing_rate",
    "logpower_delta", "logpower_theta", "logpower_alpha",
    "logpower_beta", "logpower_low_gamma", "logpower_high_gamma",
    "spectral_entropy", "hfo_rate", "spike_rate", "pac_theta_gamma",
]


# ── Requests ──────────────────────────────────────────────────────────────────

class PredictFromFeaturesRequest(BaseModel):
    """
    POST /predict — pre-extracted features path.

    features: list of 15-element lists, one per channel.
    Example for 3 channels:
      [[0.1, 0.2, ..., 0.15], [0.3, 0.4, ..., 0.15], ...]
    """

    features: List[List[float]] = Field(
        ...,
        description="Node feature matrix: (n_channels, 15). Feature order: " + str(FEATURE_NAMES),
        min_items=1,
    )
    channel_names: Optional[List[str]] = Field(
        None, description="Optional electrode names, e.g. ['LA1','LA2',...]"
    )
    raw_eeg: Optional[List[List[float]]] = Field(
        None,
        description=(
            "Optional raw EEG (n_channels, n_samples) at sfreq Hz — "
            "used only for coherence graph construction. Omit for fully-connected fallback."
        ),
    )
    sfreq: float = Field(500.0, description="Sampling frequency in Hz (used with raw_eeg)")

    @validator("features")
    def validate_feature_dim(cls, v):
        for i, row in enumerate(v):
            if len(row) != 15:
                raise ValueError(
                    f"Channel {i}: expected 15 features, got {len(row)}. "
                    f"Required order: {FEATURE_NAMES}"
                )
        return v

    @validator("sfreq")
    def validate_sfreq(cls, v):
        if v <= 0:
            raise ValueError("sfreq must be positive")
        return v


class PredictFromRawRequest(BaseModel):
    """
    POST /predict/raw — full pipeline from raw EEG signal.

    raw_eeg: (n_channels, n_samples) — float array of raw signal values.
    """

    raw_eeg: List[List[float]] = Field(
        ...,
        description="Raw EEG signal: (n_channels, n_samples). Min 2 channels, min 1s of data.",
        min_items=2,
    )
    sfreq: float = Field(..., description="Sampling frequency (Hz), e.g. 500.0")
    channel_names: Optional[List[str]] = Field(None, description="Electrode labels")

    @validator("sfreq")
    def validate_sfreq(cls, v):
        if not (1 <= v <= 10000):
            raise ValueError("sfreq must be between 1 and 10000 Hz")
        return v

    @validator("raw_eeg")
    def validate_eeg(cls, v):
        if len(v) < 2:
            raise ValueError("Need at least 2 channels")
        n_samples = len(v[0])
        if n_samples < 100:
            raise ValueError("Need at least 100 samples per channel")
        for i, ch in enumerate(v):
            if len(ch) != n_samples:
                raise ValueError(f"Channel {i} has {len(ch)} samples; expected {n_samples}")
        return v


class BatchPredictRequest(BaseModel):
    """POST /predict/batch — list of feature matrices, one per subject/segment."""

    samples: List[PredictFromFeaturesRequest] = Field(
        ..., description="List of individual prediction requests", min_items=1, max_items=50
    )


# ── Responses ─────────────────────────────────────────────────────────────────

class ChannelResult(BaseModel):
    channel: str
    prediction: str      # "SOZ" | "Normal"
    soz_probability: float


class ClassProbability(BaseModel):
    normal: float
    soz: float


class PredictResponse(BaseModel):
    status: str = "ok"
    predictions: List[int]           # 0=Normal, 1=SOZ
    soz_probabilities: List[float]
    class_probabilities: List[ClassProbability]
    per_channel: List[ChannelResult]
    channel_names: List[str]
    confidence: float
    risk_score: float
    n_soz_predicted: int
    n_channels: int
    features_extracted: Optional[bool] = None


class BatchPredictResponse(BaseModel):
    status: str = "ok"
    n_samples: int
    results: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
    inference_ready: bool = False
    checkpoint_loaded: bool = False
    scaler_loaded: bool = False
    readiness_detail: Optional[str] = None


class ModelInfoResponse(BaseModel):
    model_name: str
    architecture: str
    version: str
    input_features: int
    feature_names: List[str]
    output_classes: List[str]
    loss_function: str
    graph_construction: str
    dataset: str
    scaler: str
    device: str
    loaded: bool
    inference_ready: bool = False
    checkpoint_loaded: bool = False
    scaler_loaded: bool = False
    readiness_detail: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
