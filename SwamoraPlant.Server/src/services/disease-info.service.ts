/**
 * Maps a (plant, label) pair to human-readable disease information used by
 * the UI's "Disease Info" card. Sourced from src/data/disease-info.json.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PlantType } from "../ml/plant-types.js";

export interface DiseaseInfo {
  name: string;
  scientificName: string | null;
  severity: "none" | "mild" | "moderate" | "severe";
  description: string;
  symptoms: string[];
}

type DiseaseInfoFile = Record<string, Record<string, DiseaseInfo>>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.resolve(__dirname, "../data/disease-info.json");

const data: DiseaseInfoFile = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));

const FALLBACK: DiseaseInfo = {
  name: "Unknown",
  scientificName: null,
  severity: "mild",
  description:
    "No detailed information is available for this diagnosis. Consult a local agronomist for guidance.",
  symptoms: [],
};

export const getDiseaseInfo = (
  plant: PlantType,
  label: string,
): DiseaseInfo => data[plant]?.[label] ?? FALLBACK;
