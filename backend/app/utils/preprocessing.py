"""
Preprocessing pipeline — must exactly replicate training behaviour.

Training pipeline (from notebook):
  1. bandpass 0.5–200 Hz (FIR/hamming, zero-phase)
  2. Notch filter (50 or 60 Hz harmonics)
  3. Resample → 500 Hz
  4. Average re-reference
  5. Extract 15 features per channel
  6. StandardScaler (fitted on training fold — loaded from disk for inference)
  7. Build per-subject coherence graph (adaptive median threshold)

For REST API inference: user provides pre-extracted features OR raw EDF bytes.
Both paths are supported (see InferenceService).
"""

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import signal
from scipy.signal import hilbert, welch
from scipy.stats import kurtosis as _kurtosis, skew as _skew

logger = logging.getLogger(__name__)

# ── Constants (must match training) ──────────────────────────────────────────
SFREQ_TARGET = 500
COH_THRESHOLD = 0.3   # fallback; adaptive median used when possible

FREQ_BANDS: Dict[str, Tuple[float, float]] = {
    "delta":      (1,    4),
    "theta":      (4,    8),
    "alpha":      (8,   13),
    "beta":       (13,  30),
    "low_gamma":  (30,  70),
    "high_gamma": (70, 150),
}

FEATURE_NAMES: List[str] = [
    "variance", "skewness", "kurtosis", "line_length", "zero_crossing_rate",
    "logpower_delta", "logpower_theta", "logpower_alpha",
    "logpower_beta", "logpower_low_gamma", "logpower_high_gamma",
    "spectral_entropy", "hfo_rate", "spike_rate", "pac_theta_gamma",
]

N_FEATURES = len(FEATURE_NAMES)   # 15


# ── Feature extraction ────────────────────────────────────────────────────────

def extract_node_features(data: np.ndarray, sfreq: float) -> np.ndarray:
    """
    Extract 15 features per channel from raw EEG data.

    Args:
        data:  (n_channels, n_samples) float32 array
        sfreq: sampling frequency (Hz)

    Returns:
        features: (n_channels, 15) float32 array — unnormalised
    """
    n_ch = data.shape[0]
    feat_cols = []

    # ── Time-domain (5) ───────────────────────────────────────────────────────
    feat_cols.append(np.var(data, axis=1))
    feat_cols.append(_skew(data, axis=1))
    feat_cols.append(_kurtosis(data, axis=1))
    feat_cols.append(np.mean(np.abs(np.diff(data, axis=1)), axis=1))

    zc = np.array(
        [np.sum(np.diff(np.sign(data[ch])) != 0) / data.shape[1] for ch in range(n_ch)]
    )
    feat_cols.append(zc)

    # ── Frequency-domain (7) ──────────────────────────────────────────────────
    n_per_seg = min(int(sfreq * 2), data.shape[1])
    freqs, psd = welch(data, fs=sfreq, nperseg=n_per_seg)

    for band, (fmin, fmax) in FREQ_BANDS.items():
        if fmax < sfreq / 2:
            idx = (freqs >= fmin) & (freqs <= fmax)
            feat_cols.append(np.log1p(np.mean(psd[:, idx], axis=1)))

    psd_norm = psd / (psd.sum(axis=1, keepdims=True) + 1e-12)
    spec_ent = -np.sum(psd_norm * np.log2(psd_norm + 1e-12), axis=1)
    feat_cols.append(spec_ent)

    # ── Nonlinear (3) ─────────────────────────────────────────────────────────
    # HFO rate (feature — NOT label source)
    b_h, a_h = signal.butter(4, [80 / (sfreq / 2), min(250 / (sfreq / 2), 0.99)], btype="band")
    env_h = np.abs(hilbert(signal.filtfilt(b_h, a_h, data, axis=1)))
    dur_min = data.shape[1] / sfreq / 60
    min_dur_samples = max(3, int(sfreq * 0.006))
    hfo_rates = []
    for ch in range(n_ch):
        thresh = np.mean(env_h[ch]) + 3 * np.std(env_h[ch])
        above = (env_h[ch] > thresh).astype(int)
        events, count = 0, 0
        for val in above:
            if val:
                count += 1
            else:
                if count >= min_dur_samples:
                    events += 1
                count = 0
        hfo_rates.append(events / max(dur_min, 1e-6))
    feat_cols.append(np.array(hfo_rates))

    # Spike rate
    z_data = (data - data.mean(1, keepdims=True)) / (data.std(1, keepdims=True) + 1e-8)
    spike_rates = []
    min_spike_dur = max(1, int(sfreq * 0.002))
    for ch in range(n_ch):
        above = (z_data[ch] > 4).astype(int)
        events, count = 0, 0
        for val in above:
            if val:
                count += 1
            else:
                if count >= min_spike_dur:
                    events += 1
                count = 0
        spike_rates.append(events / max(dur_min, 1e-6))
    feat_cols.append(np.array(spike_rates))

    # PAC proxy: corr(theta_envelope, gamma_power)
    b_t, a_t = signal.butter(4, [4 / (sfreq / 2), 8 / (sfreq / 2)], btype="band")
    b_g, a_g = signal.butter(4, [30 / (sfreq / 2), min(70 / (sfreq / 2), 0.99)], btype="band")
    env_theta = np.abs(hilbert(signal.filtfilt(b_t, a_t, data, axis=1)))
    pwr_gamma = np.abs(hilbert(signal.filtfilt(b_g, a_g, data, axis=1))) ** 2
    pac = np.array(
        [float(np.corrcoef(env_theta[ch], pwr_gamma[ch])[0, 1]) for ch in range(n_ch)]
    )
    pac = np.nan_to_num(pac, nan=0.0)
    feat_cols.append(pac)

    return np.column_stack(feat_cols).astype(np.float32)


