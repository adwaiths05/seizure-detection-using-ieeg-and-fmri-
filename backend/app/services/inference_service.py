"""
InferenceService — orchestrates preprocessing → graph building → prediction.

Two input modes:
  A) pre_extracted: user provides 15 features per channel directly
  B) raw_eeg:       user provides raw signal data (n_channels × n_samples)
"""

import logging
from typing import List, Optional

import numpy as np

from app.services.model_service import ModelService
from app.utils.preprocessing import (
    FEATURE_NAMES,
    extract_node_features,
    build_coherence_graph,
    validate_features,
)

logger = logging.getLogger(__name__)


class InferenceService:

    @staticmethod
    def predict_from_features(
        features: List[List[float]],      # (n_channels, 15)
        channel_names: Optional[List[str]] = None,
        raw_eeg: Optional[List[List[float]]] = None,   # for graph construction
        sfreq: float = 500.0,
    ) -> dict:
        """
        Inference from pre-extracted features.

        Args:
            features:      [[f1,f2,...,f15], ...] — one row per channel
            channel_names: optional list of channel labels
            raw_eeg:       (n_channels, n_samples) — used ONLY for coherence graph
                           If None, a fully-connected graph is used (weaker result)
            sfreq:         sampling frequency (used when raw_eeg provided)

        Returns:
            prediction dict
        """
        feat_arr = np.array(features, dtype=np.float32)
        validate_features(feat_arr)

        n_ch = feat_arr.shape[0]
        logger.info(f"Inference: {n_ch} channels, mode=pre_extracted")

        # Build graph
        if raw_eeg is not None:
            raw_arr = np.array(raw_eeg, dtype=np.float32)
            edge_index, edge_attr = build_coherence_graph(raw_arr, sfreq)
        else:
            # Fallback: fully-connected graph with weight 1.0
            logger.warning("No raw_eeg provided — using fully-connected graph fallback.")
            edge_index = [[i, j] for i in range(n_ch) for j in range(n_ch) if i != j]
            edge_attr = [1.0] * len(edge_index)

        result = ModelService.predict(feat_arr, edge_index, edge_attr)

        # Attach channel names if provided
        if channel_names:
            result["channel_names"] = channel_names[:n_ch]
        else:
            result["channel_names"] = [f"Ch{i}" for i in range(n_ch)]

        # Per-channel breakdown
        result["per_channel"] = [
            {
                "channel": result["channel_names"][i],
                "prediction": "SOZ" if result["predictions"][i] == 1 else "Normal",
                "soz_probability": round(result["soz_probabilities"][i], 4),
            }
            for i in range(n_ch)
        ]

        result["features_extracted"] = False

        return result

    @staticmethod
    def predict_from_raw(
        raw_eeg: List[List[float]],     # (n_channels, n_samples)
        sfreq: float,
        channel_names: Optional[List[str]] = None,
    ) -> dict:
        """
        Full pipeline inference from raw EEG data.
        Extracts all 15 features internally, then runs prediction.

        Args:
            raw_eeg:       (n_channels, n_samples) raw signal
            sfreq:         sampling frequency (Hz)
            channel_names: optional channel labels
        """
        raw_arr = np.array(raw_eeg, dtype=np.float32)
        logger.info(f"Inference: {raw_arr.shape[0]} channels, mode=raw_eeg, sfreq={sfreq}")

        if raw_arr.ndim != 2:
            raise ValueError("raw_eeg must be a 2D array: (n_channels, n_samples)")

        # Extract features (same function as training)
        features = extract_node_features(raw_arr, sfreq)

        # Build coherence graph
        edge_index, edge_attr = build_coherence_graph(raw_arr, sfreq)

        result = ModelService.predict(features, edge_index, edge_attr)

        n_ch = raw_arr.shape[0]
        ch_names = channel_names[:n_ch] if channel_names else [f"Ch{i}" for i in range(n_ch)]
        result["channel_names"] = ch_names
        result["per_channel"] = [
            {
                "channel": ch_names[i],
                "prediction": "SOZ" if result["predictions"][i] == 1 else "Normal",
                "soz_probability": round(result["soz_probabilities"][i], 4),
            }
            for i in range(n_ch)
        ]
        result["features_extracted"] = True

        return result
