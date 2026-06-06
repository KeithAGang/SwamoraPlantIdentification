import { ArrowUpRight, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MonitoringTask {
  id: string
  title: string
  description: string
  time: string
  done: boolean
}

const DEMO_TASKS: MonitoringTask[] = [
  {
    id: 't1',
    title: 'Watering',
    description: 'Water plants with 1 inch of water in the morning',
    time: '07:00 AM – 07:30 AM',
    done: true,
  },
  {
    id: 't2',
    title: 'Fertilizing',
    description: 'Apply organic fertilizer at base of plants. Quantity: 50g per plant',
    time: '08:00 AM – 10:00 AM',
    done: true,
  },
  {
    id: 't3',
    title: 'Pest Inspection',
    description: 'Check leaves for any signs of aphids or other pests',
    time: '10:00 AM – 11:00 AM',
    done: false,
  },
  {
    id: 't4',
    title: 'Soil Aeration',
    description: 'Loosen soil around the plants carefully without damaging roots',
    time: '02:00 PM – 03:00 PM',
    done: false,
  },
]

export function TaskList({ tasks = DEMO_TASKS }: { tasks?: MonitoringTask[] }) {
  const completed = tasks.filter((t) => t.done).length
  const pct = Math.round((completed / tasks.length) * 100)

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-paper">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Task</div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{pct}%</span>
          <span>
            {completed}/{tasks.length} Task Completed
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2.5">
            {t.done ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-sm font-medium',
                  t.done && 'text-muted-foreground line-through decoration-muted-foreground/40',
                )}
              >
                {t.title}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {t.description}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">{t.time}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
