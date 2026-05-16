"""
Pytest configuration: ensure MODEL_PATH / SCALER_PATH point to minimal valid artifacts
before the FastAPI app imports settings (integration tests expect inference_ready).
"""

from __future__ import annotations

import os
import pickle
import tempfile

import numpy as np
import torch


def pytest_configure(config) -> None:
    try:
        from torch_geometric.nn import GATConv  # noqa: F401
    except ImportError:
        # Without PyG, SOZ_GAT cannot be instantiated; leave MODEL_PATH/SCALER_PATH from the environment.
        return

    from sklearn.preprocessing import StandardScaler

    from app.models.soz_gat import SOZ_GAT

    tmp = tempfile.mkdtemp(prefix="soz_gat_test_")
    model_path = os.path.join(tmp, "soz_gat.pt")
    scaler_path = os.path.join(tmp, "scaler.pkl")

    model = SOZ_GAT(input_dim=15)
    torch.save({"model_state_dict": model.state_dict(), "input_dim": 15}, model_path)

    scaler = StandardScaler()
    scaler.fit(np.random.RandomState(0).standard_normal((32, 15)))
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)

    os.environ["MODEL_PATH"] = model_path
    os.environ["SCALER_PATH"] = scaler_path
