import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  Download,
  Leaf,
  Lightbulb,
  LogOut,
  Moon,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Droplets,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/components/theme-provider'
import { SaviDialog } from '@/components/SaviDialog'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: typeof Leaf
}

// Icon-only vertical rail. Routes are remapped to existing app routes,
// while presenting the FarmSight iconography from the mockup.
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Leaf },
  { to: '/diagnose', label: 'Diagnose', icon: Droplets },
  { to: '/map', label: 'Controls', icon: SlidersHorizontal },
]

interface AppShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { theme, setTheme } = useTheme()

  const [saviOpen, setSaviOpen] = useState(false)
  const [openPopover, setOpenPopover] = useState<null | 'tips' | 'notifications'>(null)

  const handleLogout = () => {
    clearAuth()
    navigate({ to: '/' })
  }

  const handleDownload = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      user: user?.email ?? 'guest',
      summary: {
        crops: ['potato', 'tomato', 'maize'],
        soilMoisture: '68%',
        weather: { temperature: 28, condition: 'Cloudy' },
        projectedYieldIncrease: '16%',
      },
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `farmsight-report-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen w-full">
      {/* Outer padding to expose the lush gradient background */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Glassy frame that contains the entire app */}
        <div className="glass-card bg-leaves rounded-[28px] overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 sm:px-6 py-4">
            {/* Logo + title */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <div className="glass-pill h-11 w-11 rounded-2xl flex items-center justify-center">
                <LogoMark />
              </div>
              <span className="hidden sm:block text-base md:text-lg font-semibold tracking-tight">
                FarmSight
              </span>
            </Link>

            {/* Spacer to keep right cluster aligned to the edge */}
            <div className="flex-1" />

            {/* Right cluster */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSaviOpen(true)}
                className="ai-pill hidden sm:inline-flex items-center gap-1.5 rounded-full h-9 px-3 text-sm font-medium hover:brightness-105 active:translate-y-px transition-all"
                aria-label="Open Savi"
              >
                <Sparkles className="h-4 w-4" />
                Savi
              </button>
              <PopoverIconButton
                aria="Tips"
                open={openPopover === 'tips'}
                onToggle={() =>
                  setOpenPopover((p) => (p === 'tips' ? null : 'tips'))
                }
                onClose={() => setOpenPopover(null)}
                content={<TipsPopover onAskSavi={() => { setOpenPopover(null); setSaviOpen(true) }} />}
              >
                <Lightbulb className="h-4 w-4" />
              </PopoverIconButton>
              <IconButton aria="Downloads" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </IconButton>
              <PopoverIconButton
                aria="Notifications"
                open={openPopover === 'notifications'}
                onToggle={() =>
                  setOpenPopover((p) =>
                    p === 'notifications' ? null : 'notifications',
                  )
                }
                onClose={() => setOpenPopover(null)}
                content={<NotificationsPopover />}
                badge
              >
                <Bell className="h-4 w-4" />
              </PopoverIconButton>
              <IconButton
                aria="Dark"
                active={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" />
              </IconButton>
              <IconButton
                aria="Light"
                active={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" />
              </IconButton>
            </div>
          </header>

          {/* Body: sidebar rail + main */}
          <div className="flex gap-4 px-4 sm:px-6 pb-6">
            {/* Vertical icon rail */}
            <aside className="hidden md:flex flex-col items-center justify-between py-2">
              <nav className="flex flex-col gap-3">
                {NAV.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.to
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={item.label}
                      aria-label={item.label}
                      className={cn(
                        'h-11 w-11 rounded-2xl flex items-center justify-center transition-colors',
                        active
                          ? 'bg-[oklch(0.78_0.18_145)] text-[oklch(0.18_0.06_145)] shadow-[0_6px_18px_rgba(98,200,88,0.35)]'
                          : 'glass-pill text-foreground/70 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  )
                })}
              </nav>
              <div className="flex flex-col items-center gap-3">
                <Link
                  to="/settings"
                  aria-label="Settings"
                  className="glass-pill h-11 w-11 rounded-2xl flex items-center justify-center text-foreground/70 hover:text-foreground"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="h-11 w-11 rounded-full overflow-hidden border border-white/70 shadow-[0_2px_8px_rgba(20,40,30,0.12)] bg-[oklch(0.94_0.04_145)] text-[oklch(0.24_0.06_145)] flex items-center justify-center text-sm font-semibold"
                >
                  {initial}
                </button>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>

      {/* Savi chat dialog */}
      <SaviDialog open={saviOpen} onClose={() => setSaviOpen(false)} />

      {/* Global floating Savi button — visible on every page. On the diagnose
          page this is duplicated inline, but the FAB stays as a fast escape
          hatch from elsewhere in the app. */}
      <button
        type="button"
        onClick={() => setSaviOpen(true)}
        aria-label="Ask Savi"
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 ai-pill h-12 w-12 md:h-14 md:w-auto md:px-5 rounded-full inline-flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(20,40,30,0.25)] hover:brightness-105 active:translate-y-px transition-all"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden md:inline text-sm font-semibold">Ask Savi</span>
      </button>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-white/40 bg-white/70 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-stretch justify-around">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.to
            return (
              <li key={item.to} className="flex-1 min-w-0">
                <Link
                  to={item.to}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="leading-none truncate max-w-full px-1">{item.label}</span>
                </Link>
              </li>
            )
          })}
          <li className="flex-1 min-w-0">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

interface IconButtonProps {
  children: ReactNode
  aria: string
  onClick?: () => void
  active?: boolean
  badge?: boolean
}

function IconButton({ children, aria, onClick, active, badge }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={cn(
        'glass-pill h-9 w-9 rounded-full hidden sm:inline-flex items-center justify-center transition-colors relative',
        active
          ? 'ring-2 ring-[oklch(0.72_0.21_145)] text-foreground'
          : 'hover:bg-white/90 text-foreground/80',
      )}
    >
      {children}
      {badge && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[oklch(0.68_0.22_32)] ring-2 ring-white" />
      )}
    </button>
  )
}

interface PopoverIconButtonProps extends IconButtonProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
  content: ReactNode
}

function PopoverIconButton({
  children,
  aria,
  open,
  onToggle,
  onClose,
  content,
  badge,
}: PopoverIconButtonProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      <IconButton aria={aria} onClick={onToggle} active={open} badge={badge}>
        {children}
      </IconButton>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-40 glass-card rounded-2xl p-3 shadow-[0_18px_40px_rgba(20,40,30,0.18)]">
          {content}
        </div>
      )}
    </div>
  )
}

function TipsPopover({ onAskSavi }: { onAskSavi: () => void }) {
  const tips = [
    'Snap a clean, well-lit leaf on the Diagnose page for best results.',
    'Check Soil Condition daily to catch moisture dips early.',
    'Use the Map to drop pins for trouble spots you want to revisit.',
    'Ask Savi for crop-specific treatment plans anytime.',
  ]
  return (
    <div>
      <header className="flex items-center gap-2 px-1 pb-2">
        <div className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center">
          <Lightbulb className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">Tips</h3>
      </header>
      <ul className="space-y-1.5">
        {tips.map((t) => (
          <li
            key={t}
            className="text-[12px] leading-relaxed text-foreground/80 rounded-lg px-2 py-1.5 hover:bg-white/60"
          >
            {t}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAskSavi}
        className="mt-2 w-full ai-pill rounded-full h-8 text-xs font-medium inline-flex items-center justify-center gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask Savi
      </button>
    </div>
  )
}

function NotificationsPopover() {
  const items = [
    {
      title: 'Tomato leaf flagged',
      body: 'Possible early blight detected this morning.',
      time: '2h',
    },
    {
      title: 'Soil moisture low',
      body: 'Zone 3 dropped to 32%. Consider irrigation.',
      time: '5h',
    },
    {
      title: 'Weather alert',
      body: 'Light rain expected tomorrow afternoon.',
      time: '1d',
    },
  ]
  return (
    <div>
      <header className="flex items-center gap-2 px-1 pb-2">
        <div className="glass-pill h-7 w-7 rounded-lg flex items-center justify-center">
          <Bell className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">Notifications</h3>
      </header>
      <ul className="space-y-1.5">
        {items.map((n) => (
          <li
            key={n.title}
            className="rounded-lg px-2 py-1.5 hover:bg-white/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium truncate">{n.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 11.5 12 5l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-7.5Z"
        stroke="oklch(0.4 0.14 145)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 9c.5 1.4 1.6 2.4 3 2.5-.2 1.6-1.4 2.8-3 3-1.6-.2-2.8-1.4-3-3 1.4-.1 2.5-1.1 3-2.5Z"
        fill="oklch(0.6 0.2 145)"
      />
    </svg>
  )
}
