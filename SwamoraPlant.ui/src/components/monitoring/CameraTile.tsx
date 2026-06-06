import { ArrowUpRight, Camera, Monitor, ScanLine } from 'lucide-react'

export function CameraTile() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-paper bg-card aspect-[16/10]">
      {/* Placeholder image — replace with real feed when available */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#3a5a3f_0%,#1f3d2a_100%)]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, transparent 8px 24px)',
        }}
      />

      {/* Top-left label */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white/90 text-[11px] px-2 py-1 rounded-md">
        <span className="text-white/70">‹</span>
        Camera 1
      </div>

      {/* Top-right open */}
      <button
        type="button"
        className="absolute top-3 right-3 h-7 w-7 rounded-md bg-black/40 backdrop-blur-sm text-white/90 flex items-center justify-center hover:bg-black/60 transition-colors"
        aria-label="Expand camera"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>

      {/* Bottom controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <CamButton icon={ScanLine} />
        <CamButton icon={Camera} primary />
        <CamButton icon={Monitor} />
      </div>
    </div>
  )
}

function CamButton({
  icon: Icon,
  primary = false,
}: {
  icon: typeof Camera
  primary?: boolean
}) {
  return (
    <button
      type="button"
      className={
        primary
          ? 'h-9 w-9 rounded-md bg-white/95 text-foreground flex items-center justify-center hover:bg-white transition-colors'
          : 'h-9 w-9 rounded-md bg-black/40 backdrop-blur-sm text-white/90 flex items-center justify-center hover:bg-black/60 transition-colors'
      }
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
