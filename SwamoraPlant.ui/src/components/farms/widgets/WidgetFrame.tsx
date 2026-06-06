import { type ReactNode, useState, useRef, useEffect } from 'react'
import {
  GripVertical,
  MoreVertical,
  Trash2,
  Maximize2,
  Minimize2,
  Settings2,
  Database,
  Radio,
  Globe,
  Hash,
  PenSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Widget } from '@/lib/farms'

interface WidgetFrameProps {
  widget: Widget
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
  dragHandleProps?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  isDragging?: boolean
  onRemove?: () => void
  onResize?: (size: Widget['size']) => void
  onConfigureSource?: () => void
}

const SOURCE_META: Record<
  string,
  { label: string; Icon: typeof Database; tone: string }
> = {
  mock: { label: 'Demo', Icon: Database, tone: 'bg-neutral-100 text-neutral-600' },
  mqtt: { label: 'MQTT', Icon: Radio, tone: 'bg-indigo-100 text-indigo-700' },
  http: { label: 'HTTP', Icon: Globe, tone: 'bg-sky-100 text-sky-700' },
  blynk: { label: 'Blynk', Icon: Hash, tone: 'bg-emerald-100 text-emerald-700' },
  manual: { label: 'Manual', Icon: PenSquare, tone: 'bg-amber-100 text-amber-700' },
}

export function WidgetFrame({
  widget,
  title,
  icon,
  children,
  className,
  dragHandleProps,
  dragAttributes,
  isDragging,
  onRemove,
  onResize,
  onConfigureSource,
}: WidgetFrameProps) {
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

  const canGrow = widget.size !== 'xl'
  const canShrink = widget.size !== 'sm'

  return (
    <section
      className={cn(
        'glass-card rounded-2xl p-4 relative group transition-shadow',
        isDragging && 'shadow-2xl ring-2 ring-[#caf26b]/60',
        className,
      )}
    >
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="glass-pill h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block">{title}</span>
            <SourcePill source={widget.dataSource} onClick={onConfigureSource} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Drag"
            className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
            {...dragHandleProps}
            {...dragAttributes}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Widget options"
              onClick={() => setMenuOpen((o) => !o)}
              className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-48 rounded-xl bg-white shadow-lg border border-neutral-200 py-1 text-sm">
                {onConfigureSource && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2"
                    onClick={() => {
                      onConfigureSource()
                      setMenuOpen(false)
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure source
                  </button>
                )}
                {onConfigureSource && <div className="my-1 border-t border-neutral-100" />}
                {onResize && canGrow && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2"
                    onClick={() => {
                      const order: Widget['size'][] = ['sm', 'md', 'lg', 'xl']
                      const next = order[Math.min(order.indexOf(widget.size) + 1, 3)]
                      onResize(next)
                      setMenuOpen(false)
                    }}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Make larger
                  </button>
                )}
                {onResize && canShrink && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2"
                    onClick={() => {
                      const order: Widget['size'][] = ['sm', 'md', 'lg', 'xl']
                      const next = order[Math.max(order.indexOf(widget.size) - 1, 0)]
                      onResize(next)
                      setMenuOpen(false)
                    }}
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    Make smaller
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                    onClick={() => {
                      onRemove()
                      setMenuOpen(false)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mt-2">{children}</div>
    </section>
  )
}

function SourcePill({
  source,
  onClick,
}: {
  source: string
  onClick?: () => void
}) {
  const meta = SOURCE_META[source] ?? SOURCE_META.mock
  const Icon = meta.Icon
  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide leading-none',
        meta.tone,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  )
  if (!onClick) return <span className="mt-0.5 inline-block">{content}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      title="Configure data source"
      className="mt-0.5 inline-flex hover:opacity-80 transition-opacity"
    >
      {content}
    </button>
  )
}
