import { api } from './api'

export interface AdminUser {
  id: number
  name: string
  email: string
  isAdmin: boolean
  createdAt: string
  farmCount: number
  diagnosisCount: number
}

export interface AdminFarm {
  id: number
  name: string
  cropType: string | null
  location: string | null
  createdAt: string
  ownerId: number
  ownerName: string
  ownerEmail: string
  widgetCount: number
}

export interface AdminDiagnosis {
  id: number
  plant: string
  topLabel: string
  topConfidence: number
  createdAt: string
  userId: number
  userName: string
  userEmail: string
}

export interface AdminStats {
  totals: {
    users: number
    admins: number
    farms: number
    widgets: number
    diagnoses: number
    chatMessages: number
    images: number
    favorites: number
    shopSubmissions: number
    pendingSubmissions: number
  }
  recent: {
    diagnoses24h: number
    diagnoses7d: number
    newUsers7d: number
  }
  plantBreakdown: { plant: string; value: number }[]
  trend: { day: string; value: number }[]
}

export const adminApi = {
  stats: async (): Promise<AdminStats> => {
    const res = await api.get('/api/admin/stats')
    return res.data
  },
  users: async (): Promise<AdminUser[]> => {
    const res = await api.get('/api/admin/users')
    return res.data.users ?? []
  },
  farms: async (): Promise<AdminFarm[]> => {
    const res = await api.get('/api/admin/farms')
    return res.data.farms ?? []
  },
  diagnoses: async (limit = 25): Promise<AdminDiagnosis[]> => {
    const res = await api.get('/api/admin/diagnoses', { params: { limit } })
    return res.data.diagnoses ?? []
  },
  setAdmin: async (userId: number, isAdmin: boolean) => {
    const res = await api.patch(`/api/admin/users/${userId}/admin`, { isAdmin })
    return res.data
  },
  deleteUser: async (userId: number) => {
    const res = await api.delete(`/api/admin/users/${userId}`)
    return res.data
  },
}
