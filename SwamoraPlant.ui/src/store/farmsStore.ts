import { create } from 'zustand'
import type { Farm, Widget } from '@/lib/farms'
import { farmsApi } from '@/lib/farms'

interface FarmsState {
  farms: Farm[]
  loaded: boolean
  loading: boolean
  error: string | null
  widgets: Record<number, Widget[]>
  loadFarms: () => Promise<void>
  refreshFarm: (farmId: number) => Promise<void>
  loadWidgets: (farmId: number) => Promise<Widget[]>
  setWidgets: (farmId: number, widgets: Widget[]) => void
  addFarmLocal: (farm: Farm) => void
  removeFarmLocal: (id: number) => void
  updateFarmLocal: (farm: Farm) => void
}

export const useFarmsStore = create<FarmsState>((set, get) => ({
  farms: [],
  loaded: false,
  loading: false,
  error: null,
  widgets: {},
  loadFarms: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const farms = await farmsApi.list()
      set({ farms, loaded: true, loading: false, error: null })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; message?: string }
      const message =
        axiosErr.response?.status === 401
          ? 'Your session expired. Please sign in again.'
          : 'Could not reach the server. Please make sure the API is running.'
      // Mark as loaded so the UI exits the skeleton state and shows the error.
      set({ loaded: true, loading: false, error: message })
    }
  },
  refreshFarm: async (farmId) => {
    const farm = await farmsApi.get(farmId)
    if (!farm) return
    set((s) => ({
      farms: s.farms.some((f) => f.id === farm.id)
        ? s.farms.map((f) => (f.id === farm.id ? farm : f))
        : [...s.farms, farm],
    }))
  },
  loadWidgets: async (farmId) => {
    const widgets = await farmsApi.listWidgets(farmId)
    set((s) => ({ widgets: { ...s.widgets, [farmId]: widgets } }))
    return widgets
  },
  setWidgets: (farmId, widgets) =>
    set((s) => ({ widgets: { ...s.widgets, [farmId]: widgets } })),
  addFarmLocal: (farm) => set((s) => ({ farms: [...s.farms, farm] })),
  removeFarmLocal: (id) =>
    set((s) => ({
      farms: s.farms.filter((f) => f.id !== id),
      widgets: Object.fromEntries(
        Object.entries(s.widgets).filter(([k]) => Number(k) !== id),
      ),
    })),
  updateFarmLocal: (farm) =>
    set((s) => ({
      farms: s.farms.map((f) => (f.id === farm.id ? farm : f)),
    })),
}))
