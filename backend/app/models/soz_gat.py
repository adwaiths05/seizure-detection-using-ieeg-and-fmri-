"""
SOZ_GAT model architecture — mirrors training notebook architecture.

Architecture:
    - GAT1 + BN
    - GAT2 + residual from layer 1 + BN
    - GAT3 + projected residual from layer 1 + BN
    - MLP classifier
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

try:
    from torch_geometric.nn import GATConv
    TORCH_GEOMETRIC_AVAILABLE = True
except ImportError:
    TORCH_GEOMETRIC_AVAILABLE = False


class SOZ_GAT(nn.Module):
    """Improved 3-layer Graph Attention Network with residual connections."""

    def __init__(
        self,
        input_dim: int = 15,
        hidden: int = 128,
        n_heads_1: int = 8,
        n_heads_2: int = 8,
        n_heads_3: int = 4,
        dropout: float = 0.4,
        n_classes: int = 2,
    ):
        super().__init__()
        if not TORCH_GEOMETRIC_AVAILABLE:
            raise RuntimeError(
                "torch_geometric not installed. Run: pip install torch-geometric"
            )

        self.dropout = dropout

        # Layer 1: in_features -> hidden
        self.gat1 = GATConv(
            input_dim,
            hidden // n_heads_1,
            heads=n_heads_1,
            dropout=dropout,
            concat=True,
        )
        self.bn1 = nn.BatchNorm1d(hidden)

        # Layer 2: hidden -> hidden with residual
        self.gat2 = GATConv(
            hidden,
            hidden // n_heads_2,
            heads=n_heads_2,
            dropout=dropout,
            concat=True,
        )
        self.bn2 = nn.BatchNorm1d(hidden)

        # Layer 3: hidden -> hidden//n_heads_3 with residual projection
        self.gat3 = GATConv(
            hidden,
            hidden // n_heads_3,
            heads=n_heads_3,
            dropout=dropout,
            concat=False,
        )
        self.bn3 = nn.BatchNorm1d(hidden // n_heads_3)

        self.res_proj = nn.Linear(hidden, hidden // n_heads_3, bias=False)

        mid = hidden // n_heads_3
        self.mlp = nn.Sequential(
            nn.Linear(mid, mid // 2),
            nn.ELU(),
            nn.Dropout(dropout),
            nn.Linear(mid // 2, n_classes),
        )

        for module in self.mlp.modules():
            if isinstance(module, nn.Linear):
                nn.init.kaiming_normal_(module.weight, nonlinearity="relu")
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        x1 = self.gat1(x, edge_index)
        x1 = F.elu(self.bn1(x1))
        x1 = F.dropout(x1, p=self.dropout, training=self.training)

        x2 = self.gat2(x1, edge_index)
        x2 = F.elu(self.bn2(x2 + x1))
        x2 = F.dropout(x2, p=self.dropout, training=self.training)

        x3 = self.gat3(x2, edge_index)
        x3 = F.elu(self.bn3(x3 + self.res_proj(x1)))
        x3 = F.dropout(x3, p=self.dropout, training=self.training)

        return self.mlp(x3)


class FocalLoss(nn.Module):
    """Focal loss — same α/γ as training."""

    def __init__(self, alpha: float = 0.75, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce = F.cross_entropy(logits, targets, reduction="none")
        pt = torch.exp(-ce)
        weight = self.alpha * (1 - pt) ** self.gamma
        return (weight * ce).mean()
