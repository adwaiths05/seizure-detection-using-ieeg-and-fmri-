"""
save_model.py — run inside Kaggle/training environment AFTER training completes.

This script exports the trained SOZ_GAT model and StandardScaler
to the format expected by the FastAPI backend.

Usage (in notebook after training):
    exec(open('save_model.py').read())

Or standalone:
    python save_model.py --model_dir /kaggle/working/brain_fusion/models
"""

import argparse
import os
import pickle
import torch

# ── Adjust these paths to match your Kaggle output ──────────────────────────
DEFAULT_MODEL_DIR = "/kaggle/working/brain_fusion/models"
OUTPUT_DIR = "saved_models"


def save_for_backend(
    model,           # your trained SOZ_GAT instance
    scaler,          # your fitted StandardScaler (from the winning LOSO fold)
    input_dim: int = 15,
    output_dir: str = OUTPUT_DIR,
):
    os.makedirs(output_dir, exist_ok=True)

    # Save model
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "input_dim": input_dim,
        },
        os.path.join(output_dir, "soz_gat.pt"),
    )
    print(f"Model saved → {output_dir}/soz_gat.pt")

    # Save scaler
    with open(os.path.join(output_dir, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    print(f"Scaler saved → {output_dir}/scaler.pkl")


# ── If running standalone with existing .pt files ────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", default=f"{DEFAULT_MODEL_DIR}/best_model.pt")
    parser.add_argument("--scaler_path", default=f"{DEFAULT_MODEL_DIR}/best_scaler.pkl")
    parser.add_argument("--output_dir", default=OUTPUT_DIR)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    if os.path.exists(args.model_path):
        import shutil
        shutil.copy(args.model_path, os.path.join(args.output_dir, "soz_gat.pt"))
        print(f"Copied model → {args.output_dir}/soz_gat.pt")
    else:
        print(f"Model not found at {args.model_path}")

    if os.path.exists(args.scaler_path):
        import shutil
        shutil.copy(args.scaler_path, os.path.join(args.output_dir, "scaler.pkl"))
        print(f"Copied scaler → {args.output_dir}/scaler.pkl")
    else:
        print(f"Scaler not found at {args.scaler_path}")

    print("Done. Place saved_models/ next to the backend/ folder.")
