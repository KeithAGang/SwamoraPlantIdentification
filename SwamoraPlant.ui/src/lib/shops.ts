import { api } from './api'
import type { Shop } from './diagnose'

export type { Shop } from './diagnose'

export interface ShopSearchParams {
  lat?: number
  lng?: number
  radius?: number
  limit?: number
  query?: string
  productKeywords?: string[]
}

export interface ShopSearchResult {
  origin: { lat: number; lng: number }
  shops: Shop[]
}

export interface FavoriteShop {
  shopKey: string
  name: string
  address: string
  location: { lat: number; lng: number }
  rating?: number
  mapsUrl?: string
  createdAt: string
}

export interface ShopSubmissionPayload {
  name: string
  address: string
  city?: string
  phone?: string
  notes?: string
  lat?: number
  lng?: number
}

/** Build a stable id for a shop result. Prefers Google place_id from mapsUrl. */
export const shopKeyOf = (shop: Shop): string => {
  const m = /place_id:([^&\s]+)/.exec(shop.mapsUrl ?? '')
  if (m?.[1]) return `place:${m[1]}`
  return `comp:${shop.name}|${shop.address}`
}

export const shopsApi = {
  async search(params: ShopSearchParams = {}): Promise<ShopSearchResult> {
    const search: Record<string, string> = {}
    if (params.lat !== undefined) search.lat = String(params.lat)
    if (params.lng !== undefined) search.lng = String(params.lng)
    if (params.radius !== undefined) search.radius = String(params.radius)
    if (params.limit !== undefined) search.limit = String(params.limit)
    if (params.query) search.query = params.query
    if (params.productKeywords && params.productKeywords.length > 0) {
      search.productKeywords = params.productKeywords.join(',')
    }
    const res = await api.get<ShopSearchResult>('/api/shops', { params: search })
    return res.data
  },
}

export const favoritesApi = {
  async list(): Promise<FavoriteShop[]> {
    try {
      const res = await api.get<{ favorites: FavoriteShop[] }>('/api/favorites')
      return res.data.favorites
    } catch {
      return []
    }
  },
  async add(shop: Shop): Promise<void> {
    await api.post('/api/favorites', {
      shopKey: shopKeyOf(shop),
      name: shop.name,
      address: shop.address,
      lat: shop.location.lat,
      lng: shop.location.lng,
      rating: shop.rating,
      mapsUrl: shop.mapsUrl,
    })
  },
  async remove(shopKey: string): Promise<void> {
    await api.delete(`/api/favorites/${encodeURIComponent(shopKey)}`)
  },
}

export const shopSubmissionsApi = {
  async submit(payload: ShopSubmissionPayload): Promise<void> {
    await api.post('/api/shop-submissions', payload)
  },
}
