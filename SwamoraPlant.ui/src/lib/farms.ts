import { api } from './api'

export interface Farm {
  id: number
  name: string
  cropType: string | null
  location: string | null
  lat: number | null
  lng: number | null
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

export interface Widget {
  id: number
  farmId: number
  type: string
  title: string | null
  size: 'sm' | 'md' | 'lg' | 'xl'
  position: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>
  dataSource: 'mock' | 'sensor' | 'manual' | string
  createdAt: string
}

export interface FarmInput {
  name: string
  cropType?: string | null
  location?: string | null
  lat?: number | null
  lng?: number | null
  coverImage?: string | null
}

export interface WidgetInput {
  type: string
  title?: string | null
  size?: Widget['size']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>
  dataSource?: Widget['dataSource']
  position?: number
}

export const farmsApi = {
  list: async (): Promise<Farm[]> => {
    const res = await api.get('/api/farms')
    return res.data.farms ?? []
  },
  get: async (id: number): Promise<Farm | null> => {
    const res = await api.get(`/api/farms/${id}`)
    return res.data.farm ?? null
  },
  create: async (input: FarmInput): Promise<Farm> => {
    const res = await api.post('/api/farms', input)
    return res.data.farm
  },
  update: async (id: number, input: Partial<FarmInput>): Promise<Farm> => {
    const res = await api.patch(`/api/farms/${id}`, input)
    return res.data.farm
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/farms/${id}`)
  },

  listWidgets: async (farmId: number): Promise<Widget[]> => {
    const res = await api.get(`/api/farms/${farmId}/widgets`)
    return res.data.widgets ?? []
  },
  addWidget: async (farmId: number, input: WidgetInput): Promise<Widget> => {
    const res = await api.post(`/api/farms/${farmId}/widgets`, input)
    return res.data.widget
  },
  updateWidget: async (
    farmId: number,
    widgetId: number,
    input: Partial<WidgetInput>,
  ): Promise<Widget> => {
    const res = await api.patch(`/api/farms/${farmId}/widgets/${widgetId}`, input)
    return res.data.widget
  },
  removeWidget: async (farmId: number, widgetId: number): Promise<void> => {
    await api.delete(`/api/farms/${farmId}/widgets/${widgetId}`)
  },
  reorderWidgets: async (farmId: number, orderedIds: number[]): Promise<void> => {
    await api.post(`/api/farms/${farmId}/widgets/reorder`, { orderedIds })
  },
}
