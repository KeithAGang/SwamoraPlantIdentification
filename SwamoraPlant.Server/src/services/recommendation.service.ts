/**
 * Maps a (plant, diseaseLabel) pair to a treatment recommendation.
 * Treatments are sourced from src/data/treatments.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlantType } from '../ml/plant-types.js';

export interface TreatmentProduct {
  /** Brand or product name as sold locally (e.g. "Metalaxyl + Mancozeb", "Kumir"). */
  name: string;
  /** Container size, e.g. "1kg", "1L", "300g". */
  size: string;
  /** Indicative retail price in USD. */
  priceUsd: number;
}

export interface Treatment {
  summary: string;
  medicine: string | null;
  /** Locally-available products with size + indicative USD price. */
  products: TreatmentProduct[];
  productKeywords: string[];
}

type TreatmentsFile = Record<string, Record<string, Treatment>>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TREATMENTS_PATH = path.resolve(__dirname, '../data/treatments.json');

const treatments: TreatmentsFile = JSON.parse(
  fs.readFileSync(TREATMENTS_PATH, 'utf8'),
);

const FALLBACK: Treatment = {
  summary:
    'No specific recommendation on file for this diagnosis. Consult a local agronomist.',
  medicine: null,
  products: [],
  productKeywords: [],
};

export const getTreatment = (plant: PlantType, label: string): Treatment =>
  treatments[plant]?.[label] ?? FALLBACK;
