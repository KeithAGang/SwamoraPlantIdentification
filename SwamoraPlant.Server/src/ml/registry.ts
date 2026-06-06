/**
 * Lazy-loading registry that caches one ONNX session per plant type.
 * Loading is deferred until the first request for a given plant so the
 * server can boot even when only some models are present on disk.
 */

import fs from 'node:fs/promises';
import * as ort from 'onnxruntime-node';
import { getPlantAssetPaths, type PlantType } from './plant-types.js';

export interface ModelConfig {
  inputSize: number;
  mean: [number, number, number];
  std: [number, number, number];
  inputName: string;
  outputName: string;
  applySoftmax: boolean;
}

export interface LoadedModel {
  session: ort.InferenceSession;
  labels: string[];
  config: ModelConfig;
}

const cache = new Map<PlantType, Promise<LoadedModel>>();

const loadModel = async (plant: PlantType): Promise<LoadedModel> => {
  const { modelPath, labelsPath, configPath } = getPlantAssetPaths(plant);

  const [labelsRaw, configRaw] = await Promise.all([
    fs.readFile(labelsPath, 'utf8'),
    fs.readFile(configPath, 'utf8'),
  ]);

  // Verify the model file exists before asking ORT to open it (clearer errors).
  await fs.access(modelPath).catch(() => {
    throw new Error(
      `Model file missing for plant "${plant}". Expected at: ${modelPath}`,
    );
  });

  const labels = JSON.parse(labelsRaw) as string[];
  const config = JSON.parse(configRaw) as ModelConfig;
  const session = await ort.InferenceSession.create(modelPath);

  return { session, labels, config };
};

export const getModel = (plant: PlantType): Promise<LoadedModel> => {
  let entry = cache.get(plant);
  if (!entry) {
    entry = loadModel(plant).catch((err) => {
      // Drop failed entries so the next attempt can retry (e.g. after deploying the file).
      cache.delete(plant);
      throw err;
    });
    cache.set(plant, entry);
  }
  return entry;
};
