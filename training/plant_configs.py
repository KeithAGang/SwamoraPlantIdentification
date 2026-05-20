"""
Per-plant training configuration.

Each entry knows:
- Where the dataset lives on disk.
- Whether the dataset already has a train/val split or needs one created.
- How to translate the on-disk folder name into the snake_case slug we use
  in treatments.json (and that the backend reads from labels.json).
- Where to write the final model.onnx + labels.json so the Node API picks them up.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = REPO_ROOT / "data"
MODELS_ROOT = REPO_ROOT / "SwamoraPlant.Server" / "models"


@dataclass(frozen=True)
class PlantConfig:
    name: str
    # Either:
    #   - train_dir + val_dir set (dataset already split), OR
    #   - single_dir set (we will split 80/20 at runtime).
    train_dir: Optional[Path] = None
    val_dir: Optional[Path] = None
    single_dir: Optional[Path] = None
    # Map raw ImageFolder class name -> canonical snake_case label.
    folder_to_label: dict[str, str] = field(default_factory=dict)

    @property
    def output_dir(self) -> Path:
        return MODELS_ROOT / self.name


POTATO = PlantConfig(
    name="potato",
    single_dir=DATA_ROOT / "Potato Dataset",
    folder_to_label={
        "Potato___Early_blight": "early_blight",
        "Potato___Late_blight": "late_blight",
        "Potato___healthy": "healthy",
    },
)

TOMATO = PlantConfig(
    name="tomato",
    train_dir=DATA_ROOT / "tomato" / "train",
    val_dir=DATA_ROOT / "tomato" / "val",
    folder_to_label={
        "Tomato___Bacterial_spot": "bacterial_spot",
        "Tomato___Early_blight": "early_blight",
        "Tomato___Late_blight": "late_blight",
        "Tomato___Leaf_Mold": "leaf_mold",
        "Tomato___Septoria_leaf_spot": "septoria_leaf_spot",
        "Tomato___Spider_mites Two-spotted_spider_mite": "spider_mites",
        "Tomato___Target_Spot": "target_spot",
        "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "yellow_leaf_curl_virus",
        "Tomato___Tomato_mosaic_virus": "mosaic_virus",
        "Tomato___healthy": "healthy",
    },
)

MAIZE = PlantConfig(
    name="maize",
    train_dir=DATA_ROOT / "Maize Dataset" / "train",
    val_dir=DATA_ROOT / "Maize Dataset" / "val",
    folder_to_label={
        # The crop_pictures "Blight" folder is Northern Leaf Blight in the
        # original PlantVillage maize set — confirmed by image content.
        "Blight": "northern_leaf_blight",
        "Common_Rust": "common_rust",
        "Gray_Leaf_Spot": "gray_leaf_spot",
        "Healthy": "healthy",
    },
)

ALL_PLANTS: dict[str, PlantConfig] = {
    "potato": POTATO,
    "tomato": TOMATO,
    "maize": MAIZE,
}
