import { PLANT_TYPES, type PlantType } from '@/lib/diagnose'
import { cn } from '@/lib/utils'

interface PlantTypePickerProps {
  value: PlantType
  onChange: (next: PlantType) => void
  disabled?: boolean
}

const LABELS: Record<PlantType, string> = {
  potato: 'Potato',
  tomato: 'Tomato',
  maize: 'Maize',
}

export function PlantTypePicker({ value, onChange, disabled }: PlantTypePickerProps) {
  return (
    <div className="w-full">
      <span className="text-xs font-medium text-muted-foreground">Plant type</span>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {PLANT_TYPES.map((p) => {
          const active = p === value
          return (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p)}
              className={cn(
                'h-9 rounded-md border text-sm transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-foreground hover:bg-muted/50',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {LABELS[p]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
