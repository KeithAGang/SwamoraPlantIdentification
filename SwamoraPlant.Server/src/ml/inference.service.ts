import * as ort from 'onnxruntime-node';
import { getModel } from './registry.js';
import { imageBufferToTensor } from './preprocess.js';
import type { PlantType } from './plant-types.js';

export interface Prediction {
  label: string;
  confidence: number;
}

const softmax = (logits: Float32Array): Float32Array => {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - max);
    exps[i] = e;
    sum += e;
  }
  for (let i = 0; i < exps.length; i++) exps[i] /= sum;
  return exps;
};

/**
 * Run a plant-specific classifier on an image buffer and return the top-K predictions.
 */
export const classifyImage = async (
  plant: PlantType,
  image: Buffer,
  topK = 3,
): Promise<Prediction[]> => {
  const { session, labels, config } = await getModel(plant);

  const tensorData = await imageBufferToTensor(image, {
    inputSize: config.inputSize,
    mean: config.mean,
    std: config.std,
  });

  const inputTensor = new ort.Tensor('float32', tensorData, [
    1,
    3,
    config.inputSize,
    config.inputSize,
  ]);

  const feeds: Record<string, ort.Tensor> = { [config.inputName]: inputTensor };
  const results = await session.run(feeds);
  const output = results[config.outputName];
  if (!output) {
    throw new Error(
      `Model output "${config.outputName}" not found. Available: ${Object.keys(results).join(', ')}`,
    );
  }

  const raw = output.data as Float32Array;
  const probs = config.applySoftmax ? softmax(raw) : raw;

  return Array.from(probs)
    .map((confidence, idx) => ({
      label: labels[idx] ?? `class_${idx}`,
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topK);
};
