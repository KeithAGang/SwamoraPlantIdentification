import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, MapPin, Leaf } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Farm } from '@/lib/farms'
import { farmsApi } from '@/lib/farms'

interface AddFarmDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (farm: Farm) => void
  initial?: Farm | null
}

const COVER_OPTIONS = [
  'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=900&q=70',
]

export function AddFarmDialog({
  open,
  onClose,
  onSaved,
  initial = null,
}: AddFarmDialogProps) {
  const [name, setName] = useState('')
  const [cropType, setCropType] = useState('')
  const [location, setLocation] = useState('')
  const [cover, setCover] = useState(COVER_OPTIONS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setCropType(initial?.cropType ?? '')
      setLocation(initial?.location ?? '')
      setCover(initial?.coverImage ?? COVER_OPTIONS[0])
      setError('')
      setLoading(false)
    }
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        cropType: cropType.trim() || null,
        location: location.trim() || null,
        coverImage: cover,
      }
      const farm = initial
        ? await farmsApi.update(initial.id, payload)
        : await farmsApi.create(payload)
      onSaved(farm)
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Could not save the farm')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl p-7 sm:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="sticky top-0 float-right h-9 w-9 rounded-full bg-neutral-100 hover:bg-neutral-200 inline-flex items-center justify-center -mr-2 -mt-2 z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
            <Leaf className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            {initial ? 'Edit farm' : 'Add a new farm'}
          </h2>
        </div>
        <p className="text-sm text-neutral-500">
          Name the place, choose a cover, and you can start adding widgets next.
        </p>

        {error && (
          <div className="mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="farm-name" className="text-sm font-medium text-neutral-800">
              Farm name
            </Label>
            <Input
              id="farm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North Field Greenhouse"
              required
              className="h-11 rounded-xl px-3"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="farm-crop" className="text-sm font-medium text-neutral-800">
                Crop type
              </Label>
              <Input
                id="farm-crop"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="Tomato, Maize, Potato…"
                className="h-11 rounded-xl px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-location" className="text-sm font-medium text-neutral-800">
                Location
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="farm-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Harare, Zimbabwe"
                  className="h-11 rounded-xl pl-9 pr-3"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-neutral-800">Cover image</Label>
            <div className="grid grid-cols-3 gap-2">
              {COVER_OPTIONS.map((url) => {
                const active = cover === url
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setCover(url)}
                    className={
                      'relative h-20 rounded-lg overflow-hidden border-2 transition bg-neutral-100 ' +
                      (active ? 'border-[#3a7d1f] ring-2 ring-[#caf26b]/60' : 'border-transparent hover:border-neutral-300')
                    }
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget
                        img.style.display = 'none'
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-[#caf26b] text-neutral-900 font-medium hover:bg-[#bce855] shadow-sm"
          >
            {loading ? 'Saving…' : initial ? 'Save changes' : 'Create farm'}
          </Button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
