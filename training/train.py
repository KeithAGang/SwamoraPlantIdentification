"""
Fine-tune EfficientNet-B0 on a plant-disease dataset, then export to ONNX.

Usage:
    python train.py --plant potato
    python train.py --plant tomato --epochs 15 --batch-size 32
    python train.py --plant maize  --epochs 12

Outputs (per plant) into SwamoraPlant.Server/models/<plant>/:
    - best.pt        (PyTorch checkpoint, kept for re-export / fine-tuning)
    - model.onnx     (consumed by the Node API)
    - labels.json    (alphabetical class order — generated, do not hand-edit)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import transforms
from torchvision.datasets import ImageFolder
from torchvision.models import ResNet18_Weights, resnet18

from plant_configs import ALL_PLANTS, PlantConfig

# Must match SwamoraPlant.Server/models/<plant>/config.json
IMG_SIZE = 224
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

# Conservative augmentation: PlantVillage images are already tightly cropped on
# the leaf, so aggressive random crops can remove the diseased region entirely.
TRAIN_TRANSFORM = transforms.Compose(
    [
        transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
        transforms.RandomCrop(IMG_SIZE),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ]
)

VAL_TRANSFORM = transforms.Compose(
    [
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ]
)


def pick_device(force_cpu: bool = False) -> torch.device:
    if force_cpu:
        return torch.device("cpu")
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def build_datasets(cfg: PlantConfig):
    """Return (train_ds, val_ds, class_names) honouring the dataset's split layout."""
    if cfg.single_dir is not None:
        full = ImageFolder(cfg.single_dir, transform=TRAIN_TRANSFORM)
        full_eval = ImageFolder(cfg.single_dir, transform=VAL_TRANSFORM)
        class_names = full.classes

        # Deterministic 80/20 split so retraining hits the same val set.
        n = len(full)
        gen = torch.Generator().manual_seed(1337)
        perm = torch.randperm(n, generator=gen).tolist()
        cut = int(n * 0.8)
        train_idx, val_idx = perm[:cut], perm[cut:]
        return Subset(full, train_idx), Subset(full_eval, val_idx), class_names

    assert cfg.train_dir is not None and cfg.val_dir is not None
    train_ds = ImageFolder(cfg.train_dir, transform=TRAIN_TRANSFORM)
    val_ds = ImageFolder(cfg.val_dir, transform=VAL_TRANSFORM)
    if train_ds.classes != val_ds.classes:
        raise RuntimeError(
            f"Class mismatch between train and val for {cfg.name}:\n"
            f"  train: {train_ds.classes}\n"
            f"  val:   {val_ds.classes}"
        )
    return train_ds, val_ds, train_ds.classes


def translate_labels(cfg: PlantConfig, raw_classes: list[str]) -> list[str]:
    """Convert ImageFolder folder names into the snake_case labels treatments.json uses."""
    missing = [c for c in raw_classes if c not in cfg.folder_to_label]
    if missing:
        raise RuntimeError(
            f"[{cfg.name}] no folder→label mapping for: {missing}. "
            "Update plant_configs.py."
        )
    return [cfg.folder_to_label[c] for c in raw_classes]


def build_model(num_classes: int) -> nn.Module:
    weights = ResNet18_Weights.IMAGENET1K_V1
    model = resnet18(weights=weights)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    return model


def run_epoch(model, loader, criterion, optimizer, device, train: bool):
    model.train(train)
    total, correct, loss_sum = 0, 0, 0.0
    ctx = torch.enable_grad() if train else torch.no_grad()
    with ctx:
        for images, targets in loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            if train:
                optimizer.zero_grad(set_to_none=True)
            logits = model(images)
            loss = criterion(logits, targets)
            if train:
                loss.backward()
                optimizer.step()

            loss_sum += loss.item() * images.size(0)
            correct += (logits.argmax(1) == targets).sum().item()
            total += images.size(0)
    return loss_sum / total, correct / total


def export_onnx(model: nn.Module, out_path: Path, device: torch.device) -> None:
    model.eval()
    # ONNX export tracing must run on CPU on macOS — the MPS backend doesn't
    # support the operators the exporter needs.
    cpu_model = model.to("cpu")
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
    torch.onnx.export(
        cpu_model,
        dummy,
        out_path.as_posix(),
        input_names=["input"],
        output_names=["output"],
        opset_version=17,
        # dynamo=False keeps us on the legacy exporter so we don't need onnxscript.
        dynamo=False,
        dynamic_axes=None,
    )
    model.to(device)


