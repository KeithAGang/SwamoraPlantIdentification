# Models

This directory holds per-plant ONNX models used for disease classification.

## Layout

Each plant gets its own subdirectory containing exactly three files:

```
models/
├── potato/
│   ├── model.onnx       # The ONNX model (NOT committed to git)
│   ├── labels.json      # Class index → human label (ordered as model output)
│   └── config.json      # Preprocessing parameters
├── tomato/
└── maize/
```

## File contracts

### `model.onnx`
- Single input tensor, NCHW float32, shape `[1, 3, H, W]`.
- Single output tensor of shape `[1, numClasses]` containing logits or probabilities.
- See `config.json` for `inputSize`, `mean`, `std`.

### `labels.json`
Ordered array of class names; the index matches the output tensor index.

```json
["healthy", "early_blight", "late_blight"]
```

### `config.json`
```json
{
  "inputSize": 224,
  "mean": [0.485, 0.456, 0.406],
  "std": [0.229, 0.224, 0.225],
  "inputName": "input",
  "outputName": "output",
  "applySoftmax": true
}
```

- `inputSize`: square dimension the image is resized to.
- `mean` / `std`: per-channel normalization (after dividing pixel by 255). ImageNet defaults shown.
- `inputName` / `outputName`: tensor names the model exposes (check with Netron).
- `applySoftmax`: set `false` if your model already outputs probabilities.

## Adding a new plant

1. Create `models/<plant>/` with the three files above.
2. Add an entry to `PLANT_CONFIGS` in `src/ml/plant-types.ts`.
3. Add treatments for any new disease labels in `src/data/treatments.json`.
