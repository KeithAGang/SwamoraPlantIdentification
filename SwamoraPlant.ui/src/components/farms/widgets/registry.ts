import type { ComponentType } from 'react'
import type { Widget } from '@/lib/farms'
import {
  WaterFlowBody,
  PowerConsumptionBody,
  SimpleMetricBody,
  GrowthRateBody,
  AirCO2Body,
  SoilMoistureBody,
  NPKBody,
  WeatherNowBody,
  WeatherOutlookBody,
  DiseaseRiskBody,
  PestAlertsBody,
  YieldForecastBody,
  SaviInsightsBody,
  IrrigationBody,
  DroneLogsBody,
  WorkerActivityBody,
  WIDGET_ICONS,
} from './widgets'

export interface WidgetSpec {
  type: string
  category: 'Climate' | 'Water' | 'Soil' | 'Crop Health' | 'Operations' | 'AI' | 'Weather'
  title: string
  description: string
  defaultSize: Widget['size']
  Body: ComponentType<{ widget: Widget }>
  Icon: typeof WIDGET_ICONS[string]
}

export const WIDGET_CATALOG: WidgetSpec[] = [
  // Climate
  {
    type: 'indoor_climate',
    category: 'Climate',
    title: 'Indoor Climate',
    description: 'Current temperature inside the greenhouse',
    defaultSize: 'sm',
    Body: SimpleMetricBody,
    Icon: WIDGET_ICONS.indoor_climate,
  },
  {
    type: 'air_moisture',
    category: 'Climate',
    title: 'Air Moisture',
    description: 'Relative humidity in the growing space',
    defaultSize: 'sm',
    Body: SimpleMetricBody,
    Icon: WIDGET_ICONS.air_moisture,
  },
  {
    type: 'air_co2',
    category: 'Climate',
    title: 'Air CO₂',
    description: 'CO₂ concentration trend (ppm)',
    defaultSize: 'md',
    Body: AirCO2Body,
    Icon: WIDGET_ICONS.air_co2,
  },
  {
    type: 'light_level',
    category: 'Climate',
    title: 'Light Level',
    description: 'Daily photoperiod / DLI snapshot',
    defaultSize: 'sm',
    Body: SimpleMetricBody,
    Icon: WIDGET_ICONS.light_level,
  },
  // Water
  {
    type: 'water_flow',
    category: 'Water',
    title: 'Water Flow',
    description: 'Irrigation flow with intraday pattern',
    defaultSize: 'md',
    Body: WaterFlowBody,
    Icon: WIDGET_ICONS.water_flow,
  },
  {
    type: 'soil_moisture',
    category: 'Water',
    title: 'Soil Moisture',
    description: 'Volumetric water content trend',
    defaultSize: 'md',
    Body: SoilMoistureBody,
    Icon: WIDGET_ICONS.soil_moisture,
  },
  {
    type: 'irrigation_schedule',
    category: 'Water',
    title: 'Irrigation Schedule',
    description: 'Upcoming irrigation cycles by zone',
    defaultSize: 'sm',
    Body: IrrigationBody,
    Icon: WIDGET_ICONS.irrigation_schedule,
  },
  // Soil
  {
    type: 'ec_level',
    category: 'Soil',
    title: 'EC Level',
    description: 'Electrical conductivity (mS)',
    defaultSize: 'sm',
    Body: SimpleMetricBody,
    Icon: WIDGET_ICONS.ec_level,
  },
  {
    type: 'soil_ph',
    category: 'Soil',
    title: 'Soil pH',
    description: 'Root-zone pH reading',
    defaultSize: 'sm',
    Body: SimpleMetricBody,
    Icon: WIDGET_ICONS.soil_ph,
  },
  {
    type: 'npk',
    category: 'Soil',
    title: 'NPK',
    description: 'Nitrogen, Phosphorus, Potassium index',
    defaultSize: 'md',
    Body: NPKBody,
    Icon: WIDGET_ICONS.npk,
  },
  // Crop health
  {
    type: 'growth_rate',
    category: 'Crop Health',
    title: 'Growth Rate',
    description: 'Day-over-day canopy growth',
    defaultSize: 'lg',
    Body: GrowthRateBody,
    Icon: WIDGET_ICONS.growth_rate,
  },
  {
    type: 'disease_risk',
    category: 'Crop Health',
    title: 'Disease Risk',
    description: 'Composite AI risk score for active diseases',
    defaultSize: 'md',
    Body: DiseaseRiskBody,
    Icon: WIDGET_ICONS.disease_risk,
  },
  {
    type: 'pest_alerts',
    category: 'Crop Health',
    title: 'Pest Alerts',
    description: 'Active pest detections by block',
    defaultSize: 'md',
    Body: PestAlertsBody,
    Icon: WIDGET_ICONS.pest_alerts,
  },
  // Operations
  {
    type: 'power_consumption',
    category: 'Operations',
    title: 'Power Consumption',
    description: 'Lighting + other electrical loads',
    defaultSize: 'md',
    Body: PowerConsumptionBody,
    Icon: WIDGET_ICONS.power_consumption,
  },
  {
    type: 'drone_logs',
    category: 'Operations',
    title: 'Drone Logs',
    description: 'Recent drone fly-overs and coverage',
    defaultSize: 'sm',
    Body: DroneLogsBody,
    Icon: WIDGET_ICONS.drone_logs,
  },
  {
    type: 'worker_activity',
    category: 'Operations',
    title: 'Worker Activity',
    description: 'On-site staff & current tasks',
    defaultSize: 'sm',
    Body: WorkerActivityBody,
    Icon: WIDGET_ICONS.worker_activity,
  },
  // AI
  {
    type: 'savi_insights',
    category: 'AI',
    title: 'Savi Insights',
    description: 'AI-generated tips tailored to this farm',
    defaultSize: 'md',
    Body: SaviInsightsBody,
    Icon: WIDGET_ICONS.savi_insights,
  },
  {
    type: 'yield_forecast',
    category: 'AI',
    title: 'Yield Forecast',
    description: 'Projected yield uplift vs. baseline',
    defaultSize: 'sm',
    Body: YieldForecastBody,
    Icon: WIDGET_ICONS.yield_forecast,
  },
  // Weather
  {
    type: 'weather_now',
    category: 'Weather',
    title: 'Current Weather',
    description: 'Temperature, humidity, wind',
    defaultSize: 'sm',
    Body: WeatherNowBody,
    Icon: WIDGET_ICONS.weather_now,
  },
  {
    type: 'weather_outlook',
    category: 'Weather',
    title: '7-Day Outlook',
    description: 'Week-ahead forecast strip',
    defaultSize: 'md',
    Body: WeatherOutlookBody,
    Icon: WIDGET_ICONS.weather_outlook,
  },
  {
    type: 'rain_probability',
    category: 'Weather',
    title: 'Rain Probability',
    description: 'Likelihood of rain in next 24h',
    defaultSize: 'sm',
    Body: SimpleMetricBody,
    Icon: WIDGET_ICONS.rain_probability,
  },
]