def class_weight_tensor(dataset, num_classes: int, device: torch.device) -> torch.Tensor:
    """Inverse-frequency class weights for CrossEntropyLoss.

    Cleaner than oversampling: rare classes contribute proportionally more loss,
    but we still see every image once per epoch.
    """
    if isinstance(dataset, Subset):
        base_targets = dataset.dataset.targets  # type: ignore[attr-defined]
        targets = [base_targets[i] for i in dataset.indices]
    else:
        targets = list(dataset.targets)  # type: ignore[attr-defined]

    counts = [0] * num_classes
    for t in targets:
        counts[t] += 1
    total = sum(counts)
    weights = [total / (num_classes * c) if c > 0 else 0.0 for c in counts]
    return torch.tensor(weights, dtype=torch.float32, device=device)


def train_plant(
    cfg: PlantConfig,
    *,
    epochs: int,
    batch_size: int,
    lr: float,
    export_only: bool = False,
    force_cpu: bool = False,
) -> None:
    device = pick_device(force_cpu=force_cpu)
    print(f"\n=== Training plant: {cfg.name} | device: {device} ===")

    train_ds, val_ds, raw_classes = build_datasets(cfg)
    labels = translate_labels(cfg, raw_classes)
    print(f"  classes ({len(labels)}): {labels}")
    print(f"  train size: {len(train_ds)} | val size: {len(val_ds)}")

    num_workers = 0 if sys.platform == "darwin" else 2
    train_loader = DataLoader(
        train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers
    )

    model = build_model(len(labels)).to(device)
    # Plain CE — PlantVillage's imbalance (e.g. potato 1000/1000/152) is mild
    # enough that ResNet+shuffle handles it without weighting. Class weights +
    # label smoothing together were destabilising the optimiser.
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    cfg.output_dir.mkdir(parents=True, exist_ok=True)
    best_ckpt = cfg.output_dir / "best.pt"
    onnx_path = cfg.output_dir / "model.onnx"
    labels_path = cfg.output_dir / "labels.json"

    if export_only:
        if not best_ckpt.exists():
            raise FileNotFoundError(
                f"No checkpoint to export at {best_ckpt}. Run training first."
            )
        print(f"  --export-only: loading {best_ckpt} and exporting ONNX...")
        checkpoint = torch.load(best_ckpt, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["state_dict"])
        export_onnx(model, onnx_path, device)
        labels_path.write_text(json.dumps(labels))
        print(f"  wrote: {onnx_path}")
        print(f"  wrote: {labels_path}")
        return

    best_acc = -1.0
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_loss, train_acc = run_epoch(
            model, train_loader, criterion, optimizer, device, train=True
        )
        val_loss, val_acc = run_epoch(
            model, val_loader, criterion, optimizer, device, train=False
        )
        scheduler.step()
        dt = time.time() - t0
        print(
            f"  epoch {epoch:02d}/{epochs} | "
            f"train {train_loss:.3f}/{train_acc:.3f} | "
            f"val {val_loss:.3f}/{val_acc:.3f} | "
            f"{dt:.1f}s"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(
                {"state_dict": model.state_dict(), "labels": labels},
                best_ckpt,
            )

    print(f"  best val acc: {best_acc:.4f}")

    # Reload best weights, then export ONNX + labels.
    checkpoint = torch.load(best_ckpt, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["state_dict"])
    export_onnx(model, onnx_path, device)
    labels_path.write_text(json.dumps(labels))
    print(f"  wrote: {onnx_path}")
    print(f"  wrote: {labels_path}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--plant",
        choices=[*ALL_PLANTS.keys(), "all"],
        required=True,
        help="Which plant to train (or 'all' for sequential training).",
    )
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument(
        "--export-only",
        action="store_true",
        help="Skip training; re-export ONNX + labels.json from the existing best.pt.",
    )
    p.add_argument(
        "--cpu",
        action="store_true",
        help="Force CPU training (use this if MPS/CUDA is producing weird gradients).",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    plants = list(ALL_PLANTS.values()) if args.plant == "all" else [ALL_PLANTS[args.plant]]
    for cfg in plants:
        train_plant(
            cfg,
            epochs=args.epochs,
            batch_size=args.batch_size,
            lr=args.lr,
            export_only=args.export_only,
            force_cpu=args.cpu,
        )


if __name__ == "__main__":
    main()
