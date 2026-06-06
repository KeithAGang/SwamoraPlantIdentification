import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricTileProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  description?: string
  tone?: 'default' | 'primary'
  badge?: string
  className?: string
}

export function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  description,
  tone = 'default',
  badge,
  className,
}: MetricTileProps) {
  const isPrimary = tone === 'primary'

  return (
    <div
      className={cn(
        'group relative rounded-2xl p-4 shadow-paper transition-colors',
        isPrimary
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border border-border',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center',
            isPrimary ? 'bg-primary-foreground/15' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <ArrowUpRight
          className={cn(
            'h-3.5 w-3.5 transition-opacity',
            isPrimary
              ? 'text-primary-foreground/70'
              : 'text-muted-foreground opacity-0 group-hover:opacity-100',
          )}
        />
      </div>

      <div
        className={cn(
          'mt-2 text-xs',
          isPrimary ? 'text-primary-foreground/85' : 'text-foreground',
        )}
      >
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        {unit && (
          <span
            className={cn(
              'text-base font-medium',
              isPrimary ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            {unit}
          </span>
        )}
        {badge && (
          <span
            className={cn(
              'ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              isPrimary
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-primary/10 text-primary',
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {description && (
        <p
          className={cn(
            'mt-2 text-[11px] leading-snug',
            isPrimary ? 'text-primary-foreground/75' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
