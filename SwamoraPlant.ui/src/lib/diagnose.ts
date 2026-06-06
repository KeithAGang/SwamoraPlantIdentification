import { api } from './api'

export const PLANT_TYPES = ['potato', 'tomato', 'maize'] as const
export type PlantType = (typeof PLANT_TYPES)[number]

export interface Prediction {
  label: string
  confidence: number
}

export interface TreatmentProduct {
  name: string
  size: string
  priceUsd: number
}

export interface Treatment {
  summary: string
  medicine: string | null
  products: TreatmentProduct[]
  productKeywords: string[]
}

export interface DiseaseInfo {
  name: string
  scientificName: string | null
  severity: 'none' | 'mild' | 'moderate' | 'severe'
  description: string
  symptoms: string[]
}

export interface Shop {
  name: string
  address: string
  location: { lat: number; lng: number }
  distanceMeters?: number
  rating?: number
  mapsUrl: string
}

export interface DiagnosisResult {
  id: number
  plant: PlantType
  topPrediction: Prediction
  predictions: Prediction[]
  treatment: Treatment
  diseaseInfo: DiseaseInfo
  shops: Shop[]
  imageId: number
  createdAt: string
}

export interface DiagnoseParams {
  image: Blob
  plantType: PlantType
  location?: { lat: number; lng: number }
}

export const diagnoseApi = {
  async diagnose({ image, plantType, location }: DiagnoseParams): Promise<DiagnosisResult> {
    const form = new FormData()
    form.append('image', image, `plant_${Date.now()}.jpg`)
    form.append('plantType', plantType)
    if (location) {
      form.append('lat', String(location.lat))
      form.append('lng', String(location.lng))
    }
    const res = await api.post<DiagnosisResult>('/api/diagnose', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async getById(id: number): Promise<DiagnosisResult> {
    const res = await api.get<DiagnosisResult>(`/api/diagnose/${id}`)
    return res.data
  },
}

export const getBrowserLocation = (): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 },
    )
  })

export const formatLabel = (raw: string): string =>
  raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
