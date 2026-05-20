import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_MAP_ID,
  type GardenInfo,
} from '@/lib/maps-config'

interface GardenMapProps {
  garden: GardenInfo
}

export function GardenMap({ garden }: GardenMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <MapFallback garden={garden} />
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={garden.center}
        defaultZoom={17}
        mapId={GOOGLE_MAPS_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
        styles={LIGHT_STYLE}
      >
        {garden.markers.map((m) => (
          <AdvancedMarker key={m.id} position={m.position} title={m.label}>
            <Pin background="#1f3d2a" borderColor="#1f3d2a" glyphColor="#e8f1e7" />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}

function MapFallback({ garden }: { garden: GardenInfo }) {
  return (
    <div className="w-full h-full bg-[linear-gradient(135deg,#f5f1e8_0%,#eee7d8_100%)] relative overflow-hidden">
      {/* faux roads */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M 0 80 L 400 100" stroke="#d6cdb8" strokeWidth="3" fill="none" />
        <path d="M 0 200 L 400 220" stroke="#d6cdb8" strokeWidth="3" fill="none" />
        <path d="M 120 0 L 140 300" stroke="#d6cdb8" strokeWidth="3" fill="none" />
        <path d="M 280 0 L 260 300" stroke="#d6cdb8" strokeWidth="3" fill="none" />
      </svg>

      {garden.markers.map((m, i) => (
        <div
          key={m.id}
          className="absolute flex items-center gap-1.5"
          style={{
            top: `${30 + i * 12}%`,
            left: `${40 + i * 6}%`,
          }}
        >
          <div className="h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center text-[10px] font-medium shadow-md">
            {m.label}
          </div>
        </div>
      ))}

      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded-md">
        Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> for live map
      </div>
    </div>
  )
}

// Soft light map style matching the paper aesthetic.
// Typed as `unknown[]` because @types/google.maps isn't installed; the
// value is consumed by @vis.gl/react-google-maps which validates at runtime.
const LIGHT_STYLE: unknown[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f1e8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a7867' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e8e1ce' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ddd4bd' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cfc3a3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c4d4d3' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8e4d2' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
]
