import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  icon: LucideIcon
  description?: string
  tone?: 'default' | 'primary' | 'warning'
  className?: string
}

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  description,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border p-4 md:p-5 shadow-paper transition-colors',
        tone === 'primary'
          ? 'border-primary/20 bg-primary text-primary-foreground'
          : tone === 'warning'
            ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/30'
            : 'border-border bg-card',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center',
            tone === 'primary'
              ? 'bg-primary-foreground/15'
              : tone === 'warning'
                ? 'bg-amber-500/15 text-amber-600'
                : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <ArrowUpRight
          className={cn(
            'h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity',
            tone === 'primary' ? 'text-primary-foreground' : 'text-muted-foreground',
          )}
        />
      </div>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-3xl md:text-4xl font-semibold tracking-tight">{value}</span>
        {unit && (
          <span
            className={cn(
              'text-base font-medium',
              tone === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            {unit}
          </span>
        )}
      </div>

      <div className="mt-2">
        <div
          className={cn(
            'text-xs font-medium',
            tone === 'primary' ? 'text-primary-foreground/90' : 'text-foreground',
          )}
        >
          {label}
        </div>
        {description && (
          <div
            className={cn(
              'text-xs mt-1 leading-relaxed',
              tone === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  )
}
