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

export interface MapPoint {
  lat: number
  lng: number
}

interface DirectionsMapProps {
  origin: MapPoint
  destination: MapPoint
  originLabel?: string
  destinationLabel?: string
}

/**
 * Renders a Google Map with a polyline + markers showing driving directions
 * between two points. Falls back gracefully when no API key is configured.
 */
export function DirectionsMap({
  origin,
  destination,
  originLabel = 'You',
  destinationLabel = 'Shop',
}: DirectionsMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <DirectionsFallback origin={origin} destination={destination} />
  }

  // Centre the map roughly between the two points; the polyline+markers will
  // fit-bounds after directions resolve.
  const midpoint: MapPoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['routes']}>
      <Map
        defaultCenter={midpoint}
        defaultZoom={13}
        mapId={GOOGLE_MAPS_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="w-full h-full"
      >
        <AdvancedMarker position={origin} title={originLabel}>
          <Pin background="#1a1d1a" borderColor="#1a1d1a" glyphColor="#9ce67a" />
        </AdvancedMarker>
        <AdvancedMarker position={destination} title={destinationLabel}>
          <Pin background="#3aa657" borderColor="#267a3e" glyphColor="#ffffff" />
        </AdvancedMarker>
        <DirectionsLayer origin={origin} destination={destination} />
      </Map>
    </APIProvider>
  )
}

interface RouteSummary {
  distance: string | null
  duration: string | null
}

interface DirectionsLayerProps {
  origin: MapPoint
  destination: MapPoint
  onSummary?: (s: RouteSummary) => void
}

function DirectionsLayer({ origin, destination, onSummary }: DirectionsLayerProps) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [renderer, setRenderer] = useState<any>(null)

  useEffect(() => {
    if (!map || !routesLib) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Renderer: any = (routesLib as any).DirectionsRenderer
    const r = new Renderer({
      map,
      suppressMarkers: true, // we draw our own AdvancedMarkers
      polylineOptions: {
        strokeColor: '#3aa657',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    })
    setRenderer(r)
    return () => r.setMap(null)
  }, [map, routesLib])

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
          onSummary?.({
            distance: leg?.distance?.text ?? null,
            duration: leg?.duration?.text ?? null,
          })
        }
      },
    )
  }, [origin, destination, routesLib, renderer, onSummary])

  return null
}

function DirectionsFallback({ origin, destination }: { origin: MapPoint; destination: MapPoint }) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`
  return (
    <div className="w-full h-full bg-[linear-gradient(135deg,#f5f1e8_0%,#eee7d8_100%)] flex flex-col items-center justify-center p-4 text-center">
      <p className="text-sm font-medium">Map preview unavailable</p>
      <p className="text-xs text-muted-foreground mt-1">
        Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to see the route here.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#1a1d1a] text-white text-xs font-medium"
      >
        Open directions in Google Maps
      </a>
    </div>
  )
}
