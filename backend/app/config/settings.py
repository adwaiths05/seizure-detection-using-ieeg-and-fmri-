"""
Application settings — loaded from environment variables / .env
"""

from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Model
    MODEL_PATH: str = "saved_models/soz_gat.pt"
    SCALER_PATH: str = "saved_models/scaler.pkl"
    MODEL_VERSION: str = "1.0.0"

    # Security
    RATE_LIMIT: int = 60           # requests per minute per IP
    API_KEY_ENABLED: bool = False  # set True + API_KEY in prod
    API_KEY: str = ""

    # CORS — comma-separated in .env: CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # Inference
    DEVICE: str = "cpu"            # "cuda" if GPU available
    MAX_CHANNELS: int = 40
    SFREQ_TARGET: int = 500
    COH_THRESHOLD: float = 0.3

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "logs"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str], None]) -> List[str]:
        if v is None:
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
        if isinstance(v, str):
            s = v.strip()
            if s == "*":
                return ["*"]
            if s.startswith("["):
                import json

                try:
                    parsed = json.loads(s)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except json.JSONDecodeError:
                    pass
            return [p.strip() for p in s.split(",") if p.strip()]
        return list(v)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
