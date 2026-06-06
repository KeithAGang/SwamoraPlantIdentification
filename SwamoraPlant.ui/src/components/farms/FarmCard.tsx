import { Link } from '@tanstack/react-router'
import { ArrowUpRight, MapPin, Leaf, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Farm } from '@/lib/farms'

interface FarmCardProps {
  farm: Farm
  widgetCount: number
  onEdit: () => void
  onDelete: () => void
}

export function FarmCard({ farm, widgetCount, onEdit, onDelete }: FarmCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <Link to="/farms/$farmId" params={{ farmId: String(farm.id) }} className="block">
        <div className="relative h-40 bg-neutral-100">
          {farm.coverImage && (
            <img src={farm.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-white/85 backdrop-blur text-neutral-700">
              <Leaf className="h-3 w-3 text-[#3a7d1f]" />
              {widgetCount} widget{widgetCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white text-neutral-900 inline-flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-neutral-900 truncate">{farm.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
            {farm.cropType && (
              <span className="inline-flex items-center gap-1">
                <Leaf className="h-3 w-3" />
                {farm.cropType}
              </span>
            )}
            {farm.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {farm.location}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute top-3 right-3" ref={menuRef}>
        <button
          type="button"
          aria-label="Farm options"
          onClick={(e) => {
            e.preventDefault()
            setMenuOpen((o) => !o)
          }}
          className="h-8 w-8 rounded-full bg-white/85 backdrop-blur text-neutral-700 inline-flex items-center justify-center hover:bg-white"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 z-20 w-44 rounded-xl bg-white shadow-lg border border-neutral-200 py-1 text-sm">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2"
              onClick={(e) => {
                e.preventDefault()
                setMenuOpen(false)
                onEdit()
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit farm
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
              onClick={(e) => {
                e.preventDefault()
                setMenuOpen(false)
                onDelete()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete farm
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
