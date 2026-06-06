import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import {
  LogOut,
  Pencil,
  Check,
  X,
  Leaf,
  MapPin,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Sprout,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useFarmsStore } from '@/store/farmsStore'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/settings')({
  component: ProfilePage,
})

function ProfilePage() {
  const ready = useAuthGuard()
  const { user, token, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const {
    farms,
    loaded: farmsLoaded,
    widgets,
    loadFarms,
    loadWidgets,
  } = useFarmsStore()

  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(user?.name ?? '')

  useEffect(() => {
    if (ready && !farmsLoaded) loadFarms()
  }, [ready, farmsLoaded, loadFarms])

  // Lazily fetch widget counts so the "Widgets" stat is accurate.
  useEffect(() => {
    if (!farmsLoaded) return
    farms.forEach((f) => {
      if (!widgets[f.id]) loadWidgets(f.id).catch(() => {})
    })
  }, [farms, farmsLoaded, widgets, loadWidgets])

  const totalWidgets = useMemo(
    () => Object.values(widgets).reduce((sum, list) => sum + list.length, 0),
    [widgets],
  )

  const cropTypes = useMemo(() => {
    const set = new Set<string>()
    farms.forEach((f) => f.cropType && set.add(f.cropType))
    return Array.from(set)
  }, [farms])

  const memberSince = useMemo(() => {
    // No createdAt on AuthUser — use earliest farm createdAt as a friendly proxy.
    const earliest = farms
      .map((f) => f.createdAt)
      .filter(Boolean)
      .sort()[0]
    if (!earliest) return null
    return new Date(earliest)
  }, [farms])

  if (!ready) return null

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  const handleLogout = () => {
    clearAuth()
    navigate({ to: '/' })
  }

  const handleSaveName = () => {
    const trimmed = nameDraft.trim()
    if (!user || !token || !trimmed || trimmed === user.name) {
      setEditing(false)
      setNameDraft(user?.name ?? '')
      return
    }
    // No profile-update endpoint yet — persist locally so the UI is consistent.
    setAuth({ ...user, name: trimmed }, token)
    setEditing(false)
  }

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Hero / identity card */}
        <section className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7">
          {/* Decorative bubbles */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(60% 80% at 0% 0%, rgba(124, 200, 110, 0.32) 0%, rgba(124, 200, 110, 0) 60%),' +
                'radial-gradient(50% 70% at 100% 0%, rgba(176, 232, 116, 0.28) 0%, rgba(176, 232, 116, 0) 65%),' +
                'radial-gradient(60% 80% at 100% 100%, rgba(72, 160, 110, 0.22) 0%, rgba(72, 160, 110, 0) 65%)',
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-7">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#caf26b] via-[#7cd06a] to-[#3b9b6a] blur-[6px] opacity-60" />
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-white text-[oklch(0.24_0.06_145)] border border-white/80 shadow-[0_10px_30px_rgba(20,40,30,0.18)] flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  {initials}
                </span>
              </div>
              <span
                aria-label="Online"
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-[#62c858] border-2 border-white shadow"
              />
            </div>

            {/* Identity + edit name */}
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-foreground/60">
                Farm owner
              </div>

              {!editing ? (
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                    {user?.name || 'Unnamed grower'}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(user?.name ?? '')
                      setEditing(true)
                    }}
                    className="glass-pill rounded-full h-8 w-8 inline-flex items-center justify-center text-foreground/70 hover:text-foreground"
                    aria-label="Edit name"
                    title="Edit name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2 max-w-md">
                  <input
                    autoFocus
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') {
                        setEditing(false)
                        setNameDraft(user?.name ?? '')
                      }
                    }}
                    className="glass-pill flex-1 rounded-full h-10 px-4 outline-none text-base font-medium"
                    placeholder="Your name"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    aria-label="Save"
                    className="h-10 w-10 rounded-full bg-[#caf26b] text-neutral-900 inline-flex items-center justify-center hover:bg-[#bce855] shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false)
                      setNameDraft(user?.name ?? '')
                    }}
                    aria-label="Cancel"
                    className="glass-pill h-10 w-10 rounded-full inline-flex items-center justify-center text-foreground/70 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5 text-sm text-foreground/70">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{user?.email}</span>
              </div>

              {/* Stat tiles */}
              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 max-w-lg">
                <StatTile label="Farms" value={String(farms.length)} />
                <StatTile label="Widgets" value={String(totalWidgets)} />
                <StatTile
                  label="Member since"
                  value={
                    memberSince
                      ? memberSince.toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Lower grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile details */}
          <section className="glass-card rounded-2xl p-5 lg:col-span-2">
            <SectionHeader title="Profile details" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Full name" value={user?.name || '—'} />
              <Field label="Email" value={user?.email || '—'} />
              <Field label="Account type" value="Farm owner" />
              <Field
                label="User ID"
                value={user?.id ? `#${user.id}` : '—'}
                mono
              />
            </div>

            {user?.isAdmin && (
              <Link
                to="/admin"
                className="mt-5 group flex items-center gap-3 rounded-2xl p-4 bg-gradient-to-br from-[#caf26b]/40 via-[#caf26b]/20 to-white border border-[#caf26b]/50 hover:border-[#3a7d1f]/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-neutral-900 text-[#caf26b] flex items-center justify-center shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">Admin dashboard</div>
                  <div className="text-xs text-foreground/60">
                    Manage users, farms and platform activity
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-foreground/40 group-hover:text-foreground/70 transition-colors" />
              </Link>
            )}

            <SectionHeader title="My farms" className="mt-7" />
            {farms.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-foreground/15 p-4 text-sm text-foreground/60">
                You haven't added any farms yet.{' '}
                <Link
                  to="/dashboard"
                  className="text-[oklch(0.48_0.16_145)] hover:underline font-medium"
                >
                  Add your first farm
                </Link>
                .
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-foreground/10">
                {farms.map((f) => (
                  <li key={f.id} className="py-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[oklch(0.94_0.04_145)] text-[oklch(0.24_0.06_145)] flex items-center justify-center">
                      <Sprout className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-foreground/60 flex items-center gap-2 truncate">
                        {f.cropType && (
                          <span className="inline-flex items-center gap-1">
                            <Leaf className="h-3 w-3" />
                            {f.cropType}
                          </span>
                        )}
                        {f.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {f.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/farms/$farmId"
                      params={{ farmId: String(f.id) }}
                      className="glass-pill rounded-full h-8 w-8 inline-flex items-center justify-center text-foreground/70 hover:text-foreground"
                      aria-label={`Open ${f.name}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {cropTypes.length > 0 && (
              <>
                <SectionHeader title="Crops you grow" className="mt-7" />
                <div className="mt-3 flex flex-wrap gap-2">
                  {cropTypes.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.94_0.04_145)] text-[oklch(0.24_0.06_145)] px-3 py-1 text-xs font-medium"
                    >
                      <Leaf className="h-3 w-3" />
                      {c}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Right column */}
          <div className="space-y-5">
            {/* Preferences */}
            <section className="glass-card rounded-2xl p-5">
              <SectionHeader title="Preferences" />
              <div className="mt-3">
                <div className="text-xs text-foreground/60 mb-2">Theme</div>
                <div className="glass-pill rounded-full p-1 inline-flex items-center gap-1">
                  <ThemeChip
                    active={theme === 'light'}
                    onClick={() => setTheme('light')}
                    icon={<Sun className="h-3.5 w-3.5" />}
                    label="Light"
                  />
                  <ThemeChip
                    active={theme === 'dark'}
                    onClick={() => setTheme('dark')}
                    icon={<Moon className="h-3.5 w-3.5" />}
                    label="Dark"
                  />
                  <ThemeChip
                    active={theme === 'system'}
                    onClick={() => setTheme('system')}
                    icon={<Monitor className="h-3.5 w-3.5" />}
                    label="System"
                  />
                </div>
              </div>
            </section>

            {/* Quick actions */}
            <section className="glass-card rounded-2xl p-5">
              <SectionHeader title="Quick actions" />
              <div className="mt-3 grid grid-cols-1 gap-2">
                <QuickAction
                  to="/diagnose"
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Diagnose a plant"
                  hint="Scan leaves for disease"
                />
                <QuickAction
                  to="/dashboard"
                  icon={<Leaf className="h-4 w-4" />}
                  label="My farms"
                  hint="Open the dashboard"
                />
                <QuickAction
                  to="/map"
                  icon={<MapPin className="h-4 w-4" />}
                  label="Farm map"
                  hint="See where your farms sit"
                />
              </div>
            </section>

            {/* Session */}
            <section className="glass-card rounded-2xl p-5">
              <SectionHeader title="Session" />
              <p className="text-xs text-foreground/60 mt-1">
                Sign out of this device. You'll need to log in again to access
                your dashboard.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="mt-3 gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

interface StatTileProps {
  label: string
  value: string
}

function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="glass-pill rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-foreground/60">
        {label}
      </div>
      <div className="text-lg sm:text-xl font-semibold tracking-tight mt-0.5 truncate">
        {value}
      </div>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  className?: string
}

function SectionHeader({ title, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  mono?: boolean
}

function Field({ label, value, mono }: FieldProps) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-foreground/55">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-sm font-medium truncate',
          mono && 'font-mono text-foreground/80',
        )}
      >
        {value}
      </div>
    </div>
  )
}

interface ThemeChipProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ThemeChip({ active, onClick, icon, label }: ThemeChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-[oklch(0.78_0.18_145)] text-[oklch(0.18_0.06_145)] shadow-sm'
          : 'text-foreground/70 hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

interface QuickActionProps {
  to: '/diagnose' | '/dashboard' | '/map'
  icon: React.ReactNode
  label: string
  hint: string
}

function QuickAction({ to, icon, label, hint }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl glass-pill px-3 py-2.5 hover:bg-white/90 transition-colors"
    >
      <div className="h-8 w-8 rounded-lg bg-[oklch(0.94_0.04_145)] text-[oklch(0.24_0.06_145)] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-xs text-foreground/60 leading-tight">{hint}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-foreground/40 group-hover:text-foreground/70 transition-colors" />
    </Link>
  )
}
