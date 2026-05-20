import { useEffect } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps'
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/lib/maps-config'
import type { Shop } from '@/lib/shops'

export interface ShopFinderMapProps {
  origin: { lat: number; lng: number }
  shops: Shop[]
  activeShopIndex: number | null
  onShopClick: (index: number) => void
}

/**
 * Map showing a "you are here" pin plus a marker per shop. Clicking a marker
 * tells the parent which shop is active so the result list can highlight it.
 * Auto-fits the viewport to all visible markers.
 */
export function ShopFinderMap(props: ShopFinderMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <Fallback {...props} />
  }
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={props.origin}
        defaultZoom={12}
        mapId={GOOGLE_MAPS_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="w-full h-full"
      >
        <AdvancedMarker position={props.origin} title="You are here">
          <Pin background="#1a1d1a" borderColor="#1a1d1a" glyphColor="#9ce67a" />
        </AdvancedMarker>
        {props.shops.map((s, i) => {
          const active = i === props.activeShopIndex
          return (
            <AdvancedMarker
              key={s.name + s.address}
              position={s.location}
              title={s.name}
              onClick={() => props.onShopClick(i)}
            >
              <Pin
                background={active ? '#3aa657' : '#7fcf63'}
                borderColor={active ? '#1a4a25' : '#3a7b30'}
                glyphColor="#ffffff"
                scale={active ? 1.25 : 1}
              />
            </AdvancedMarker>
          )
        })}
        <FitBounds origin={props.origin} shops={props.shops} />
      </Map>
    </APIProvider>
  )
}

interface FitBoundsProps {
  origin: { lat: number; lng: number }
  shops: Shop[]
}

function FitBounds({ origin, shops }: FitBoundsProps) {
  const map = useMap()
  useEffect(() => {
    if (!map || shops.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google?.maps
    if (!g) return
    const bounds = new g.LatLngBounds()
    bounds.extend(origin)
    shops.forEach((s) => bounds.extend(s.location))
    map.fitBounds(bounds, 64)
  }, [map, origin.lat, origin.lng, shops])
  return null
}

function Fallback({ origin, shops }: ShopFinderMapProps) {
  return (
    <div className="w-full h-full bg-[linear-gradient(135deg,#f5f1e8_0%,#eee7d8_100%)] flex flex-col items-center justify-center p-4 text-center">
      <p className="text-sm font-medium">Map preview unavailable</p>
      <p className="text-xs text-muted-foreground mt-1">
        Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to see shops on the map.
      </p>
      <div className="text-[11px] text-muted-foreground mt-2">
        Origin {origin.lat.toFixed(3)}, {origin.lng.toFixed(3)} · {shops.length} shop
        {shops.length === 1 ? '' : 's'}
      </div>
    </div>
  )
}
