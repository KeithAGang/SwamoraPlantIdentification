import { useEffect, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/lib/maps-config'
import type { Shop } from '@/lib/shops'

export interface DirectionStep {
  instruction: string
  distance: string | null
  duration: string | null
}

export interface RouteInfo {
  distance: string | null
  duration: string | null
  steps: DirectionStep[]
}

export interface ShopFinderMapProps {
  origin: { lat: number; lng: number }
  shops: Shop[]
  activeShopIndex: number | null
  onShopClick: (index: number) => void
  /** When set, draws an in-app driving route from origin to this point. */
  routeDestination?: { lat: number; lng: number } | null
  /** Called when the route resolves (or clears). */
  onRouteInfo?: (info: RouteInfo | null) => void
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
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['routes']}>
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
        <FitBounds
          origin={props.origin}
          shops={props.shops}
          routeDestination={props.routeDestination ?? null}
        />
        {props.routeDestination && (
          <DirectionsLayer
            origin={props.origin}
            destination={props.routeDestination}
            onRouteInfo={props.onRouteInfo}
          />
        )}
      </Map>
    </APIProvider>
  )
}

interface DirectionsLayerProps {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  onRouteInfo?: (info: RouteInfo | null) => void
}

function DirectionsLayer({
  origin,
  destination,
  onRouteInfo,
}: DirectionsLayerProps) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [renderer, setRenderer] = useState<any>(null)

  // Create the renderer once per map+library load.
  useEffect(() => {
    if (!map || !routesLib) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Renderer: any = (routesLib as any).DirectionsRenderer
    const r = new Renderer({
      map,
      suppressMarkers: true, // we draw our own AdvancedMarkers
      preserveViewport: true, // don't fight FitBounds
      polylineOptions: {
        strokeColor: '#3aa657',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    })
    setRenderer(r)
    return () => {
      r.setMap(null)
      onRouteInfo?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routesLib])

  // Request a route whenever origin/destination changes.
  useEffect(() => {
    if (!routesLib || !renderer) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Service: any = (routesLib as any).DirectionsService
    const svc = new Service()
    svc.route(
      {
        origin,
        destination,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        travelMode: (routesLib as any).TravelMode.DRIVING,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any, status: string) => {
        if (status === 'OK' && result) {
          renderer.setDirections(result)
          const leg = result.routes?.[0]?.legs?.[0]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const steps: DirectionStep[] = (leg?.steps ?? []).map((s: any) => ({
            // Google returns HTML in instructions ("Turn <b>left</b>"); strip tags.
            instruction: String(s.instructions ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            distance: s.distance?.text ?? null,
            duration: s.duration?.text ?? null,
          }))
          onRouteInfo?.({
            distance: leg?.distance?.text ?? null,
            duration: leg?.duration?.text ?? null,
            steps,
          })
        } else {
          onRouteInfo?.(null)
        }
      },
    )
  }, [origin, destination, routesLib, renderer, onRouteInfo])

  return null
}

interface FitBoundsProps {
  origin: { lat: number; lng: number }
  shops: Shop[]
  routeDestination: { lat: number; lng: number } | null
}

function FitBounds({ origin, shops, routeDestination }: FitBoundsProps) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google?.maps
    if (!g) return
    const bounds = new g.LatLngBounds()
    bounds.extend(origin)
    // When a route is active, zoom tight to origin+destination so the polyline
    // fills the view. Otherwise fit all shops.
    if (routeDestination) {
      bounds.extend(routeDestination)
    } else if (shops.length > 0) {
      shops.forEach((s) => bounds.extend(s.location))
    } else {
      return
    }
    map.fitBounds(bounds, 64)
  }, [
    map,
    origin.lat,
    origin.lng,
    shops,
    routeDestination?.lat,
    routeDestination?.lng,
  ])
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