def build_coherence_graph(
    data_raw: np.ndarray,
    sfreq: float,
) -> Tuple[List[List[int]], List[float]]:
    """
    Build adjacency list from gamma-band coherence (adaptive median threshold).

    Returns:
        edge_index: list of [i, j] pairs (undirected → both directions added)
        edge_attr:  coherence weights
    """
    from scipy.signal import coherence

    n_ch = data_raw.shape[0]
    coh_vals = []

    for i in range(n_ch):
        for j in range(i + 1, n_ch):
            f, coh = coherence(data_raw[i], data_raw[j], fs=sfreq, nperseg=int(sfreq))
            mc = float(np.mean(coh[(f >= 30) & (f <= 100)]))
            coh_vals.append(mc)

    coh_thresh = float(np.median(coh_vals)) if coh_vals else COH_THRESHOLD
    logger.debug(f"Coherence threshold (adaptive median): {coh_thresh:.3f}")

    edge_index, edge_attr = [], []
    k = 0
    for i in range(n_ch):
        for j in range(i + 1, n_ch):
            mc = coh_vals[k]
            k += 1
            if mc > coh_thresh:
                edge_index += [[i, j], [j, i]]
                edge_attr += [mc, mc]

    # Fallback: self-loops if no edges
    if not edge_index:
        edge_index = [[k, k] for k in range(n_ch)]
        edge_attr = [1.0] * n_ch

    return edge_index, edge_attr


def validate_features(features: np.ndarray) -> None:
    """Validate feature matrix shape and sanity-check values."""
    if features.ndim != 2:
        raise ValueError(f"Features must be 2D, got shape {features.shape}")
    if features.shape[1] != N_FEATURES:
        raise ValueError(
            f"Expected {N_FEATURES} features per channel, got {features.shape[1]}. "
            f"Required order: {FEATURE_NAMES}"
        )
    if np.any(np.isnan(features)) or np.any(np.isinf(features)):
        raise ValueError("Features contain NaN or Inf values. Check input data.")
