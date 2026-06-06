import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Widget } from '@/lib/farms'
import { farmsApi } from '@/lib/farms'
import { cn } from '@/lib/utils'
import { WidgetFrame } from './widgets/WidgetFrame'
import { getWidgetSpec } from './widgets/registry'
import { WidgetSourceDialog, type WidgetSource } from './WidgetSourceDialog'

interface WidgetGridProps {
  farmId: number
  widgets: Widget[]
  onChange: (widgets: Widget[]) => void
}

const SIZE_CLASSES: Record<Widget['size'], string> = {
  sm: 'col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3',
  md: 'col-span-12 sm:col-span-6 lg:col-span-4',
  lg: 'col-span-12 lg:col-span-6',
  xl: 'col-span-12',
}

export function WidgetGrid({ farmId, widgets, onChange }: WidgetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = useMemo(() => widgets.map((w) => w.id), [widgets])
  const [configuringId, setConfiguringId] = useState<number | null>(null)
  const configuring = widgets.find((w) => w.id === configuringId) ?? null

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = widgets.findIndex((w) => w.id === active.id)
    const newIndex = widgets.findIndex((w) => w.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({
      ...w,
      position: i,
    }))
    onChange(next)
    try {
      await farmsApi.reorderWidgets(
        farmId,
        next.map((w) => w.id),
      )
    } catch {
      // best-effort; UI already reflects the desired order
    }
  }

  const handleRemove = async (widgetId: number) => {
    const next = widgets.filter((w) => w.id !== widgetId)
    onChange(next)
    try {
      await farmsApi.removeWidget(farmId, widgetId)
    } catch {
      // ignore — could re-fetch on error in future
    }
  }

  const handleResize = async (widgetId: number, size: Widget['size']) => {
    const next = widgets.map((w) => (w.id === widgetId ? { ...w, size } : w))
    onChange(next)
    try {
      await farmsApi.updateWidget(farmId, widgetId, { size })
    } catch {
      // ignore
    }
  }

  const handleSaveSource = async (
    widgetId: number,
    dataSource: WidgetSource,
    config: Record<string, unknown>,
  ) => {
    const next = widgets.map((w) =>
      w.id === widgetId ? { ...w, dataSource, config } : w,
    )
    onChange(next)
    try {
      await farmsApi.updateWidget(farmId, widgetId, { dataSource, config })
    } catch {
      // ignore — UI already reflects the optimistic change
    }
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-12 gap-4">
            {widgets.map((w) => (
              <SortableWidget
                key={w.id}
                widget={w}
                onRemove={() => handleRemove(w.id)}
                onResize={(size) => handleResize(w.id, size)}
                onConfigureSource={() => setConfiguringId(w.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {configuring && (
        <WidgetSourceDialog
          open={configuringId !== null}
          widget={configuring}
          onClose={() => setConfiguringId(null)}
          onSave={(dataSource, config) =>
            handleSaveSource(configuring.id, dataSource, config)
          }
        />
      )}
    </>
  )
}

function SortableWidget({
  widget,
  onRemove,
  onResize,
  onConfigureSource,
}: {
  widget: Widget
  onRemove: () => void
  onResize: (size: Widget['size']) => void
  onConfigureSource: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }
  const spec = getWidgetSpec(widget.type)
  if (!spec) return null
  const Icon = spec.Icon
  const Body = spec.Body

  return (
    <div ref={setNodeRef} style={style} className={cn(SIZE_CLASSES[widget.size])}>
      <WidgetFrame
        widget={widget}
        title={widget.title ?? spec.title}
        icon={<Icon className="h-4 w-4" />}
        dragHandleProps={listeners as unknown as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        isDragging={isDragging}
        onRemove={onRemove}
        onResize={onResize}
        onConfigureSource={onConfigureSource}
      >
        <Body widget={widget} />
      </WidgetFrame>
    </div>
  )
}
