import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Bolt,
  Droplet,
  Leaf,
  Lightbulb,
  Sparkles,
  Thermometer,
  TrendingUp,
  User,
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppShell } from '@/components/AppShell'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const ready = useAuthGuard()

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
        {/* Hero greenhouse card with floating Savi gauge */}
        <HeroCard className="col-span-12 lg:col-span-8" />

        {/* Right column: Water Flow + Power Consumption */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <WaterFlowCard />
          <PowerConsumptionCard />
        </div>

        {/* Bottom row of metric tiles */}
        <MetricTileCard
          className="col-span-6 sm:col-span-4 lg:col-span-2"
          icon={Thermometer}
          label="Indoor Climate"
          value="23"
          unit="°C"
        />
        <MetricTileCard
          className="col-span-6 sm:col-span-4 lg:col-span-2"
          icon={Droplet}
          label="Air Moisture"
          value="68"
          unit="%"
        />
        <GrowthRateCard className="col-span-12 sm:col-span-8 lg:col-span-4" />
        <AirCO2Card className="col-span-12 lg:col-span-4" />
        <MetricTileCard
          className="col-span-6 lg:col-span-2"
          icon={Lightbulb}
          label="Light Level"
          value="15"
          unit="H"
        />
        <MetricTileCard
          className="col-span-6 lg:col-span-2"
          icon={Leaf}
          label="EC Level"
          value="2.1"
          unit="mS"
        />
      </div>
    </AppShell>
  )
}

/* -------------------- Hero card -------------------- */

function HeroCard({ className = '' }: { className?: string }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[22px] border border-white/60 shadow-[0_10px_30px_rgba(20,40,30,0.08)] ${className}`}
      style={{ minHeight: '360px' }}
    >
      {/* Greenhouse image */}
      <img
        src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1600&q=80"
        alt="Greenhouse interior"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      {/* Subtle bottom fade for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

      {/* Floating Savi gauge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px]">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium">Savi</span>
            </div>
            <button
              type="button"
              aria-label="Open"
              className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 flex flex-col items-center">
            <HarvestGauge percent={80} />
            <div className="-mt-12 flex flex-col items-center">
              <span className="text-3xl font-semibold tracking-tight">80%</span>
              <span className="text-xs text-muted-foreground mt-0.5">Good Growth</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HarvestGauge({ percent }: { percent: number }) {
  // Semicircle gauge from -90deg (left) to +90deg (right)
  const size = 180
  const stroke = 14
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const semiLen = Math.PI * radius
  const dash = (Math.min(Math.max(percent, 0), 100) / 100) * semiLen

  return (
    <svg
      viewBox={`0 0 ${size} ${size / 2 + stroke}`}
      width={size}
      height={size / 2 + stroke}
      className="block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#cdebb4" />
          <stop offset="60%" stopColor="#7fcf63" />
          <stop offset="100%" stopColor="#3aa657" />
        </linearGradient>
      </defs>
      {/* Track */}
      <path
        d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${semiLen}`}
      />
      {/* Tiny cucumber-ish leaf marker near the top */}
      <g transform={`translate(${cx - 14}, ${cy - radius - 4})`}>
        <ellipse cx="14" cy="6" rx="14" ry="6" fill="#7fcf63" />
        <ellipse cx="14" cy="5" rx="11" ry="4" fill="#a7df8f" />
      </g>
    </svg>
  )
}

/* -------------------- Water Flow -------------------- */

