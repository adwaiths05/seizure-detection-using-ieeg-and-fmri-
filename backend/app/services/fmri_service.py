import logging
import os
from typing import Optional, Dict

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

try:
    from torch_geometric.nn import GATv2Conv, global_mean_pool, global_max_pool, GraphNorm
except Exception:
    GATv2Conv = None
    global_mean_pool = None
    global_max_pool = None
    GraphNorm = None

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EpilepsyGAT(nn.Module):
    def __init__(self, in_feats: int = 5, hidden: int = 64, n_heads: int = 4, n_classes: int = 2, dropout: float = 0.3):
        super().__init__()
        if GATv2Conv is None:
            raise RuntimeError("torch_geometric required for FMRI GAT model")
        self.conv1 = GATv2Conv(in_feats, hidden, heads=n_heads, edge_dim=1, dropout=dropout, concat=True)
        self.norm1 = GraphNorm(hidden * n_heads)
        self.conv2 = GATv2Conv(hidden * n_heads, hidden, heads=n_heads, edge_dim=1, dropout=dropout, concat=True)
        self.norm2 = GraphNorm(hidden * n_heads)
        self.conv3 = GATv2Conv(hidden * n_heads, hidden, heads=1, edge_dim=1, dropout=dropout, concat=False)
        self.norm3 = GraphNorm(hidden)
        self.head = nn.Sequential(nn.Linear(hidden * 2, 128), nn.GELU(), nn.Dropout(dropout), nn.Linear(128, n_classes))

    def forward(self, x, edge_index, edge_attr, batch, return_node_emb: bool = False):
        x = self.conv1(x, edge_index, edge_attr); x = self.norm1(x, batch); x = F.gelu(x)
        x = self.conv2(x, edge_index, edge_attr); x = self.norm2(x, batch); x = F.gelu(x)
        x = self.conv3(x, edge_index, edge_attr); x = self.norm3(x, batch)
        node_emb = x
        g = torch.cat([global_mean_pool(x, batch), global_max_pool(x, batch)], dim=1)
        out = self.head(g)
        if return_node_emb:
            return out, node_emb
        return out


class FMRIService:
    """Singleton lightweight FMRI inference service.

    Loads saved_models/fmri_gat.pth (EpilepsyGAT state_dict) and exposes predict().
    """

    _instance: Optional["FMRIService"] = None

    def __init__(self):
        self._model: Optional[EpilepsyGAT] = None
        self._device = torch.device(settings.DEVICE)
        self._loaded = False

    @classmethod
    def instance(cls) -> "FMRIService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load(self, model_path: str = "saved_models/fmri_gat.pth") -> None:
        self._loaded = False
        self._model = None
        if not os.path.isfile(model_path) or os.path.getsize(model_path) == 0:
            logger.warning("FMRI checkpoint missing at %s", model_path)
            return

        try:
            logger.info("Loading FMRI GAT from %s", model_path)
            state = torch.load(model_path, map_location=self._device)
            # instantiate model with standard params; adjust if checkpoint contains different hyperparams
            model = EpilepsyGAT(in_feats=5).to(self._device)
            model.load_state_dict(state)
            model.eval()
            self._model = model
            self._loaded = True
            logger.info("FMRI model loaded")
        except Exception as e:
            logger.exception("Failed to load FMRI model: %s", e)
            self._model = None
            self._loaded = False

    @property
    def loaded(self) -> bool:
        return self._loaded and self._model is not None

    def predict(self, fc_matrix: np.ndarray, node_features: np.ndarray) -> Dict:
        if not self.loaded:
            raise RuntimeError("FMRI model not loaded")

        # build graph from fc_matrix (thresholded)
        r = np.array(fc_matrix, dtype=np.float32)
        n = r.shape[0]
        mask = np.abs(r) > 0.15
        src, dst = np.where(mask & (np.eye(n) == 0))
        if len(src) == 0:
            # fallback: fully connected
            src, dst = np.where(~np.eye(n, dtype=bool))

        edge_index = torch.tensor(np.stack([src, dst]), dtype=torch.long).to(self._device)
        edge_attr = torch.tensor(r[src, dst], dtype=torch.float32).unsqueeze(1).to(self._device)

        nf = torch.tensor(np.array(node_features, dtype=np.float32), dtype=torch.float32).to(self._device)
        batch_vec = torch.zeros(n, dtype=torch.long).to(self._device)

        with torch.no_grad():
            logits, node_emb = self._model(nf, edge_index, edge_attr, batch_vec, return_node_emb=True)
            prob_gat = float(F.softmax(logits, 1)[0, 1].cpu())

        # ROI probs: use absolute first node feature as proxy * prob
        nf0 = np.abs(np.array(node_features, dtype=np.float32)[:, 0])
        roi_p = nf0 * prob_gat
        if roi_p.max() > roi_p.min():
            roi_p = (roi_p - roi_p.min()) / (roi_p.max() - roi_p.min())
        else:
            roi_p = np.zeros_like(roi_p)

        return {
            "prob_gat": prob_gat,
            "roi_probs": roi_p.tolist(),
        }


FMRI = FMRIService.instance()