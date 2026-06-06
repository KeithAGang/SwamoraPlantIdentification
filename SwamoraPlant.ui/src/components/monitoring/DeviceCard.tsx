import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MonitoringDevice {
  id: string
  name: string
  type: 'Sensor' | 'Camera'
  status: 'online' | 'warning'
  signal?: string
}

export function DeviceCard({ device }: { device: MonitoringDevice }) {
  const isWarning = device.status === 'warning'
  return (
    <div className="rounded-2xl bg-card border border-border p-3.5 shadow-paper">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full shrink-0',
              isWarning ? 'bg-amber-500' : 'bg-primary',
            )}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{device.name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              #{device.id} · {device.type}
            </div>
          </div>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>

      {device.signal && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="truncate">{device.signal}</span>
        </div>
      )}
    </div>
  )
}
