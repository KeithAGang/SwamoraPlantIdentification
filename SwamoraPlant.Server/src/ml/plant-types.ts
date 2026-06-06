/**
 * Registry of supported plant types and where their model assets live on disk.
 * To add a new plant: drop assets in `models/<plant>/` and add an entry below.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLANT_TYPES = ['potato', 'tomato', 'maize'] as const;
export type PlantType = (typeof PLANT_TYPES)[number];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_ROOT = path.resolve(__dirname, '../../models');

export const isPlantType = (value: unknown): value is PlantType =>
  typeof value === 'string' && (PLANT_TYPES as readonly string[]).includes(value);

export interface PlantAssetPaths {
  modelPath: string;
  labelsPath: string;
  configPath: string;
}

export const getPlantAssetPaths = (plant: PlantType): PlantAssetPaths => {
  const dir = path.join(MODELS_ROOT, plant);
  return {
    modelPath: path.join(dir, 'model.onnx'),
    labelsPath: path.join(dir, 'labels.json'),
    configPath: path.join(dir, 'config.json'),
  };
};
