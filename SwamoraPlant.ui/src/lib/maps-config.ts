/**
 * Centralized Google Maps configuration & demo data for the monitoring view.
 */

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined

export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as
  | string
  | undefined

export interface GardenMarker {
  id: string
  label: string
  position: { lat: number; lng: number }
}

export interface GardenInfo {
  name: string
  id: string
  area: string
  center: { lat: number; lng: number }
  city: string
  markers: GardenMarker[]
}

// Default coordinates around Weilburg, Germany (matching the design mockup vibe).
export const DEMO_GARDEN: GardenInfo = {
  name: 'Spinach Garden 08',
  id: 'PL-02J',
  area: '200 m²',
  city: 'Weilburg, Germany',
  center: { lat: 50.487, lng: 8.265 },
  markers: [
    { id: 'PL-02J', label: 'PL-02J', position: { lat: 50.487, lng: 8.265 } },
    { id: 'PL-70T', label: 'PL-70T', position: { lat: 50.4878, lng: 8.2658 } },
  ],
}
