import {
  Activity,
  Bug,
  CloudRain,
  Cloud,
  Sun,
  CloudSun,
  Droplet,
  Droplets,
  Bolt,
  Thermometer,
  Lightbulb,
  Leaf,
  TrendingUp,
  User,
  Sparkles,
  ShieldAlert,
  Plane,
  Users,
  Timer,
} from 'lucide-react'
import { readWidget } from './dataSources'
import type { Widget } from '@/lib/farms'

/* -------------------- shared bits -------------------- */

export function HarvestGauge({ percent }: { percent: number }) {
  const size = 180
  const stroke = 14
  const radius = (size - stroke) / 2
  const cy = size / 2
  const semiLen = Math.PI * radius
  const dash = (Math.min(Math.max(percent, 0), 100) / 100) * semiLen

  return (
    <svg
      viewBox={`0 0 ${size} ${size / 2 + stroke}`}
      width={size}
      height={size / 2 + stroke}
      className="block mx-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#cdebb4" />
          <stop offset="60%" stopColor="#7fcf63" />
          <stop offset="100%" stopColor="#3aa657" />
        </linearGradient>
      </defs>
      <path
        d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${semiLen}`}
      />
    </svg>
  )
}

/* -------------------- widget bodies -------------------- */

export function WaterFlowBody({ widget }: { widget: Widget }) {
  const r = readWidget('water_flow', widget.dataSource, widget.config)
  const series = r.series ?? []
  const bars = series.map((h, i) => ({ h, isGreen: i >= 18 }))
  if (bars[22]) bars[22] = { h: 78, isGreen: true }
  return (
    <>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">{(r.value / 1000).toFixed(3)}</span>
        <span className="text-sm text-muted-foreground">L</span>
      </div>
      <div className="relative mt-3 h-24">
        <div className="absolute -top-1 right-12 text-[10px] text-muted-foreground">
          Soem <span className="font-medium text-foreground">3.541</span>
        </div>
        <div className="flex items-end gap-[3px] h-full">
          {bars.map((b, i) => (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${Math.max(18, Math.min(78, b.h))}%`,
                background: b.isGreen
                  ? 'linear-gradient(180deg, #8ad36b 0%, #4ea84b 100%)'
                  : 'rgba(0,0,0,0.12)',
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export function PowerConsumptionBody({ widget }: { widget: Widget }) {
  const r = readWidget('power_consumption', widget.dataSource, widget.config)
  const meta = (r.meta ?? {}) as {
    lighting?: number
    other?: number
    grey?: number[]
    orange?: number[]
    green?: number[]
  }
  const labels = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '01:00']
  const Bar = ({ value, color }: { value: number; color: string }) => (
    <div className="w-2 rounded-full" style={{ height: `${value}%`, background: color }} />
  )
  return (
    <>
      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-sm text-muted-foreground">{r.unit}</span>
        <span className="text-xs text-muted-foreground ml-2">
          Lighting: <span className="text-foreground font-medium">{meta.lighting}</span> kWh
        </span>
        <span className="text-xs text-muted-foreground">
          Other: <span className="text-foreground font-medium">{meta.other}</span> kWh
        </span>
      </div>
      <div className="mt-3 h-24 flex items-end gap-3">
        <div className="flex items-end gap-1 flex-1">
          {(meta.grey ?? []).map((v, i) => (
            <Bar key={`g${i}`} value={v} color="rgba(0,0,0,0.16)" />
          ))}
        </div>
        <div className="flex items-end gap-1 flex-1">
          {(meta.orange ?? []).map((v, i) => (
            <Bar key={`o${i}`} value={v} color="linear-gradient(180deg, #ff8a4c 0%, #ee5a24 100%)" />
          ))}
        </div>
        <div className="flex items-end gap-1 flex-1">
          {(meta.green ?? []).map((v, i) => (
            <Bar key={`gr${i}`} value={v} color="linear-gradient(180deg, #8ad36b 0%, #4ea84b 100%)" />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </>
  )
}

export function SimpleMetricBody({ widget }: { widget: Widget }) {
  const r = readWidget(widget.type, widget.dataSource, widget.config)
  return (
    <div className="mt-3 flex items-baseline gap-1">
      <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
      {r.unit && <span className="text-xs text-muted-foreground">{r.unit}</span>}
      {r.label && <span className="text-xs text-muted-foreground ml-2">{r.label}</span>}
    </div>
  )
}

export function GrowthRateBody({ widget }: { widget: Widget }) {
  const r = readWidget('growth_rate', widget.dataSource, widget.config)
  const days = (r.meta as { days?: string[] })?.days ?? []
  const series = r.series ?? []
  const groups = series.map((v) => [v - 6, v, v - 10])
  return (
    <>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{r.value.toFixed(2)}</div>
      <div className="mt-3 h-24 flex items-end gap-3">
        {groups.map((group, i) => {
          const highlight = i === 3
          return (
            <div key={i} className="flex-1 flex items-end justify-center gap-[3px] h-full">
              {group.map((v, j) => (
                <div
                  key={j}
                  className="w-2 rounded-full"
                  style={{
                    height: `${Math.max(8, Math.min(92, v))}%`,
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
    </>
  )
}

export function AirCO2Body({ widget }: { widget: Widget }) {
  const r = readWidget('air_co2', widget.dataSource, widget.config)
  const steps = r.series ?? [600, 700, 800, 900]
  const max = 1000
  const w = 100
  const h = 100
  const stepW = w / steps.length
  let d = `M 0 ${h - (steps[0] / max) * h}`
  steps.forEach((v, i) => {
    const x1 = i * stepW
    const y = h - (v / max) * h
    d += ` L ${x1} ${y} L ${(i + 1) * stepW} ${y}`
  })
  const area = `${d} L ${w} ${h} L 0 ${h} Z`

  return (
    <>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.unit}</span>
      </div>
      <div className="mt-3 flex gap-2 items-end">
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground h-24 py-0.5">
          <span>900</span>
          <span>800</span>
          <span>600</span>
        </div>
        <div className="relative flex-1 h-24">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <defs>
              <linearGradient id={`co2-${widget.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8ad36b" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#8ad36b" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#co2-${widget.id})`} />
            <path d={d} stroke="#4ea84b" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>
    </>
  )
}

export function SoilMoistureBody({ widget }: { widget: Widget }) {
  const r = readWidget('soil_moisture', widget.dataSource, widget.config)
  const series = r.series ?? []
  const max = 100
  const w = 100
  const h = 40
  const stepW = w / Math.max(series.length - 1, 1)
  const path = series
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * stepW} ${h - (v / max) * h}`)
    .join(' ')
  return (
    <>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.unit}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 w-full h-16">
        <path d={path} stroke="#4ea84b" strokeWidth="1.5" fill="none" />
      </svg>
    </>
  )
}

export function NPKBody({ widget }: { widget: Widget }) {
  const r = readWidget('npk', widget.dataSource, widget.config)
  const meta = (r.meta ?? {}) as { n?: number; p?: number; k?: number }
  const Row = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs w-3 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}</span>
    </div>
  )
  return (
    <div className="mt-3 space-y-2">
      <Row label="N" value={meta.n ?? 0} color="linear-gradient(90deg,#cdebb4,#3aa657)" />
      <Row label="P" value={meta.p ?? 0} color="linear-gradient(90deg,#ffd388,#ee9a3d)" />
      <Row label="K" value={meta.k ?? 0} color="linear-gradient(90deg,#bfdcff,#3680e0)" />
    </div>
  )
}

export function WeatherNowBody({ widget }: { widget: Widget }) {
  const r = readWidget('weather_now', widget.dataSource, widget.config)
  const meta = (r.meta ?? {}) as { humidity?: number; wind?: number }
  return (
    <>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.unit}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{r.label}</div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>
          Humidity <span className="text-foreground font-medium">{meta.humidity}%</span>
        </span>
        <span>
          Wind <span className="text-foreground font-medium">{meta.wind} km/h</span>
        </span>
      </div>
    </>
  )
}

const ICONS: Record<string, typeof Sun> = { sun: Sun, cloud: Cloud, rain: CloudRain }

export function WeatherOutlookBody({ widget }: { widget: Widget }) {
  const r = readWidget('weather_outlook', widget.dataSource, widget.config)
  const days = ((r.meta as { days?: Array<{ d: string; t: number; icon: string }> })?.days ?? [])
  return (
    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
      {days.map((day) => {
        const Icon = ICONS[day.icon] ?? CloudSun
        return (
          <div key={day.d} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{day.d}</span>
            <Icon className="h-4 w-4 text-foreground/70" />
            <span className="text-xs font-medium">{day.t}°</span>
          </div>
        )
      })}
    </div>
  )
}

export function DiseaseRiskBody({ widget }: { widget: Widget }) {
  const r = readWidget('disease_risk', widget.dataSource, widget.config)
  return (
    <>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.unit}</span>
        <span className="text-xs text-emerald-600 font-medium ml-2">{r.label}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${r.value}%`,
            background: 'linear-gradient(90deg,#cdebb4,#3aa657)',
          }}
        />
      </div>
    </>
  )
}

export function PestAlertsBody({ widget }: { widget: Widget }) {
  const r = readWidget('pest_alerts', widget.dataSource, widget.config)
  const items = ((r.meta as { items?: Array<{ name: string; severity: string; block: string }> })?.items ?? [])
  return (
    <>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.label}</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map((it) => (
          <li key={it.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (it.severity === 'high'
                    ? 'bg-red-500'
                    : it.severity === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500')
                }
              />
              {it.name}
            </span>
            <span className="text-xs text-muted-foreground">{it.block}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function YieldForecastBody({ widget }: { widget: Widget }) {
  const r = readWidget('yield_forecast', widget.dataSource, widget.config)
  const confidence = ((r.meta as { confidence?: number })?.confidence ?? 0) * 100
  return (
    <>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">+{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.unit}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{r.label}</div>
      <div className="mt-3 text-xs text-muted-foreground">
        Confidence <span className="text-foreground font-medium">{confidence.toFixed(0)}%</span>
      </div>
    </>
  )
}

export function SaviInsightsBody({ widget }: { widget: Widget }) {
  const r = readWidget('savi_insights', widget.dataSource, widget.config)
  const tips = ((r.meta as { tips?: string[] })?.tips ?? [])
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {tips.map((t, i) => (
        <li key={i} className="flex gap-2">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 text-[#3a7d1f] shrink-0" />
          <span className="text-foreground/85">{t}</span>
        </li>
      ))}
    </ul>
  )
}

export function IrrigationBody({ widget }: { widget: Widget }) {
  const r = readWidget('irrigation_schedule', widget.dataSource, widget.config)
  const meta = (r.meta ?? {}) as { next?: string; duration?: string; block?: string }
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Next</span>
        <span className="font-medium">{meta.next}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Duration</span>
        <span className="font-medium">{meta.duration}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Zone</span>
        <span className="font-medium">{meta.block}</span>
      </div>
    </div>
  )
}

export function DroneLogsBody({ widget }: { widget: Widget }) {
  const r = readWidget('drone_logs', widget.dataSource, widget.config)
  const latest = (r.meta as { latest?: string })?.latest
  return (
    <>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.label}</span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">{latest}</div>
    </>
  )
}

export function WorkerActivityBody({ widget }: { widget: Widget }) {
  const r = readWidget('worker_activity', widget.dataSource, widget.config)
  const tasks = ((r.meta as { tasks?: string[] })?.tasks ?? [])
  return (
    <>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{r.value}</span>
        <span className="text-xs text-muted-foreground">{r.label}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tasks.map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 rounded-full bg-[#caf26b]/30 text-[#3a7d1f]"
          >
            {t}
          </span>
        ))}
      </div>
    </>
  )
}

/* -------------------- icons map -------------------- */

export const WIDGET_ICONS: Record<string, typeof Leaf> = {
  water_flow: Droplet,
  power_consumption: Bolt,
  indoor_climate: Thermometer,
  air_moisture: Droplets,
  air_co2: User,
  light_level: Lightbulb,
  ec_level: Leaf,
  growth_rate: TrendingUp,
  soil_moisture: Droplets,
  soil_ph: Leaf,
  npk: Leaf,
  weather_now: CloudSun,
  weather_outlook: Cloud,
  rain_probability: CloudRain,
  disease_risk: ShieldAlert,
  pest_alerts: Bug,
  yield_forecast: Activity,
  savi_insights: Sparkles,
  irrigation_schedule: Timer,
  drone_logs: Plane,
  worker_activity: Users,
}
