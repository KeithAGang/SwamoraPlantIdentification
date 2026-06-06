import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Plus, Leaf } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppShell } from '@/components/AppShell'
import { AddFarmDialog } from '@/components/farms/AddFarmDialog'
import { FarmCard } from '@/components/farms/FarmCard'
import { useFarmsStore } from '@/store/farmsStore'
import { farmsApi, type Farm } from '@/lib/farms'

export const Route = createFileRoute('/dashboard')({
  component: FarmsHubPage,
})

function FarmsHubPage() {
  const ready = useAuthGuard()
  const { farms, loaded, error, widgets, loadFarms, loadWidgets, addFarmLocal, removeFarmLocal, updateFarmLocal } = useFarmsStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Farm | null>(null)

  useEffect(() => {
    if (ready) loadFarms()
  }, [ready, loadFarms])

  // Lazily load widget counts for each farm to show "n widgets" badge.
  useEffect(() => {
    if (!loaded) return
    farms.forEach((f) => {
      if (!widgets[f.id]) loadWidgets(f.id).catch(() => {})
    })
  }, [farms, loaded, widgets, loadWidgets])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  const handleSaved = (farm: Farm) => {
    if (editing) updateFarmLocal(farm)
    else addFarmLocal(farm)
    setEditing(null)
  }

  const handleDelete = async (farm: Farm) => {
    if (!window.confirm(`Delete "${farm.name}"? This removes all its widgets.`)) return
    removeFarmLocal(farm.id)
    try {
      await farmsApi.remove(farm.id)
    } catch {
      // best effort
    }
  }

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Farms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each farm has its own dashboard — add widgets to track what matters there.
          </p>
        </div>
        {farms.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-4 pr-1.5 py-1.5 text-sm font-medium shadow-sm hover:bg-[#bce855]"
          >
            <span>Add farm</span>
            <span className="h-7 w-7 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-60 rounded-2xl bg-white/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => loadFarms()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 px-4 py-1.5 text-sm font-medium hover:bg-[#bce855]"
          >
            Try again
          </button>
        </div>
      ) : farms.length === 0 ? (
        <EmptyState onCreate={() => setDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((f) => (
            <FarmCard
              key={f.id}
              farm={f}
              widgetCount={widgets[f.id]?.length ?? 0}
              onEdit={() => {
                setEditing(f)
                setDialogOpen(true)
              }}
              onDelete={() => handleDelete(f)}
            />
          ))}
        </div>
      )}

      <AddFarmDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        onSaved={handleSaved}
        initial={editing}
      />

      {/* Persistent FAB for adding more farms */}
      {farms.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          aria-label="Add farm"
          className="fixed bottom-20 md:bottom-24 right-4 md:right-6 z-30 h-14 w-14 rounded-full bg-[#caf26b] text-neutral-900 shadow-[0_12px_30px_rgba(20,40,30,0.25)] inline-flex items-center justify-center hover:bg-[#bce855] active:translate-y-px transition-all"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </AppShell>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="glass-card rounded-3xl p-10 md:p-14 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
        <Leaf className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl md:text-2xl font-semibold tracking-tight">
        No farms yet
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        Add your first farm to start building a custom dashboard. You can track
        soil, weather, irrigation, crop health, and more — your way.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-5 pr-1.5 py-1.5 text-sm font-medium shadow-sm hover:bg-[#bce855]"
      >
        <span>Add your first farm</span>
        <span className="h-7 w-7 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
          <Plus className="h-3.5 w-3.5" />
        </span>
      </button>
    </div>
  )
}