function WaterFlowCard() {
  // Bars: many grey, last ~9 green with one slightly taller "Soem 3.541" highlight
  const bars = Array.from({ length: 28 }, (_, i) => {
    const isGreen = i >= 18
    const h = 30 + Math.round(Math.sin(i * 0.6) * 14 + Math.random() * 18)
    return { h: Math.max(18, Math.min(72, h)), isGreen }
  })
  // Force a taller highlighted green bar
  bars[22] = { h: 78, isGreen: true }

  return (
    <section className="glass-card rounded-2xl p-4">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="glass-pill h-8 w-8 rounded-lg flex items-center justify-center">
            <Droplet className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Water Flow</span>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">6.750</span>
        <span className="text-sm text-muted-foreground">L</span>
      </div>

      <div className="relative mt-3 h-24">
        {/* tooltip */}
        <div className="absolute -top-1 right-12 text-[10px] text-muted-foreground">
          Soem <span className="font-medium text-foreground">3.541</span>
        </div>
        <div className="flex items-end gap-[3px] h-full">
          {bars.map((b, i) => (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${b.h}%`,
                background: b.isGreen
                  ? 'linear-gradient(180deg, #8ad36b 0%, #4ea84b 100%)'
                  : 'rgba(0,0,0,0.12)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------- Power Consumption -------------------- */

function PowerConsumptionCard() {
  // Three time-grouped sections: grey, orange, green
  const grey = [22, 30, 28, 34, 26, 32]
  const orange = [40, 56, 62, 70, 58, 46]
  const green = [42, 50, 58, 66, 54, 60]

  const labels = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '01:00']

  const Bar = ({ value, color }: { value: number; color: string }) => (
    <div
      className="w-2 rounded-full"
      style={{ height: `${value}%`, background: color }}
    />
  )

  return (
    <section className="glass-card rounded-2xl p-4">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="glass-pill h-8 w-8 rounded-lg flex items-center justify-center">
            <Bolt className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Power Consumption</span>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-semibold tracking-tight">144</span>
        <span className="text-sm text-muted-foreground">kWh</span>
        <span className="text-xs text-muted-foreground ml-2">
          Lighting: <span className="text-foreground font-medium">112</span> kWh
        </span>
        <span className="text-xs text-muted-foreground">
          Other: <span className="text-foreground font-medium">20</span> kWh
        </span>
      </div>

      <div className="mt-3 h-24 flex items-end gap-3">
        <div className="flex items-end gap-1 flex-1">
          {grey.map((v, i) => (
            <Bar key={`g${i}`} value={v} color="rgba(0,0,0,0.16)" />
          ))}
        </div>
        <div className="flex items-end gap-1 flex-1">
          {orange.map((v, i) => (
            <Bar
              key={`o${i}`}
              value={v}
              color="linear-gradient(180deg, #ff8a4c 0%, #ee5a24 100%)"
            />
          ))}
        </div>
        <div className="flex items-end gap-1 flex-1">
          {green.map((v, i) => (
            <Bar
              key={`gr${i}`}
              value={v}
              color="linear-gradient(180deg, #8ad36b 0%, #4ea84b 100%)"
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </section>
  )
}

/* -------------------- Bottom row tiles -------------------- */

interface MetricTileCardProps {
  className?: string
  icon: typeof Thermometer
  label: string
  value: string
  unit?: string
}

function MetricTileCard({
  className = '',
  icon: Icon,
  label,
  value,
  unit,
}: MetricTileCardProps) {
  return (
    <section className={`glass-card rounded-2xl p-4 ${className}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="glass-pill h-8 w-8 rounded-lg flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium text-foreground/80">{label}</span>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </section>
  )
}

function GrowthRateCard({ className = '' }: { className?: string }) {
  const days = ['July 20', 'July 21', 'July 22', 'July 23', 'July 24', 'July 25', 'July 26']
  // Bars per day (vertical sub-bars), with July 23 highlighted dark green
  const series = [
    [18, 22, 16],
    [24, 30, 20],
    [28, 36, 24],
    [70, 86, 72], // highlighted
    [34, 40, 28],
    [22, 28, 18],
    [16, 22, 14],
  ]
  return (
    <section className={`glass-card rounded-2xl p-4 ${className}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="glass-pill h-8 w-8 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Growth Rate</span>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-2 text-2xl font-semibold tracking-tight">0.70</div>

      <div className="mt-3 h-24 flex items-end gap-3">
        {series.map((group, i) => {
          const highlight = i === 3
          return (
            <div key={i} className="flex-1 flex items-end justify-center gap-[3px] h-full">
              {group.map((v, j) => (
                <div
                  key={j}
                  className="w-2 rounded-full"
                  style={{
                    height: `${v}%`,
                    background: highlight
                      ? 'linear-gradient(180deg, #5cb85c 0%, #2f8b2f 100%)'
                      : 'rgba(0,0,0,0.14)',
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </section>
  )
}

function AirCO2Card({ className = '' }: { className?: string }) {
  // Stepped area chart 600 → 900 ppm
  const steps = [600, 600, 700, 700, 800, 800, 900, 900]
  const max = 1000
  const w = 100
  const h = 100
  const stepW = w / steps.length

  // Build stepped polyline
  let d = `M 0 ${h - (steps[0] / max) * h}`
  steps.forEach((v, i) => {
    const x1 = i * stepW
    const y = h - (v / max) * h
    d += ` L ${x1} ${y} L ${(i + 1) * stepW} ${y}`
  })
  const area = `${d} L ${w} ${h} L 0 ${h} Z`

  return (
    <section className={`glass-card rounded-2xl p-4 ${className}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="glass-pill h-8 w-8 rounded-lg flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Air CO₂</span>
        </div>
        <button
          type="button"
          aria-label="Open"
          className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">900</span>
        <span className="text-xs text-muted-foreground">ppm</span>
      </div>

      <div className="mt-3 flex gap-2 items-end">
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground h-24 py-0.5">
          <span>900</span>
          <span>800</span>
          <span>600</span>
        </div>
        <div className="relative flex-1 h-24">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="co2Grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8ad36b" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#8ad36b" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#co2Grad)" />
            <path d={d} stroke="#4ea84b" strokeWidth="1.5" fill="none" />
          </svg>
          <div className="absolute top-1 right-1 glass-pill rounded-md px-1.5 py-0.5 text-[10px]">
            16:47
          </div>
        </div>
      </div>
    </section>
  )
}

