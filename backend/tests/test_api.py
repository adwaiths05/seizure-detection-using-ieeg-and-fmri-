"""
tests/test_api.py — integration tests + usage examples

Run:
    pip install pytest httpx
    pytest tests/test_api.py -v

Or manually test against a running server with the curl/fetch examples below.
"""

import numpy as np
import pytest

pytest.importorskip("torch_geometric")

# ── Helpers ───────────────────────────────────────────────────────────────────
N_FEATURES = 15
FEATURE_NAMES = [
    "variance", "skewness", "kurtosis", "line_length", "zero_crossing_rate",
    "logpower_delta", "logpower_theta", "logpower_alpha",
    "logpower_beta", "logpower_low_gamma", "logpower_high_gamma",
    "spectral_entropy", "hfo_rate", "spike_rate", "pac_theta_gamma",
]


def make_fake_features(n_channels: int = 5) -> list:
    rng = np.random.default_rng(42)
    return rng.standard_normal((n_channels, N_FEATURES)).tolist()


def make_fake_raw_eeg(n_channels: int = 5, n_samples: int = 1000, sfreq: float = 500.0) -> list:
    rng = np.random.default_rng(42)
    return rng.standard_normal((n_channels, n_samples)).tolist()


# ── Pytest tests ──────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "running"
    assert data.get("inference_ready") is True
    assert data.get("checkpoint_loaded") is True
    assert data.get("scaler_loaded") is True


def test_model_info(client):
    resp = client.get("/model-info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "SOZ_GAT"
    assert data["input_features"] == 15
    assert data.get("inference_ready") is True


def test_predict_features(client):
    payload = {
        "features": make_fake_features(4),
        "channel_names": ["LA1", "LA2", "LH1", "LH2"],
    }
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "predictions" in data
    assert len(data["predictions"]) == 4
    assert "risk_score" in data
    assert "per_channel" in data


def test_predict_wrong_feature_dim(client):
    payload = {"features": [[1.0, 2.0, 3.0]]}   # only 3 features — should fail
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 422


def test_predict_raw(client):
    payload = {
        "raw_eeg": make_fake_raw_eeg(3, 1000),
        "sfreq": 500.0,
        "channel_names": ["LA1", "LA2", "LH1"],
    }
    resp = client.post("/predict/raw", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["features_extracted"] is True


def test_batch_predict(client):
    samples = [
        {"features": make_fake_features(3)},
        {"features": make_fake_features(5)},
    ]
    resp = client.post("/predict/batch", json={"samples": samples})
    assert resp.status_code == 200
    data = resp.json()
    assert data["n_samples"] == 2


# ── Manual test examples (run against live server) ────────────────────────────

CURL_EXAMPLES = """
# ── Health ────────────────────────────────────────────────────────────────────
curl http://localhost:8000/health

# ── Model Info ────────────────────────────────────────────────────────────────
curl http://localhost:8000/model-info

# ── Predict (pre-extracted features, 3 channels) ─────────────────────────────
curl -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "features": [
      [0.1, 0.2, 0.3, 0.1, 0.05, 1.2, 0.8, 0.6, 0.9, 1.1, 0.7, 3.2, 0.5, 0.1, 0.02],
      [0.5, -0.1, 2.1, 0.3, 0.08, 0.9, 0.7, 0.4, 1.2, 2.5, 1.8, 3.5, 8.2, 1.2, 0.15],
      [0.2, 0.1, 0.8, 0.2, 0.06, 1.0, 0.6, 0.5, 0.8, 0.9, 0.6, 3.0, 0.3, 0.2, 0.01]
    ],
    "channel_names": ["LA1", "LA2", "LH1"]
  }'

# ── Batch Predict ─────────────────────────────────────────────────────────────
curl -X POST http://localhost:8000/predict/batch \\
  -H "Content-Type: application/json" \\
  -d '{
    "samples": [
      {"features": [[0.1,0.2,0.3,0.1,0.05,1.2,0.8,0.6,0.9,1.1,0.7,3.2,0.5,0.1,0.02]]},
      {"features": [[0.5,0.1,2.1,0.3,0.08,0.9,0.7,0.4,1.2,2.5,1.8,3.5,8.2,1.2,0.15]]}
    ]
  }'
"""

FETCH_EXAMPLES = """
// ── JavaScript fetch ──────────────────────────────────────────────────────────
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    features: [
      [0.1, 0.2, 0.3, 0.1, 0.05, 1.2, 0.8, 0.6, 0.9, 1.1, 0.7, 3.2, 0.5, 0.1, 0.02],
    ],
    channel_names: ['LA1'],
  }),
});
const data = await response.json();
console.log('SOZ prediction:', data.per_channel);
console.log('Risk score:', data.risk_score);
"""

AXIOS_EXAMPLES = """
// ── Axios ─────────────────────────────────────────────────────────────────────
import axios from 'axios';

const { data } = await axios.post('http://localhost:8000/predict', {
  features: [
    [0.1, 0.2, 0.3, 0.1, 0.05, 1.2, 0.8, 0.6, 0.9, 1.1, 0.7, 3.2, 0.5, 0.1, 0.02],
  ],
  channel_names: ['LA1'],
});

// data.per_channel → [{channel, prediction, soz_probability}]
// data.risk_score  → 0.0–1.0
// data.n_soz_predicted → number of SOZ channels detected
"""

if __name__ == "__main__":
    print("Curl examples:")
    print(CURL_EXAMPLES)
    print("\nFetch examples:")
    print(FETCH_EXAMPLES)
    print("\nAxios examples:")
    print(AXIOS_EXAMPLES)
