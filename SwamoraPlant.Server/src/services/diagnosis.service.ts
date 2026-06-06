/**
 * Orchestrates the full diagnosis flow: classify image, look up treatment +
 * disease info, find nearby shops, and persist everything so we can build a
 * proprietary dataset and a history view.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { diagnoses } from '../db/schema.js';
import { classifyImage, type Prediction } from '../ml/inference.service.js';
import type { PlantType } from '../ml/plant-types.js';
import { getTreatment, type Treatment } from './recommendation.service.js';
import { findNearbyShops, type Shop, type ShopLocation } from './shops.service.js';
import { getDiseaseInfo, type DiseaseInfo } from './disease-info.service.js';
import { storeImage } from './storage.service.js';

export interface DiagnosisRequest {
  userId: number;
  plant: PlantType;
  image: Buffer;
  originalName?: string | null;
  contentType?: string;
  location?: ShopLocation;
}

export interface DiagnosisResult {
  id: number;
  plant: PlantType;
  topPrediction: Prediction;
  predictions: Prediction[];
  treatment: Treatment;
  diseaseInfo: DiseaseInfo;
  shops: Shop[];
  imageId: number;
  createdAt: string;
}

export const diagnose = async ({
  userId,
  plant,
  image,
  originalName,
  contentType,
  location,
}: DiagnosisRequest): Promise<DiagnosisResult> => {
  // Persist the image first so even classification failures contribute to the data moat.
  const stored = await storeImage({
    userId,
    buffer: image,
    originalName: originalName ?? null,
    contentType: contentType ?? 'image/jpeg',
  });

  const predictions = await classifyImage(plant, image, 3);
  const top = predictions[0];
  const treatment = getTreatment(plant, top.label);
  const diseaseInfo = getDiseaseInfo(plant, top.label);

  const shops =
    location && treatment.productKeywords.length > 0
      ? await findNearbyShops({
          location,
          productKeywords: treatment.productKeywords,
        })
      : [];

  const inserted = await db
    .insert(diagnoses)
    .values({
      userId,
      imageId: stored.id,
      plant,
      topLabel: top.label,
      topConfidence: top.confidence,
      predictions,
      treatment,
      diseaseInfo,
      shops,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
    })
    .returning();
  const row = inserted[0];

  return {
    id: row.id,
    plant,
    topPrediction: top,
    predictions,
    treatment,
    diseaseInfo,
    shops,
    imageId: stored.id,
    createdAt: row.createdAt.toISOString(),
  };
};

export const getDiagnosisById = async (
  userId: number,
  id: number,
): Promise<DiagnosisResult | null> => {
  const rows = await db
    .select()
    .from(diagnoses)
    .where(and(eq(diagnoses.id, id), eq(diagnoses.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  // Older rows predate the `products` field; backfill an empty list so the
  // response shape stays stable for the API consumer.
  const storedTreatment = row.treatment as Treatment & {
    products?: Treatment['products'];
  };
  const treatment: Treatment = {
    ...storedTreatment,
    products: storedTreatment.products ?? [],
  };
  return {
    id: row.id,
    plant: row.plant as PlantType,
    topPrediction: { label: row.topLabel, confidence: row.topConfidence },
    predictions: row.predictions as Prediction[],
    treatment,
    diseaseInfo: row.diseaseInfo as DiseaseInfo,
    shops: (row.shops as Shop[] | null) ?? [],
    imageId: row.imageId,
    createdAt: row.createdAt.toISOString(),
  };
};
