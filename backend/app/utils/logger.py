"""Rotating file + console logging setup."""

import logging
import os
from logging.handlers import RotatingFileHandler

from app.config.settings import settings


def setup_logging() -> None:
    os.makedirs(settings.LOG_DIR, exist_ok=True)
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console
    console = logging.StreamHandler()
    console.setFormatter(formatter)

    # Rotating file
    file_handler = RotatingFileHandler(
        os.path.join(settings.LOG_DIR, "api.log"),
        maxBytes=10 * 1024 * 1024,   # 10 MB
        backupCount=5,
    )
    file_handler.setFormatter(formatter)

    logging.basicConfig(level=level, handlers=[console, file_handler])
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
