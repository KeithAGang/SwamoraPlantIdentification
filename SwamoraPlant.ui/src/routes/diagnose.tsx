import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Calendar,
  Camera,
  CloudDrizzle,
  CloudRain,
  Cloud,
  CloudSun,
  Leaf,
  MapPin,
  Navigation,
  RefreshCcw,
  Sparkles,
  SwitchCamera,
  Upload,
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppShell } from '@/components/AppShell'
import { SaviDialog } from '@/components/SaviDialog'
import {
  diagnoseApi,
  formatLabel,
  getBrowserLocation,
  type DiagnosisResult,
  type PlantType,
} from '@/lib/diagnose'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/diagnose')({
  component: DiagnosePage,
})

type FacingMode = 'environment' | 'user'

const PLANT_LABELS: Record<PlantType, string> = {
  potato: 'Potato',
  tomato: 'Tomato',
  maize: 'Maize',
}

const STORAGE_KEY = 'swamora:lastDiagnosis'

interface PersistedDiagnosis {
  result: DiagnosisResult
  photoDataUrl: string | null
  plantType: PlantType
}

const loadPersisted = (): PersistedDiagnosis | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedDiagnosis
  } catch {
    return null
  }
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

function DiagnosePage() {
  const ready = useAuthGuard()

  // Hydrate once from sessionStorage so switching tabs doesn't lose the last result.
  const persisted = useMemo(() => loadPersisted(), [])

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(persisted?.photoDataUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [plantType, setPlantType] = useState<PlantType>(persisted?.plantType ?? 'potato')
  const [result, setResult] = useState<DiagnosisResult | null>(persisted?.result ?? null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    setCameraReady(false)
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      })
      streamRef.current = mediaStream
      // The <video> element only mounts when `stream` is truthy, so we set the
      // stream here and let an effect attach it to the video element once it
      // exists in the DOM.
      setStream(mediaStream)
      const devices = await navigator.mediaDevices.enumerateDevices()
      setHasMultipleCameras(devices.filter((d) => d.kind === 'videoinput').length > 1)
    } catch {
      setMessage({
        type: 'error',
        text: 'Could not access camera. You can upload a photo instead.',
      })
    }
  }

  // Attach the MediaStream to the <video> element once both exist. This handles
  // the fact that the <video> is conditionally rendered after `stream` is set.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    const onReady = () => {
      setCameraReady(true)
      void video.play().catch(() => undefined)
    }
    if (video.readyState >= 1) {
      onReady()
    } else {
      video.addEventListener('loadedmetadata', onReady)
    }
    return () => video.removeEventListener('loadedmetadata', onReady)
  }, [stream])

  useEffect(() => {
    if (!ready) return
    // Don't auto-start the camera when we restored a previous photo from session storage.
    if (photoUrl) return
    startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, facingMode])

  const flipCamera = () => {
    stopCamera()
    setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    if (!cameraReady || videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setMessage({
        type: 'error',
        text: 'Camera is still loading. Give it a second, then try Capture again.',
      })
      return
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setPhotoBlob(blob)
        setPhotoUrl(URL.createObjectURL(blob))
        stopCamera()
      },
      'image/jpeg',
      0.9,
    )
  }

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoBlob(file)
    setPhotoUrl(URL.createObjectURL(file))
    setResult(null)
    setMessage(null)
    setCameraReady(false)
    sessionStorage.removeItem(STORAGE_KEY)
    stopCamera()
    e.target.value = ''
  }

  const retakePhoto = () => {
    setPhotoBlob(null)
    setPhotoUrl(null)
    setMessage(null)
    setResult(null)
    setCameraReady(false)
    sessionStorage.removeItem(STORAGE_KEY)
    startCamera()
  }

  const uploadPhoto = async () => {
    if (!photoBlob) return
    setUploading(true)
    setMessage(null)
    setResult(null)
    try {
      const location = (await getBrowserLocation()) ?? undefined
      const diagnosis = await diagnoseApi.diagnose({
        image: photoBlob,
        plantType,
        location,
      })
      setResult(diagnosis)

      // Persist so switching tabs and coming back keeps the diagnosis on screen.
      try {
        const photoDataUrl = await blobToDataUrl(photoBlob)
        const payload: PersistedDiagnosis = {
          result: diagnosis,
          photoDataUrl,
          plantType,
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // Storage failures (quota, etc.) are non-fatal — the UI still shows the result.
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setMessage({
        type: 'error',
        text: axiosErr.response?.data?.error || 'Diagnosis failed.',
      })
    } finally {
      setUploading(false)
    }
  }

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }),
    [],
  )

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="grid grid-cols-12 gap-4">
        {/* Left column: hero capture + weather/soil under it */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <HeroCaptureCard
            today={today}
            stream={stream}
            videoRef={videoRef}
            canvasRef={canvasRef}
            photoUrl={photoUrl}
            plantType={plantType}
            onPlantChange={setPlantType}
            onCapture={capturePhoto}
            onRetake={retakePhoto}
            onFlip={flipCamera}
            onPickFile={() => fileInputRef.current?.click()}
            onDiagnose={uploadPhoto}
            hasMultipleCameras={hasMultipleCameras}
            cameraReady={cameraReady}
            uploading={uploading}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WeatherForecastCard />
            <SoilConditionCard />
          </div>
        </div>

        {/* Right column: prediction + AI prompt + disease info + nearest shop */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <PredictionModelCard result={result} plantType={plantType} />
          <AiPromptCard result={result} plantType={plantType} hasPhoto={!!photoUrl} />
          <DiseaseInfoCard result={result} plantType={plantType} />
          <ShopDirectionsCard result={result} />
        </div>

        {/* Error / status toast */}
        {message && (
          <div className="col-span-12">
            <div
              className={cn(
                'w-full px-4 py-3 rounded-2xl border text-sm',
                message.type === 'success'
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-destructive/10 border-destructive/20 text-destructive',
              )}
            >
              {message.text}
            </div>
          </div>
        )}
      </div>

      {/* hidden file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />
    </AppShell>
  )
}

/* ─────────────────────────  HERO  ───────────────────────── */

interface HeroProps {
  className?: string
  today: string
  stream: MediaStream | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  photoUrl: string | null
  plantType: PlantType
  onPlantChange: (p: PlantType) => void
  onCapture: () => void
  onRetake: () => void
  onFlip: () => void
  onPickFile: () => void
  onDiagnose: () => void
  hasMultipleCameras: boolean
  cameraReady: boolean
  uploading: boolean
}

function HeroCaptureCard({
  className = '',
  today,
  stream,
  videoRef,
  canvasRef,
  photoUrl,
  plantType,
  onPlantChange,
  onCapture,
  onRetake,
  onFlip,
  onPickFile,
  onDiagnose,
  hasMultipleCameras,
  cameraReady,
  uploading,
}: HeroProps) {
  const primary = photoUrl
    ? {
        label: uploading ? 'Analyzing…' : 'Diagnose',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        onClick: onDiagnose,
        disabled: uploading,
      }
    : stream
      ? {
          label: cameraReady ? 'Capture' : 'Camera loading…',
          icon: <Camera className="h-3.5 w-3.5" />,
          onClick: onCapture,
          disabled: !cameraReady,
        }
      : {
          label: 'Upload',
          icon: <Upload className="h-3.5 w-3.5" />,
          onClick: onPickFile,
          disabled: false,
        }

  return (
    // `self-start` stops CSS Grid from stretching this card to match the
    // (taller) right-column height once the diagnosis cards expand.
    <section className={cn('glass-card rounded-[22px] p-4 sm:p-5 self-start', className)}>
      {/* Card header: title + date pill + primary action */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Diagnose Plant Health
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Capture a leaf, track symptoms, and get treatment guidance instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="glass-pill hidden sm:inline-flex items-center gap-2 h-9 rounded-full px-3.5 text-xs font-medium"
          >
            <Calendar className="h-3.5 w-3.5" />
            {today}
          </button>
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="inline-flex items-center gap-2 h-9 rounded-full px-4 text-xs font-medium bg-[#1a1d1a] text-white shadow-[0_6px_16px_rgba(20,30,20,0.25)] hover:bg-[#262a26] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {primary.icon}
            {primary.label}
          </button>
        </div>
      </header>

      {/* Hero media */}
      <div className="relative mt-4 rounded-[18px] overflow-hidden bg-gradient-to-b from-[#f5f8f4] to-[#eef3ea] aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] xl:aspect-[16/11]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Captured plant"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              // The camera is usable once the element reports dimensions.
              // This keeps Capture disabled until a frame can actually be grabbed.
              void videoRef.current?.play().catch(() => undefined)
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <DiagnosePlaceholder />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Floating dark plant pills — match the mockup exactly */}
        <div className="absolute inset-0 pointer-events-none">
          <FloatingPill
            label={PLANT_LABELS.potato}
            active={plantType === 'potato'}
            onClick={() => onPlantChange('potato')}
            style={{ top: '22%', left: '8%' }}
          />
          <FloatingPill
            label={PLANT_LABELS.tomato}
            active={plantType === 'tomato'}
            onClick={() => onPlantChange('tomato')}
            style={{ top: '46%', left: '38%' }}
          />
          <FloatingPill
            label={PLANT_LABELS.maize}
            active={plantType === 'maize'}
            onClick={() => onPlantChange('maize')}
            style={{ top: '66%', left: '12%' }}
          />
        </div>

        {/* Switch camera */}
        {stream && hasMultipleCameras && (
          <button
            type="button"
            onClick={onFlip}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/85 backdrop-blur-md border border-white/70 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
            aria-label="Switch camera"
          >
            <SwitchCamera className="h-4 w-4 text-foreground/70" />
          </button>
        )}

        {/* Footer chip row over hero */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="glass-pill rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground/80 inline-flex items-center gap-1.5">
            <Leaf className="h-3 w-3 text-primary" />
            {PLANT_LABELS[plantType]} · selected
          </span>

          <div className="flex items-center gap-2">
            {photoUrl ? (
              <button
                type="button"
                onClick={onRetake}
                className="glass-pill rounded-full px-3 py-1.5 text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-white/95"
              >
                <RefreshCcw className="h-3 w-3" />
                Retake
              </button>
            ) : (
              <button
                type="button"
                onClick={onPickFile}
                className="glass-pill rounded-full px-3 py-1.5 text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-white/95"
              >
                <Upload className="h-3 w-3" />
                Upload photo
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function FloatingPill({
  label,
  active,
  onClick,
  style,
}: {
  label: string
  active: boolean
  onClick: () => void
  style: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'absolute pointer-events-auto inline-flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-1.5 text-[11px] sm:text-xs font-medium transition-all',
        'backdrop-blur-md border shadow-[0_6px_18px_rgba(20,30,20,0.25)]',
        active
          ? 'bg-[#1a1d1a]/90 text-white border-white/10 ring-2 ring-white/60'
          : 'bg-[#1a1d1a]/55 text-white/95 border-white/10 hover:bg-[#1a1d1a]/75',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-[#9ce67a]' : 'bg-white/70',
        )}
      />
      {label}
    </button>
  )
}

/* ──────────────────  EMPTY-STATE PLACEHOLDER  ────────────────── */

function DiagnosePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Soft radial backdrop for depth */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(127,207,99,0.18) 0%, rgba(127,207,99,0) 70%)',
        }}
      />
      {/* Decorative grid */}
      <svg
        aria-hidden
        viewBox="0 0 400 220"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-25"
      >
        <defs>
          <pattern id="diag-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#7fcf63" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="220" fill="url(#diag-grid)" />
      </svg>

      <div className="relative z-10 flex flex-col items-center text-center max-w-[260px] px-3">
        <div className="h-14 w-14 rounded-2xl bg-[#7fcf63] text-[#0f2410] flex items-center justify-center shadow-[0_10px_24px_rgba(98,200,88,0.35)]">
          <Leaf className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base sm:text-lg font-semibold tracking-tight text-foreground">
          Ready to diagnose
        </h3>
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          Pick a plant above, then capture a clear photo of a single leaf or upload one
          from your gallery.
        </p>
      </div>
    </div>
  )
}

/* ──────────────────  PREDICTION MODEL CARD  ────────────────── */

function PredictionModelCard({
  result,
  plantType,
}: {
  result: DiagnosisResult | null
  plantType: PlantType
}) {
  const bars = useMemo(() => {
    const n = 36
    if (result) {
      const topConf = result.topPrediction.confidence
      return Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        const base = 0.35 + 0.55 * Math.sin(Math.PI * t)
        const jitter = (Math.sin(i * 1.7) + 1) * 0.08
        const h = Math.min(1, Math.max(0.18, base + jitter))
        const isFeature = i >= n / 2 - 2 && i <= n / 2 + 2
        return { h, dark: isFeature && topConf > 0.5 }
      })
    }
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1)
      const base = 0.3 + 0.6 * Math.sin(Math.PI * t)
      const jitter = (Math.sin(i * 2.3) + 1) * 0.07
      const h = Math.min(1, Math.max(0.15, base + jitter))
      return { h, dark: i === Math.floor(n / 2) }
    })
  }, [result])

  return (
    <section className="glass-card rounded-2xl p-4">
      <header>
        <h3 className="text-base font-semibold tracking-tight">Area Prediction Model</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          AI predicts optimal planting areas
        </p>
      </header>

      <div className="mt-3 h-20 flex items-end gap-[3px]">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${b.h * 100}%`,
              background: b.dark
                ? 'linear-gradient(180deg, #3aa657 0%, #267a3e 100%)'
                : 'linear-gradient(180deg, #b9e89b 0%, #7fcf63 100%)',
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground leading-snug pr-2">
          <span className="text-foreground font-medium">
            {result ? `${Math.round(result.topPrediction.confidence * 100)}%` : '16%'}
          </span>{' '}
          {result
            ? 'confidence in primary diagnosis'
            : 'production increase base on projection'}
        </p>
        <button
          type="button"
          className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shrink-0"
        >
          <Sparkles className="h-3 w-3" />
          AI Insight
        </button>
      </div>

      <div className="mt-2 text-[11px] text-muted-foreground">
        Model: <span className="text-foreground font-medium">{PLANT_LABELS[plantType]}</span>
      </div>
    </section>
  )
}

/* ──────────────────  AI PROMPT (YELLOW)  ────────────────── */

function AiPromptCard({
  result,
  plantType,
  hasPhoto,
}: {
  result: DiagnosisResult | null
  plantType: PlantType
  hasPhoto: boolean
}) {
  const [chatOpen, setChatOpen] = useState(false)

  const products = result?.treatment.products ?? []
  const cheapest =
    products.length > 0
      ? products.reduce((min, p) => (p.priceUsd < min.priceUsd ? p : min), products[0])
      : null

  const text = result
    ? `Diagnosed ${PLANT_LABELS[plantType]} as ${formatLabel(
        result.topPrediction.label,
      )}. Apply ${
        result.treatment.medicine ?? 'recommended treatment'
      }${
        cheapest
          ? ` (from ~$${cheapest.priceUsd} for ${cheapest.size})`
          : ''
      } and monitor over the next 7 days.`
    : hasPhoto
      ? `Photo captured for ${PLANT_LABELS[plantType]}. Tap Diagnose to run the on-device model and generate a treatment plan.`
      : `Act as an agriculture data analytics system. Select ${PLANT_LABELS[plantType]} crop, capture a clean leaf photo, and the AI will identify disease and recommend treatment.`

  const quickQuestions = result
    ? products.length > 0
      ? [
          'How do I apply this treatment?',
          'What are the prices and alternatives?',
          'Where can I buy these products?',
          'Best weather to spray?',
        ]
      : [
          'How do I apply this treatment?',
          'Will this product harm bees?',
          'Best weather to spray?',
        ]
    : [
        'How should I photograph a leaf?',
        'What plants do you support?',
      ]

  return (
    <section className="glass-card rounded-2xl p-4 relative">
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7fcf63] text-[#0f2410] px-3 py-1.5 text-[11px] font-semibold shadow-[0_4px_12px_rgba(98,200,88,0.35)]">
          <Sparkles className="h-3 w-3" />
          AI Insight
        </span>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Ask Savi
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </header>

      <div
        className="mt-3 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed text-[#3a3416]"
        style={{
          background: 'linear-gradient(180deg, #fff7c2 0%, #ffefa1 100%)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 18px rgba(220, 200, 80, 0.18)',
        }}
      >
        {text}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {quickQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setChatOpen(true)}
            className="glass-pill rounded-full px-2.5 py-1 text-[10px] font-medium hover:bg-white/95"
          >
            {q}
          </button>
        ))}
      </div>

      <SaviDialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        diagnosisId={result?.id}
      />
    </section>
  )
}

/* ──────────────────  DISEASE INFO CARD  ────────────────── */

const SEVERITY_STYLES: Record<
  'none' | 'mild' | 'moderate' | 'severe',
  { label: string; className: string }
> = {
  none: { label: 'Healthy', className: 'bg-emerald-100 text-emerald-800' },
  mild: { label: 'Mild', className: 'bg-yellow-100 text-yellow-800' },
  moderate: { label: 'Moderate', className: 'bg-orange-100 text-orange-800' },
  severe: { label: 'Severe', className: 'bg-rose-100 text-rose-800' },
}

function DiseaseInfoCard({
  result,
  plantType,
}: {
  result: DiagnosisResult | null
  plantType: PlantType
}) {
  if (!result) {
    return (
      <section className="glass-card rounded-2xl p-4 relative overflow-hidden">
        <header className="flex items-start gap-2.5 relative">
          <div className="h-8 w-8 rounded-full bg-[#7fcf63] text-[#0f2410] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(98,200,88,0.35)]">
            <Leaf className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">Disease Insights</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Diagnose a {PLANT_LABELS[plantType]} leaf to see disease info here.
            </p>
          </div>
        </header>
      </section>
    )
  }

  // Be defensive: older diagnoses or partial responses may not carry diseaseInfo.
  const info = result.diseaseInfo ?? {
    name: formatLabel(result.topPrediction.label),
    scientificName: null,
    severity: 'moderate' as const,
    description: result.treatment?.summary ?? 'No detailed information available.',
    symptoms: [],
  }
  const sev = SEVERITY_STYLES[info.severity] ?? SEVERITY_STYLES.moderate
  const confidence = Math.round(result.topPrediction.confidence * 100)

  return (
    <section className="glass-card rounded-2xl p-4 relative overflow-hidden">
      <header className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-full bg-[#7fcf63] text-[#0f2410] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(98,200,88,0.35)]">
          <Leaf className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight truncate">{info.name}</h3>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                sev.className,
              )}
            >
              {sev.label}
            </span>
          </div>
          {info.scientificName && (
            <p className="text-[11px] italic text-muted-foreground mt-0.5">
              {info.scientificName}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {PLANT_LABELS[plantType]} · {confidence}% confidence
          </p>
        </div>
      </header>

      <p className="mt-3 text-[12px] leading-relaxed text-foreground/80">
        {info.description}
      </p>

      {info.symptoms.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Common symptoms
          </div>
          <ul className="mt-1.5 space-y-1">
            {info.symptoms.slice(0, 4).map((s) => (
              <li
                key={s}
                className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground/80"
              >
                <span className="mt-1 h-1 w-1 rounded-full bg-primary shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/* ──────────────────  SHOP DIRECTIONS CARD  ────────────────── */

function ShopDirectionsCard({
  className = '',
  result,
}: {
  className?: string
  result: DiagnosisResult | null
}) {
  const navigate = useNavigate()
  const shop = result?.shops?.[0]
  const isHealthy = result?.topPrediction.label === 'healthy'

  if (!result) {
    return (
      <section
        className={cn(
          'glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[180px]',
          className,
        )}
      >
        <header className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Nearest Shop</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Run a diagnosis to find shops with the recommended treatment.
            </p>
          </div>
        </header>
      </section>
    )
  }

  if (isHealthy) {
    return (
      <section
        className={cn(
          'glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[180px]',
          className,
        )}
      >
        <header className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">No treatment needed</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Plant looks healthy — keep monitoring every few days.
            </p>
          </div>
        </header>
      </section>
    )
  }

  // When the diagnosis didn't capture shops (no geolocation at diagnose time),
  // still let the user pivot to the live shop finder.
  if (!shop) {
    return (
      <section
        className={cn(
          'glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[180px]',
          className,
        )}
      >
        <header className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#7fcf63] text-[#0f2410] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(98,200,88,0.35)]">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Find nearby shops</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Browse agriculture shops with{' '}
              {result.treatment.medicine ?? 'recommended treatment'}.
            </p>
          </div>
        </header>
        <button
          type="button"
          onClick={() =>
            navigate({ to: '/map', search: { diagnosisId: result.id } })
          }
          className="mt-3 inline-flex items-center justify-center gap-2 h-9 rounded-full px-4 text-xs font-medium bg-[#1a1d1a] text-white shadow-[0_6px_16px_rgba(20,30,20,0.25)] hover:bg-[#262a26] transition-colors"
        >
          <Navigation className="h-3.5 w-3.5" />
          Find nearby shops
        </button>
      </section>
    )
  }

  const km = shop.distanceMeters !== undefined ? (shop.distanceMeters / 1000).toFixed(1) : null

  return (
    <section
      className={cn(
        'glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[180px]',
        className,
      )}
    >
      <header className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-full bg-[#7fcf63] text-[#0f2410] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(98,200,88,0.35)]">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">Nearest Shop</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Suggested for {result.treatment.medicine ?? 'recommended treatment'}
          </p>
        </div>
      </header>

      <div className="mt-3 rounded-xl bg-white/70 border border-white/70 px-3 py-2.5 backdrop-blur-sm">
        <div className="text-sm font-semibold truncate">{shop.name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{shop.address}</div>
        {km && (
          <div className="text-[10px] text-muted-foreground mt-0.5">{km} km away</div>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          navigate({
            to: '/map',
            search: { diagnosisId: result.id },
          })
        }
        className="mt-3 inline-flex items-center justify-center gap-2 h-9 rounded-full px-4 text-xs font-medium bg-[#1a1d1a] text-white shadow-[0_6px_16px_rgba(20,30,20,0.25)] hover:bg-[#262a26] transition-colors"
      >
        <Navigation className="h-3.5 w-3.5" />
        Find nearby shops
      </button>
    </section>
  )
}

/* ──────────────────  WEATHER FORECAST  ────────────────── */

function WeatherForecastCard({ className = '' }: { className?: string }) {
  const icons = [
    CloudSun,
    Cloud,
    CloudSun,
    Cloud,
    CloudDrizzle,
    CloudRain,
    CloudDrizzle,
    CloudRain,
  ]
  const points = useMemo(() => {
    const n = 32
    const w = 100
    const h = 40
    return Array.from({ length: n }, (_, i) => {
      const x = (i / (n - 1)) * w
      const y = h / 2 + Math.sin(i * 0.6) * 6 + Math.cos(i * 0.3) * 4
      return `${x},${y}`
    }).join(' ')
  }, [])

  return (
    <section className={cn('glass-card rounded-2xl p-4', className)}>
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Weather Forecast</h3>
          <p className="text-[11px] text-muted-foreground">
            Real-time farm weather insights
          </p>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-3 flex items-end gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight">28</span>
          <span className="text-base text-muted-foreground">°C</span>
        </div>
        <div className="text-[11px] text-muted-foreground mb-1">
          <div className="text-foreground font-medium">Cloudy</div>
          Feels like 30°C
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        {icons.map((C, i) => (
          <C key={i} className="h-4 w-4 text-[#6aa7c9]" />
        ))}
      </div>

      <div className="mt-2 relative h-12">
        <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-muted-foreground">
          <span>30°C</span>
          <span>28°C</span>
          <span>26°C</span>
        </div>
        <svg
          viewBox="0 0 100 40"
          className="absolute inset-0 ml-7 w-[calc(100%-1.75rem)] h-full"
          preserveAspectRatio="none"
        >
          <polyline
            points={points}
            fill="none"
            stroke="#3aa657"
            strokeWidth="0.8"
            strokeDasharray="2 2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </section>
  )
}

/* ──────────────────  SOIL CONDITION  ────────────────── */

function SoilConditionCard({ className = '' }: { className?: string }) {
  const bars = useMemo(() => {
    const n = 16
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1)
      const h = 30 + Math.sin(i * 0.8) * 20 + (1 - Math.abs(t - 0.7)) * 30
      const tier =
        i === 10
          ? 'water'
          : i % 5 === 0
            ? 'warn'
            : i % 7 === 0
              ? 'alert'
              : 'green'
      return { h: Math.max(20, Math.min(85, h)), tier }
    })
  }, [])

  return (
    <section className={cn('glass-card rounded-2xl p-4', className)}>
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Soil Condition</h3>
          <p className="text-[11px] text-muted-foreground">
            Soil nutrients and moisture overview
          </p>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-3 h-24 flex items-end gap-1.5 relative">
        {bars.map((b, i) => {
          const isWater = b.tier === 'water'
          const color =
            b.tier === 'warn'
              ? 'linear-gradient(180deg, #ffd05a 0%, #f0a330 100%)'
              : b.tier === 'alert'
                ? 'linear-gradient(180deg, #ff8a4c 0%, #ee5a24 100%)'
                : 'linear-gradient(180deg, #8ad36b 0%, #4ea84b 100%)'
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full relative"
            >
              {isWater && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-[#1a1d1a] text-white text-[10px] font-medium rounded-md px-2 py-0.5 whitespace-nowrap">
                  92% Water
                </div>
              )}
              <div
                className="w-full rounded-full"
                style={{ height: `${b.h}%`, background: color }}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
