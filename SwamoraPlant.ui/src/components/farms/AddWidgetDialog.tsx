import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Sparkles } from 'lucide-react'
import { WIDGET_CATALOG, WIDGET_PRESETS, type WidgetSpec } from './widgets/registry'
import type { Widget } from '@/lib/farms'
import { farmsApi } from '@/lib/farms'

interface AddWidgetDialogProps {
  open: boolean
  onClose: () => void
  farmId: number
  existing: Widget[]
  onAdded: (widgets: Widget[]) => void
}

const CATEGORIES = Array.from(
  new Set(WIDGET_CATALOG.map((w) => w.category)),
) as WidgetSpec['category'][]

export function AddWidgetDialog({
  open,
  onClose,
  farmId,
  existing,
  onAdded,
}: AddWidgetDialogProps) {
  const [tab, setTab] = useState<'catalog' | 'presets'>('catalog')
  const [category, setCategory] = useState<WidgetSpec['category']>(CATEGORIES[0])
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTab('catalog')
      setCategory(CATEGORIES[0])
      setError('')
      setLoading(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const existingTypes = new Set(existing.map((w) => w.type))

  const addOne = async (spec: WidgetSpec) => {
    setLoading(spec.type)
    setError('')
    try {
      const created = await farmsApi.addWidget(farmId, {
        type: spec.type,
        size: spec.defaultSize,
      })
      onAdded([created])
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Could not add widget')
    } finally {
      setLoading(null)
    }
  }

  const applyPreset = async (presetId: string) => {
    const preset = WIDGET_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setLoading(presetId)
    setError('')
    try {
      const created: Widget[] = []
      for (const w of preset.widgets) {
        if (existingTypes.has(w.type)) continue
        const spec = WIDGET_CATALOG.find((s) => s.type === w.type)
        const widget = await farmsApi.addWidget(farmId, {
          type: w.type,
          size: w.size ?? spec?.defaultSize ?? 'md',
        })
        created.push(widget)
      }
      onAdded(created)
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Could not apply preset')
    } finally {
      setLoading(null)
    }
  }

  const filtered = WIDGET_CATALOG.filter((w) => w.category === category)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Add to your farm
            </h2>
            <p className="text-sm text-neutral-500">
              Pick widgets or start with a preset pack.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-neutral-100 hover:bg-neutral-200 inline-flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-6 pt-4">
          <div className="inline-flex bg-neutral-100 rounded-full p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab('catalog')}
              className={
                'px-4 py-1.5 rounded-full transition-colors ' +
                (tab === 'catalog'
                  ? 'bg-[#caf26b] text-neutral-900 font-medium shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900')
              }
            >
              Widget catalog
            </button>
            <button
              type="button"
              onClick={() => setTab('presets')}
              className={
                'px-4 py-1.5 rounded-full transition-colors ' +
                (tab === 'presets'
                  ? 'bg-[#caf26b] text-neutral-900 font-medium shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900')
              }
            >
              Presets
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === 'catalog' ? (
          <div className="flex-1 flex min-h-0">
            <aside className="w-44 border-r border-neutral-200 py-4 px-2 overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={
                    'w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ' +
                    (category === cat
                      ? 'bg-[#caf26b]/40 text-[#3a7d1f] font-medium'
                      : 'text-neutral-600 hover:bg-neutral-50')
                  }
                >
                  {cat}
                </button>
              ))}
            </aside>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((spec) => {
                  const already = existingTypes.has(spec.type)
                  const Icon = spec.Icon
                  return (
                    <div
                      key={spec.type}
                      className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-neutral-900">{spec.title}</h4>
                          <p className="text-xs text-neutral-500 mt-0.5">{spec.description}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={already || loading === spec.type}
                        onClick={() => addOne(spec)}
                        className={
                          'mt-3 inline-flex items-center justify-center gap-1 rounded-full text-xs font-medium px-3 py-1.5 transition-colors ' +
                          (already
                            ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                            : 'bg-[#caf26b] text-neutral-900 hover:bg-[#bce855]')
                        }
                      >
                        {already ? 'Already added' : loading === spec.type ? 'Adding…' : (
                          <>
                            <Plus className="h-3 w-3" />
                            Add widget
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {WIDGET_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col"
                >
                  <div className="h-9 w-9 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 font-semibold text-neutral-900">{preset.name}</h4>
                  <p className="text-sm text-neutral-500 mt-1">{preset.description}</p>
                  <ul className="mt-3 flex flex-wrap gap-1">
                    {preset.widgets.map((w) => {
                      const spec = WIDGET_CATALOG.find((s) => s.type === w.type)
                      return (
                        <li
                          key={w.type}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
                        >
                          {spec?.title ?? w.type}
                        </li>
                      )
                    })}
                  </ul>
                  <button
                    type="button"
                    disabled={loading === preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className="mt-4 inline-flex items-center justify-center gap-1 rounded-full text-sm font-medium px-4 py-2 bg-[#caf26b] text-neutral-900 hover:bg-[#bce855] transition-colors"
                  >
                    {loading === preset.id ? 'Applying…' : 'Apply preset'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,  )
}