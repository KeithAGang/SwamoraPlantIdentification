import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Edit2, Leaf, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppShell } from '@/components/AppShell'
import { AddFarmDialog } from '@/components/farms/AddFarmDialog'
import { AddWidgetDialog } from '@/components/farms/AddWidgetDialog'
import { WidgetGrid } from '@/components/farms/WidgetGrid'
import { SaviDialog } from '@/components/SaviDialog'
import { useFarmsStore } from '@/store/farmsStore'
import { farmsApi, type Farm, type Widget } from '@/lib/farms'

export const Route = createFileRoute('/farms/$farmId')({
  component: FarmDetailPage,
})

function FarmDetailPage() {
  const ready = useAuthGuard()
  const { farmId: farmIdParam } = useParams({ from: '/farms/$farmId' })
  const farmId = Number(farmIdParam)
  const navigate = useNavigate()
  const { farms, widgets, refreshFarm, loadWidgets, setWidgets, updateFarmLocal, removeFarmLocal } = useFarmsStore()

  const [editOpen, setEditOpen] = useState(false)
  const [addWidgetOpen, setAddWidgetOpen] = useState(false)
  const [saviOpen, setSaviOpen] = useState(false)
  const [error, setError] = useState('')

  const farm = farms.find((f) => f.id === farmId) ?? null
  const farmWidgets = widgets[farmId] ?? []

  useEffect(() => {
    if (!ready || !Number.isFinite(farmId)) return
    refreshFarm(farmId).catch(() => setError('Farm not found'))
    loadWidgets(farmId).catch(() => {})
  }, [ready, farmId, refreshFarm, loadWidgets])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  if (error || !Number.isFinite(farmId)) {
    return (
      <AppShell>
        <div className="glass-card rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold">Farm not found</h2>
          <Link to="/dashboard" className="text-sm text-[#3a7d1f] mt-2 inline-block">
            Back to My Farms
          </Link>
        </div>
      </AppShell>
    )
  }

  const handleSaved = (updated: Farm) => {
    updateFarmLocal(updated)
  }

  const handleDelete = async () => {
    if (!farm) return
    if (!window.confirm(`Delete "${farm.name}"? This removes all its widgets.`)) return
    removeFarmLocal(farm.id)
    try {
      await farmsApi.remove(farm.id)
    } catch {
      // best-effort
    }
    navigate({ to: '/dashboard' })
  }

  const handleWidgetsAdded = (added: Widget[]) => {
    setWidgets(farmId, [...farmWidgets, ...added])
  }

  return (
    <AppShell>
      {/* Farm header */}
      <div className="relative overflow-hidden rounded-3xl mb-6">
        <div className="relative h-44 md:h-56">
          {farm?.coverImage && (
            <img src={farm.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/15" />
          <div className="relative h-full flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                My Farms
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-white"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
            <div className="text-white">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{farm?.name ?? 'Farm'}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/85">
                {farm?.cropType && (
                  <span className="inline-flex items-center gap-1.5">
                    <Leaf className="h-3.5 w-3.5" />
                    {farm.cropType}
                  </span>
                )}
                {farm?.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {farm.location}
                  </span>
                )}
                <span className="text-white/65">
                  {farmWidgets.length} widget{farmWidgets.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="text-sm text-muted-foreground">
          Drag widgets to rearrange. Use the ⋯ menu to resize or remove.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSaviOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 border border-neutral-200 hover:bg-neutral-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#3a7d1f]" />
            Ask Savi about this farm
          </button>
          <button
            type="button"
            onClick={() => setAddWidgetOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-4 pr-1.5 py-1.5 text-sm font-medium shadow-sm hover:bg-[#bce855]"
          >
            <span>Add widget</span>
            <span className="h-7 w-7 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>

      {farmWidgets.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 md:p-14 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
            <Plus className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl md:text-2xl font-semibold tracking-tight">
            Track something on this farm
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Add widgets like soil moisture, weather outlook, irrigation schedule, or disease risk to start monitoring.
          </p>
          <button
            type="button"
            onClick={() => setAddWidgetOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-5 pr-1.5 py-1.5 text-sm font-medium shadow-sm hover:bg-[#bce855]"
          >
            <span>Add a widget</span>
            <span className="h-7 w-7 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      ) : (
        <WidgetGrid
          farmId={farmId}
          widgets={farmWidgets}
          onChange={(next) => setWidgets(farmId, next)}
        />
      )}

      {farm && (
        <AddFarmDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
          initial={farm}
        />
      )}
      <AddWidgetDialog
        open={addWidgetOpen}
        onClose={() => setAddWidgetOpen(false)}
        farmId={farmId}
        existing={farmWidgets}
        onAdded={handleWidgetsAdded}
      />
      <SaviDialog
        open={saviOpen}
        onClose={() => setSaviOpen(false)}
        farmId={farmId}
        starters={
          farm
            ? [
                `Give me an overview of ${farm.name}.`,
                `What should I do today on ${farm.name}?`,
                `Any disease or pest risks for ${farm.cropType ?? 'my crop'}?`,
                'Suggest widgets I should add to track this farm better.',
              ]
            : undefined
        }
      />
    </AppShell>
  )
}
