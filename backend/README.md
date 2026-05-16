# SOZ_GAT Backend API

FastAPI backend for Seizure Onset Zone (SOZ) detection via iEEG Graph Attention Network.

**Model**: SOZ_GAT — 3-layer GAT + skip connection  
**Dataset**: OpenNeuro ds004752 (clinical SOZ labels from BIDS electrodes.tsv)  
**Accuracy**: ~91% (LOSO-CV, see notebook)

---

## Folder Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, CORS, middleware
│   ├── config/settings.py         # All config via .env
│   ├── routes/
│   │   ├── health.py              # GET /health
│   │   ├── predict.py             # POST /predict, /predict/raw, /predict/batch
│   │   └── model_info.py          # GET /model-info
│   ├── services/
│   │   ├── model_service.py       # Singleton model loader + inference
│   │   └── inference_service.py   # Preprocessing → graph → prediction orchestration
│   ├── models/soz_gat.py          # GAT architecture (mirrors training exactly)
│   ├── utils/
│   │   ├── preprocessing.py       # 15-feature extraction + coherence graph
│   │   └── logger.py              # Rotating file + console logging
│   ├── schemas/schemas.py         # Pydantic request/response schemas
│   └── middleware/rate_limiter.py # IP-based rate limiting
├── saved_models/
│   ├── soz_gat.pt                 # ← PUT YOUR TRAINED MODEL HERE
│   └── scaler.pkl                 # ← PUT YOUR FITTED SCALER HERE
├── tests/test_api.py
├── save_model.py                  # Helper: export model from notebook
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Quick Start

### 1. Export model from Kaggle notebook

Add this to the **end of your notebook** after training:

```python
import pickle, torch, os

# Save best model
os.makedirs('saved_models', exist_ok=True)
torch.save({
    'model_state_dict': best_model.state_dict(),
    'input_dim': 15,
}, 'saved_models/soz_gat.pt')

# Save best scaler (from the fold with best AUC)
# best_scaler is the StandardScaler fitted in that fold
with open('saved_models/scaler.pkl', 'wb') as f:
    pickle.dump(best_scaler, f)
```

Download `saved_models/` from Kaggle output, place inside `backend/`.

### 2. Local development

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Visit: http://localhost:8000/docs (Swagger UI)

### 3. Docker

```bash
docker-compose up --build
```

---

## API Endpoints

### GET /health
```json
{"status": "running", "model_loaded": true, "version": "1.0.0"}
```

### GET /model-info
Returns model architecture, feature names, dataset info.

### POST /predict
Pre-extracted 15 features per channel.

**Request:**
```json
{
  "features": [
    [0.1, 0.2, 0.3, 0.1, 0.05, 1.2, 0.8, 0.6, 0.9, 1.1, 0.7, 3.2, 0.5, 0.1, 0.02],
    [0.5, -0.1, 2.1, 0.3, 0.08, 0.9, 0.7, 0.4, 1.2, 2.5, 1.8, 3.5, 8.2, 1.2, 0.15]
  ],
  "channel_names": ["LA1", "LA2"],
  "raw_eeg": null,
  "sfreq": 500.0
}
```

**Response:**
```json
{
  "status": "ok",
  "predictions": [0, 1],
  "soz_probabilities": [0.12, 0.88],
  "class_probabilities": [
    {"normal": 0.88, "soz": 0.12},
    {"normal": 0.12, "soz": 0.88}
  ],
  "per_channel": [
    {"channel": "LA1", "prediction": "Normal", "soz_probability": 0.12},
    {"channel": "LA2", "prediction": "SOZ",    "soz_probability": 0.88}
  ],
  "channel_names": ["LA1", "LA2"],
  "confidence": 0.88,
  "risk_score": 0.50,
  "n_soz_predicted": 1,
  "n_channels": 2
}
```

### POST /predict/raw
Full pipeline from raw EEG signal (feature extraction happens server-side).

```json
{
  "raw_eeg": [[...1000 samples...], [...1000 samples...]],
  "sfreq": 500.0,
  "channel_names": ["LA1", "LA2"]
}
```

### POST /predict/batch
List of requests, max 50.

```json
{
  "samples": [
    {"features": [[...]]},
    {"features": [[...], [...]]}
  ]
}
```

---

## Feature Order (15 features)

Must be provided in this exact order for `/predict`:

| # | Name | Description |
|---|------|-------------|
| 1 | variance | Signal variance |
| 2 | skewness | Distribution skewness |
| 3 | kurtosis | Distribution kurtosis |
| 4 | line_length | Mean absolute first difference |
| 5 | zero_crossing_rate | Zero-crossing rate |
| 6 | logpower_delta | Log band power 1–4 Hz |
| 7 | logpower_theta | Log band power 4–8 Hz |
| 8 | logpower_alpha | Log band power 8–13 Hz |
| 9 | logpower_beta | Log band power 13–30 Hz |
| 10 | logpower_low_gamma | Log band power 30–70 Hz |
| 11 | logpower_high_gamma | Log band power 70–150 Hz |
| 12 | spectral_entropy | Spectral entropy (Welch PSD) |
| 13 | hfo_rate | HFO rate (events/min, feature only) |
| 14 | spike_rate | Spike rate (events/min) |
| 15 | pac_theta_gamma | PAC proxy: corr(θ_envelope, γ_power) |

---

## Frontend Integration

### fetch (JavaScript)
```javascript
const res = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ features: myFeatures, channel_names: myChannels }),
});
const data = await res.json();
// data.per_channel → per-electrode SOZ predictions
// data.risk_score  → 0.0–1.0 overall SOZ risk
```

### Axios
```javascript
const { data } = await axios.post('/predict', {
  features: myFeatures,
  channel_names: myChannels,
});
```

---

## Deployment

### Render / Railway
1. Push to GitHub
2. Set env vars from `.env.example` in dashboard
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### AWS (ECS / Lambda)
Use the Dockerfile. Push image to ECR, deploy via ECS or Lambda container.

### GCP Cloud Run
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/soz-api
gcloud run deploy soz-api --image gcr.io/PROJECT_ID/soz-api --platform managed
```

### Azure Container Apps
```bash
az containerapp create --name soz-api --image soz-api:latest
```

---

## Testing

```bash
pip install pytest httpx
pytest tests/test_api.py -v
```

---

## Notes

- **No retraining at inference** — model and scaler are loaded once at startup.
- **Scaler required** — without `scaler.pkl`, predictions are unreliable (raw unnormalised features).
- **Graph construction** — for `/predict`, provide `raw_eeg` alongside features for accurate coherence graph; omitting it falls back to a fully-connected graph.
- **Thread safety** — ModelService is a singleton; safe for concurrent requests.
