# Training

Fine-tunes EfficientNet-B0 (ImageNet pretrained) on each plant's disease dataset,
then exports an ONNX model directly into `SwamoraPlant.Server/models/<plant>/`
where the Node API will pick it up.

## Setup

```bash
cd training
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

On Apple Silicon Macs, training will automatically use MPS. On a CUDA box it
will use the GPU. CPU still works, just slower.

## Train

```bash
# One plant
python train.py --plant potato
python train.py --plant tomato
python train.py --plant maize

# All three in sequence
python train.py --plant all
```

Useful flags: `--epochs 15`, `--batch-size 32`, `--lr 3e-4`.

Each run writes three files into `SwamoraPlant.Server/models/<plant>/`:

| File          | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `best.pt`     | Checkpoint with best validation accuracy.           |
| `model.onnx`  | Served by the Node API at inference time.          |
| `labels.json` | Class order generated from the trained model.      |

`labels.json` is regenerated every run from the dataset's actual class order,
so it stays in sync with the model. Do not hand-edit it.

## Datasets expected on disk

- `data/Potato Dataset/Potato___{Early_blight,Late_blight,healthy}/` — auto split 80/20.
- `data/tomato/{train,val}/Tomato___*/` — pre-split (PlantVillage subset).
- `data/Maize Dataset/{train,val}/{Blight,Common_Rust,Gray_Leaf_Spot,Healthy}/`.
