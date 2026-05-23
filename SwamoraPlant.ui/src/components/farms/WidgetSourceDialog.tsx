import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Database,
  Radio,
  Globe,
  Hash,
  PenSquare,
  Loader2,
} from 'lucide-react'
import type { Widget } from '@/lib/farms'
import { cn } from '@/lib/utils'

export type WidgetSource =
  | 'mock'
  | 'mqtt'
  | 'http'
  | 'blynk'
  | 'manual'

interface WidgetSourceDialogProps {
  open: boolean
  widget: Widget
  onClose: () => void
  onSave: (
    dataSource: WidgetSource,
    config: Record<string, unknown>,
  ) => Promise<void> | void
}

interface SourceOption {
  id: WidgetSource
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const SOURCES: SourceOption[] = [
  {
    id: 'mock',
    label: 'Demo (mock data)',
    description: 'Generated values that look real — perfect for demos.',
    icon: Database,
    badge: 'Default',
  },
  {
    id: 'mqtt',
    label: 'MQTT sensor',
    description: 'Subscribe to an MQTT topic from a field device.',
    icon: Radio,
  },
  {
    id: 'http',
    label: 'HTTP webhook',
    description: 'Pull from any REST endpoint that returns JSON.',
    icon: Globe,
  },
  {
    id: 'blynk',
    label: 'Blynk virtual pin',
    description: 'Read a Blynk-style virtual pin (V0, V1, …).',
    icon: Hash,
  },
  {
    id: 'manual',
    label: 'Manual entry',
    description: "You'll update the value yourself when it changes.",
    icon: PenSquare,
  },
]

export function WidgetSourceDialog({
  open,
  widget,
  onClose,
  onSave,
}: WidgetSourceDialogProps) {
  const [source, setSource] = useState<WidgetSource>(
    (widget.dataSource as WidgetSource) ?? 'mock',
  )
  const [config, setConfig] = useState<Record<string, unknown>>(
    widget.config ?? {},
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSource((widget.dataSource as WidgetSource) ?? 'mock')
      setConfig(widget.config ?? {})
      setSaving(false)
    }
  }, [open, widget])

  if (!open) return null

  const setField = (key: string, value: unknown) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(source, config)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Configure data source"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-neutral-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Configure data source
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {widget.title ?? widget.type} — pick where this widget reads from.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-neutral-100 hover:bg-neutral-200 inline-flex items-center justify-center text-neutral-700 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Source picker */}
          <div className="space-y-2">
            {SOURCES.map((s) => {
              const Icon = s.icon
              const active = source === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource(s.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-3 flex items-start gap-3 transition-colors',
                    active
                      ? 'border-[#3a7d1f] bg-[#f3f9ec]'
                      : 'border-neutral-200 hover:bg-neutral-50',
                  )}
                >
                  <div
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                      active
                        ? 'bg-[#caf26b] text-neutral-900'
                        : 'bg-neutral-100 text-neutral-700',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">
                        {s.label}
                      </span>
                      {s.badge && (
                        <span className="text-[10px] uppercase tracking-wide bg-neutral-200 text-neutral-700 rounded-full px-1.5 py-0.5">
                          {s.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Per-source fields */}
          <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50/60 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Source settings
            </h3>

            {source === 'mock' && (
              <p className="text-xs text-neutral-600 leading-relaxed">
                No configuration needed. Values are generated locally so the
                dashboard works without any hardware connected.
              </p>
            )}

            {source === 'mqtt' && (
              <div className="space-y-3">
                <Field
                  label="Broker URL"
                  placeholder="mqtt://broker.example.com:1883"
                  value={(config.brokerUrl as string) ?? ''}
                  onChange={(v) => setField('brokerUrl', v)}
                />
                <Field
                  label="Topic"
                  placeholder="farm/blockA/soil/moisture"
                  value={(config.topic as string) ?? ''}
                  onChange={(v) => setField('topic', v)}
                />
                <Field
                  label="JSON path (optional)"
                  placeholder="payload.value"
                  value={(config.jsonPath as string) ?? ''}
                  onChange={(v) => setField('jsonPath', v)}
                  hint="If the payload is JSON, extract just one field."
                />
              </div>
            )}

            {source === 'http' && (
              <div className="space-y-3">
                <Field
                  label="Endpoint URL"
                  placeholder="https://api.example.com/sensor/123"
                  value={(config.url as string) ?? ''}
                  onChange={(v) => setField('url', v)}
                />
                <Field
                  label="Auth header (optional)"
                  placeholder="Bearer abc123"
                  value={(config.authHeader as string) ?? ''}
                  onChange={(v) => setField('authHeader', v)}
                />
                <NumberField
                  label="Poll every (seconds)"
                  value={(config.pollSeconds as number) ?? 60}
                  onChange={(v) => setField('pollSeconds', v)}
                  min={5}
                  max={3600}
                />
                <Field
                  label="JSON path (optional)"
                  placeholder="data.value"
                  value={(config.jsonPath as string) ?? ''}
                  onChange={(v) => setField('jsonPath', v)}
                />
              </div>
            )}

            {source === 'blynk' && (
              <div className="space-y-3">
                <Field
                  label="Blynk auth token"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={(config.token as string) ?? ''}
                  onChange={(v) => setField('token', v)}
                />
                <Field
                  label="Virtual pin"
                  placeholder="V0"
                  value={(config.pin as string) ?? ''}
                  onChange={(v) => setField('pin', v)}
                  hint="The virtual pin number, e.g. V0, V1, V2."
                />
                <NumberField
                  label="Poll every (seconds)"
                  value={(config.pollSeconds as number) ?? 30}
                  onChange={(v) => setField('pollSeconds', v)}
                  min={5}
                  max={3600}
                />
              </div>
            )}

            {source === 'manual' && (
              <div className="space-y-3">
                <NumberField
                  label="Current value"
                  value={(config.value as number) ?? 0}
                  onChange={(v) => setField('value', v)}
                />
                <Field
                  label="Unit (optional)"
                  placeholder="°C, %, L, kWh…"
                  value={(config.unit as string) ?? ''}
                  onChange={(v) => setField('unit', v)}
                />
                <p className="text-[11px] text-neutral-500">
                  You can update this value anytime by editing the widget.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
            <strong>Demo mode:</strong> non-mock sources are stored but
            currently render with mock values. Once the device bridge ships,
            existing widgets will start pulling live data automatically.
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 px-5 py-2 text-sm font-medium hover:bg-[#bce855] shadow-sm disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save source
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-700 mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-[#3a7d1f]"
      />
      {hint && (
        <span className="block text-[11px] text-neutral-500 mt-1">{hint}</span>
      )}
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-700 mb-1">
        {label}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-[#3a7d1f]"
      />
    </label>
  )
}
