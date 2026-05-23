/**
 * Widget data source abstraction. Today every widget pulls from `mockSource`.
 * When real sensors come online, add a `sensorSource(sensorId)` implementation
 * and switch by `widget.dataSource`.
 */

export interface WidgetReading {
  value: number
  unit?: string
  label?: string
  series?: number[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>
}

const seeded = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const SERIES_LEN = 24

export const mockReadings: Record<
  string,
  (config?: Record<string, unknown>) => WidgetReading
> = {
  water_flow: (config) => {
    const rand = seeded(((config?.seed as number) ?? 11) + Date.now() / 60000)
    return {
      value: 6750,
      unit: 'L',
      series: Array.from({ length: SERIES_LEN }, (_, i) =>
        Math.round(20 + Math.sin(i * 0.6) * 14 + rand() * 40),
      ),
      meta: { highlight: 'Soem 3.541' },
    }
  },
  power_consumption: () => ({
    value: 144,
    unit: 'kWh',
    meta: {
      lighting: 112,
      other: 20,
      grey: [22, 30, 28, 34, 26, 32],
      orange: [40, 56, 62, 70, 58, 46],
      green: [42, 50, 58, 66, 54, 60],
    },
  }),
  indoor_climate: () => ({ value: 23, unit: '°C' }),
  air_moisture: () => ({ value: 68, unit: '%' }),
  air_co2: () => ({
    value: 900,
    unit: 'ppm',
    series: [600, 600, 700, 700, 800, 800, 900, 900],
  }),
  light_level: () => ({ value: 15, unit: 'H' }),
  ec_level: () => ({ value: 2.1, unit: 'mS' }),
  growth_rate: () => ({
    value: 0.7,
    series: [22, 30, 36, 86, 40, 28, 22],
    meta: { days: ['July 20', 'July 21', 'July 22', 'July 23', 'July 24', 'July 25', 'July 26'] },
  }),
  soil_moisture: () => ({
    value: 54,
    unit: '%',
    series: [50, 52, 55, 53, 56, 54, 58, 56, 54],
  }),
  soil_ph: () => ({ value: 6.4, unit: 'pH' }),
  npk: () => ({
    value: 0,
    meta: { n: 42, p: 28, k: 36 },
  }),
  weather_now: () => ({
    value: 27,
    unit: '°C',
    label: 'Partly cloudy',
    meta: { humidity: 64, wind: 9 },
  }),
  weather_outlook: () => ({
    value: 0,
    meta: {
      days: [
        { d: 'Mon', t: 28, icon: 'sun' },
        { d: 'Tue', t: 26, icon: 'cloud' },
        { d: 'Wed', t: 24, icon: 'rain' },
        { d: 'Thu', t: 25, icon: 'rain' },
        { d: 'Fri', t: 27, icon: 'sun' },
        { d: 'Sat', t: 29, icon: 'sun' },
        { d: 'Sun', t: 28, icon: 'cloud' },
      ],
    },
  }),
  rain_probability: () => ({ value: 35, unit: '%' }),
  disease_risk: () => ({
    value: 22,
    unit: '%',
    label: 'Low risk',
    meta: { trend: 'down' },
  }),
  pest_alerts: () => ({
    value: 2,
    label: 'Active alerts',
    meta: {
      items: [
        { name: 'Aphids', severity: 'low', block: 'Block B' },
        { name: 'Whitefly', severity: 'medium', block: 'Block A' },
      ],
    },
  }),
  yield_forecast: () => ({
    value: 16,
    unit: '%',
    label: 'Projected yield uplift',
    meta: { confidence: 0.78 },
  }),
  savi_insights: () => ({
    value: 0,
    meta: {
      tips: [
        'Soil moisture in Block A is trending down — consider irrigation tonight.',
        'CO₂ is stable. Lighting cycles look efficient.',
      ],
    },
  }),
  irrigation_schedule: () => ({
    value: 0,
    meta: {
      next: 'Tonight, 21:00',
      duration: '45 min',
      block: 'Zone 2',
    },
  }),
  drone_logs: () => ({
    value: 3,
    label: 'Flights this week',
    meta: {
      latest: 'Wed · 09:14 · 12 ha covered',
    },
  }),
  worker_activity: () => ({
    value: 4,
    label: 'Workers on site',
    meta: { tasks: ['Pruning', 'Inspection', 'Spraying'] },
  }),
}

export const readWidget = (
  type: string,
  source: string,
  config?: Record<string, unknown>,
): WidgetReading => {
  // Manual entry: use the value the user typed in the source dialog so the
  // widget actually reflects their input.
  if (source === 'manual' && config && typeof config.value === 'number') {
    const fn = mockReadings[type]
    const base = fn ? fn(config) : { value: 0 }
    return {
      ...base,
      value: config.value,
      unit: (config.unit as string) || base.unit,
    }
  }
  // Future: switch on `source` (mqtt/http/blynk) to read live data via a
  // backend bridge. For now non-mock sources still render mock data so the
  // dashboard stays alive during the demo.
  void source
  const fn = mockReadings[type]
  if (fn) return fn(config)
  return { value: 0, unit: '' }
}