export const getWidgetSpec = (type: string): WidgetSpec | null =>
  WIDGET_CATALOG.find((w) => w.type === type) ?? null

export interface WidgetPreset {
  id: string
  name: string
  description: string
  widgets: Array<{ type: string; size?: Widget['size'] }>
}

export const WIDGET_PRESETS: WidgetPreset[] = [
  {
    id: 'greenhouse',
    name: 'Greenhouse starter',
    description: 'Climate, CO₂, light, and water flow for a covered grow.',
    widgets: [
      { type: 'indoor_climate' },
      { type: 'air_moisture' },
      { type: 'air_co2' },
      { type: 'light_level' },
      { type: 'water_flow' },
      { type: 'savi_insights' },
    ],
  },
  {
    id: 'open_field',
    name: 'Open field horticulture',
    description: 'Weather, soil, and disease focus for outdoor plots.',
    widgets: [
      { type: 'weather_now' },
      { type: 'weather_outlook' },
      { type: 'soil_moisture' },
      { type: 'soil_ph' },
      { type: 'disease_risk' },
      { type: 'pest_alerts' },
    ],
  },
  {
    id: 'outgrower_network',
    name: 'Outgrower network',
    description: 'Institution view tracking drones, workers, and yields.',
    widgets: [
      { type: 'drone_logs' },
      { type: 'worker_activity' },
      { type: 'yield_forecast' },
      { type: 'savi_insights' },
      { type: 'pest_alerts' },
    ],
  },
]
