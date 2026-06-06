import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  LogOut,
  MoreHorizontal,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Trash2,
  Upload,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useAuthStore } from '@/store/authStore'
import { adminApi } from '@/lib/admin'
import type {
  AdminDiagnosis,
  AdminFarm,
  AdminStats,
  AdminUser,
} from '@/lib/admin'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type Section =
  | 'dashboard'
  | 'users'
  | 'farms'
  | 'diagnoses'
  | 'notifications'
  | 'help'

function AdminPage() {
  const ready = useAuthGuard()
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const [section, setSection] = useState<Section>('dashboard')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [farms, setFarms] = useState<AdminFarm[]>([])
  const [diagnoses, setDiagnoses] = useState<AdminDiagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<AdminUser | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  // Reset to page 1 whenever the user changes section or refines the search.
  useEffect(() => {
    setPage(1)
  }, [section, search])

  // Pull everything on mount — small dataset, fine to load eagerly.
  useEffect(() => {
    if (!ready) return
    if (user && user.isAdmin === false) {
      navigate({ to: '/dashboard' })
      return
    }
    let alive = true
    setLoading(true)
    Promise.all([
      adminApi.stats(),
      adminApi.users(),
      adminApi.farms(),
      adminApi.diagnoses(500),
    ])
      .then(([s, u, f, d]) => {
        if (!alive) return
        setStats(s)
        setUsers(u)
        setFarms(f)
        setDiagnoses(d)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        const status = err?.response?.status
        if (status === 403) {
          setError("You don't have admin access.")
        } else if (status === 401) {
          setError('Your session expired. Please sign in again.')
        } else {
          setError('Could not load admin data.')
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [ready, user, navigate])

  const handleLogout = () => {
    clearAuth()
    navigate({ to: '/' })
  }

  const handleToggleAdmin = async (target: AdminUser) => {
    try {
      await adminApi.setAdmin(target.id, !target.isAdmin)
      setUsers((list) =>
        list.map((u) =>
          u.id === target.id ? { ...u, isAdmin: !target.isAdmin } : u,
        ),
      )
    } catch {
      setError('Could not update admin status.')
    }
  }

  const handleDeleteUser = async (target: AdminUser) => {
    if (
      !window.confirm(
        `Delete user "${target.name}"? This removes all their farms, widgets and diagnoses.`,
      )
    )
      return
    try {
      await adminApi.deleteUser(target.id)
      setUsers((list) => list.filter((u) => u.id !== target.id))
      if (selectedDetail?.id === target.id) setSelectedDetail(null)
    } catch {
      setError('Could not delete user.')
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q),
    )
  }, [users, search])

  const filteredFarms = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return farms
    return farms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.cropType ?? '').toLowerCase().includes(q) ||
        (f.location ?? '').toLowerCase().includes(q) ||
        f.ownerName.toLowerCase().includes(q) ||
        f.ownerEmail.toLowerCase().includes(q),
    )
  }, [farms, search])

  const filteredDiagnoses = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return diagnoses
    return diagnoses.filter(
      (d) =>
        d.plant.toLowerCase().includes(q) ||
        d.topLabel.toLowerCase().includes(q) ||
        d.userName.toLowerCase().includes(q) ||
        d.userEmail.toLowerCase().includes(q),
    )
  }, [diagnoses, search])

  if (!ready) return null

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 p-3 sm:p-4">
      <div className="mx-auto max-w-[1600px] flex flex-col lg:flex-row gap-4">
        {/* ============ Sidebar ============ */}
        <aside className="w-full lg:w-64 shrink-0 rounded-2xl bg-neutral-900 text-neutral-300 flex flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2 text-white">
              <div className="h-7 w-7 rounded-lg bg-[#caf26b] text-neutral-900 inline-flex items-center justify-center">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">FarmSight</span>
            </div>
            <Link
              to="/dashboard"
              title="Back to app"
              className="h-7 w-7 rounded-md hover:bg-white/5 inline-flex items-center justify-center text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {/* Search */}
          <div className="px-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 h-9">
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-neutral-500 text-neutral-200"
              />
              <kbd className="text-[10px] text-neutral-500 hidden sm:inline">⌘F</kbd>
            </div>
          </div>

          {/* Primary nav */}
          <nav className="px-2 mt-4 flex flex-col gap-0.5">
            <SidebarItem
              icon={LayoutDashboard}
              label="Dashboard"
              active={section === 'dashboard'}
              onClick={() => setSection('dashboard')}
            />
            <SidebarItem
              icon={UsersIcon}
              label="Users"
              count={stats?.totals.users}
              active={section === 'users'}
              onClick={() => setSection('users')}
            />
            <SidebarItem
              icon={Sprout}
              label="Farms"
              count={stats?.totals.farms}
              active={section === 'farms'}
              onClick={() => setSection('farms')}
            />
            <SidebarItem
              icon={Stethoscope}
              label="Diagnoses"
              count={stats?.totals.diagnoses}
              active={section === 'diagnoses'}
              onClick={() => setSection('diagnoses')}
            />
          </nav>

          {/* Divider */}
          <div className="px-4 mt-6 mb-2 text-[10px] uppercase tracking-wider text-neutral-500">
            Workspace
          </div>
          <nav className="px-2 flex flex-col gap-0.5">
            <SidebarItem
              icon={Bell}
              label="Notifications"
              active={section === 'notifications'}
              onClick={() => setSection('notifications')}
              badge={
                stats?.totals.pendingSubmissions
                  ? String(stats.totals.pendingSubmissions)
                  : undefined
              }
            />
            <SidebarItem
              icon={LifeBuoy}
              label="Help & support"
              active={section === 'help'}
              onClick={() => setSection('help')}
            />
            <Link
              to="/settings"
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <SettingsIcon className="h-4 w-4" />
              <span className="flex-1">Settings</span>
            </Link>
          </nav>

          <div className="flex-1" />

          {/* Footer profile */}
          <div className="m-3 rounded-xl bg-white/5 border border-white/5 p-2 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#caf26b] text-neutral-900 inline-flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {user?.name}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {user?.email}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="h-7 w-7 rounded-md hover:bg-white/5 inline-flex items-center justify-center text-neutral-400 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>

        {/* ============ Main + right panel ============ */}
        <div className="flex-1 min-w-0 flex flex-col xl:flex-row gap-4">
          {/* Main panel */}
          <main className="flex-1 min-w-0 rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {sectionTitle(section)}
                </h1>
                {(section === 'users' ||
                  section === 'farms' ||
                  section === 'diagnoses') && (
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Import
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white text-neutral-900 border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Export
                    </button>
                  </div>
                )}
              </div>

              {/* Filter chips — only for tabular sections */}
              {(section === 'users' ||
                section === 'farms' ||
                section === 'diagnoses') && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Chip
                    label={`Total ${pluralCount(
                      section === 'users'
                        ? filteredUsers
                        : section === 'farms'
                          ? filteredFarms
                          : filteredDiagnoses,
                      section === 'users'
                        ? users
                        : section === 'farms'
                          ? farms
                          : diagnoses,
                      section,
                    )}`}
                    solid
                  />
                  <Chip label="Status" />
                  <Chip label="Date" />
                  <Chip label="All filters" />
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
                  {error}
                </div>
              )}

              {/* Section content */}
              <div className="mt-5">
                {loading ? (
                  <SkeletonRows />
                ) : section === 'dashboard' ? (
                  <DashboardSection
                    stats={stats}
                    recentDiagnoses={diagnoses.slice(0, 8)}
                  />
                ) : section === 'users' ? (
                  <>
                    <UsersTable
                      users={paginate(filteredUsers, page, PAGE_SIZE)}
                      currentUserId={user?.id ?? -1}
                      onToggleAdmin={handleToggleAdmin}
                      onDelete={handleDeleteUser}
                      onSelect={setSelectedDetail}
                    />
                    <Pagination
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={filteredUsers.length}
                      onChange={setPage}
                    />
                  </>
                ) : section === 'farms' ? (
                  <>
                    <FarmsTable farms={paginate(filteredFarms, page, PAGE_SIZE)} />
                    <Pagination
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={filteredFarms.length}
                      onChange={setPage}
                    />
                  </>
                ) : section === 'diagnoses' ? (
                  <>
                    <DiagnosesTable
                      diagnoses={paginate(filteredDiagnoses, page, PAGE_SIZE)}
                    />
                    <Pagination
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={filteredDiagnoses.length}
                      onChange={setPage}
                    />
                  </>
                ) : section === 'notifications' ? (
                  <NotificationsSection
                    stats={stats}
                    users={users}
                    diagnoses={diagnoses}
                  />
                ) : (
                  <HelpSection />
                )}
              </div>
            </div>
          </main>

          {/* Right stats panel */}
          <aside className="w-full xl:w-80 shrink-0 space-y-4">
            <StatsPanel stats={stats} />
          </aside>
        </div>
      </div>

      {/* User detail drawer */}
      {selectedDetail && (
        <UserDetailPopover
          user={selectedDetail}
          farms={farms.filter((f) => f.ownerId === selectedDetail.id)}
          diagnoses={diagnoses.filter((d) => d.userId === selectedDetail.id)}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  )
}

/* ------------------------- sidebar bits ------------------------- */

function SidebarItem({
  icon: Icon,
  label,
  count,
  badge,
  active,
  onClick,
}: {
  icon: typeof LayoutDashboard
  label: string
  count?: number
  badge?: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left',
        active
          ? 'bg-white/10 text-white'
          : 'text-neutral-400 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : count !== undefined ? (
        <span
          className={cn(
            'text-[11px] font-medium',
            active ? 'text-white/70' : 'text-neutral-500',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

/* ------------------------- chips & helpers ------------------------- */

function Chip({ label, solid }: { label: string; solid?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border',
        solid
          ? 'bg-neutral-900 text-white border-neutral-900'
          : 'bg-white text-neutral-700 border-neutral-200',
      )}
    >
      {label}
      <ChevronDown className="h-3 w-3 opacity-70" />
    </span>
  )
}

function pluralCount<T>(filtered: T[], full: T[], section: Section) {
  const label =
    section === 'users'
      ? 'users'
      : section === 'farms'
        ? 'farms'
        : section === 'diagnoses'
          ? 'diagnoses'
          : 'records'
  return filtered.length === full.length
    ? `${full.length} ${label}`
    : `${filtered.length} of ${full.length} ${label}`
}

function sectionTitle(section: Section) {
  switch (section) {
    case 'dashboard':
      return 'Admin overview'
    case 'users':
      return 'Users'
    case 'farms':
      return 'Farms'
    case 'diagnoses':
      return 'Diagnoses'
    case 'notifications':
      return 'Notifications'
    case 'help':
      return 'Help & support'
  }
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-lg bg-neutral-100 animate-pulse"
        />
      ))}
    </div>
  )
}

/* ------------------------- dashboard section ------------------------- */

function DashboardSection({
  stats,
  recentDiagnoses,
}: {
  stats: AdminStats | null
  recentDiagnoses: AdminDiagnosis[]
}) {
  if (!stats) return null
  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Users" value={stats.totals.users} hint={`${stats.recent.newUsers7d} new this week`} />
        <KpiTile label="Farms" value={stats.totals.farms} hint={`${stats.totals.widgets} widgets`} />
        <KpiTile
          label="Diagnoses"
          value={stats.totals.diagnoses}
          hint={`${stats.recent.diagnoses24h} in last 24h`}
        />
        <KpiTile
          label="Chat messages"
          value={stats.totals.chatMessages}
          hint={`${stats.totals.images} images stored`}
        />
      </div>

      {/* Trend bars */}
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Diagnoses · last 14 days</h3>
          <span className="text-xs text-neutral-500">
            {stats.recent.diagnoses7d} in last 7 days
          </span>
        </div>
        <TrendBars trend={stats.trend} />
      </div>

      {/* Recent diagnoses */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent diagnoses</h3>
        {recentDiagnoses.length === 0 ? (
          <div className="text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center">
            No diagnoses yet.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {recentDiagnoses.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {d.topLabel}
                    <span className="text-neutral-500 font-normal">
                      {' '}
                      · {d.plant}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    {d.userName} · {d.userEmail}
                  </div>
                </div>
                <div className="text-xs text-neutral-700 font-medium tabular-nums">
                  {(d.topConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-[11px] text-neutral-500 hidden sm:block">
                  {formatDate(d.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-neutral-200 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-neutral-500">{hint}</div>
      )}
    </div>
  )
}

function TrendBars({ trend }: { trend: AdminStats['trend'] }) {
  const max = Math.max(1, ...trend.map((t) => t.value))
  // Build a 14-day window so days with no data still show as empty bars.
  const days: { day: string; value: number }[] = []
  const byDay = new Map(trend.map((t) => [t.day, t.value]))
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    days.push({ day: key, value: byDay.get(key) ?? 0 })
  }
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => {
        const h = Math.max(4, Math.round((d.value / max) * 100))
        return (
          <div
            key={d.day}
            title={`${d.day}: ${d.value}`}
            className="flex-1 rounded-t bg-[#caf26b] hover:bg-[#bce855] transition-colors"
            style={{ height: `${h}%` }}
          />
        )
      })}
    </div>
  )
}

/* ------------------------- users table ------------------------- */

function UsersTable({
  users,
  currentUserId,
  onToggleAdmin,
  onDelete,
  onSelect,
}: {
  users: AdminUser[]
  currentUserId: number
  onToggleAdmin: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
  onSelect: (u: AdminUser) => void
}) {
  if (users.length === 0) {
    return <Empty label="No users match your search." />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-neutral-500">
            <Th>ID</Th>
            <Th>User</Th>
            <Th>Role</Th>
            <Th className="text-right">Farms</Th>
            <Th className="text-right">Diagnoses</Th>
            <Th>Joined</Th>
            <Th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-t border-neutral-100 hover:bg-neutral-50 cursor-pointer"
              onClick={() => onSelect(u)}
            >
              <Td className="text-neutral-500 tabular-nums">#{u.id}</Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-neutral-200 text-neutral-700 inline-flex items-center justify-center text-xs font-semibold">
                    {(u.name || u.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {u.email}
                    </div>
                  </div>
                </div>
              </Td>
              <Td>
                {u.isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#caf26b]/30 text-[#3a7d1f] px-2 py-0.5 text-[11px] font-medium">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 text-neutral-600 px-2 py-0.5 text-[11px]">
                    Member
                  </span>
                )}
              </Td>
              <Td className="text-right tabular-nums">{u.farmCount}</Td>
              <Td className="text-right tabular-nums">{u.diagnosisCount}</Td>
              <Td className="text-neutral-500">{formatDate(u.createdAt)}</Td>
              <Td>
                <RowMenu
                  onPromote={
                    u.id === currentUserId ? undefined : () => onToggleAdmin(u)
                  }
                  promoteLabel={u.isAdmin ? 'Revoke admin' : 'Make admin'}
                  onDelete={
                    u.id === currentUserId ? undefined : () => onDelete(u)
                  }
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RowMenu({
  onPromote,
  promoteLabel,
  onDelete,
}: {
  onPromote?: () => void
  promoteLabel: string
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 rounded-md hover:bg-neutral-100 inline-flex items-center justify-center text-neutral-500"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-neutral-200 bg-white shadow-lg py-1">
            {onPromote ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onPromote()
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 inline-flex items-center gap-2"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {promoteLabel}
              </button>
            ) : (
              <div className="px-3 py-1.5 text-sm text-neutral-400">
                You can't change your own role
              </div>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete user
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------- farms table ------------------------- */

function FarmsTable({ farms }: { farms: AdminFarm[] }) {
  if (farms.length === 0) return <Empty label="No farms yet." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-neutral-500">
            <Th>Farm</Th>
            <Th>Owner</Th>
            <Th>Crop</Th>
            <Th>Location</Th>
            <Th className="text-right">Widgets</Th>
            <Th>Created</Th>
          </tr>
        </thead>
        <tbody>
          {farms.map((f) => (
            <tr key={f.id} className="border-t border-neutral-100 hover:bg-neutral-50">
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
                    <Sprout className="h-4 w-4" />
                  </div>
                  <div className="font-medium">{f.name}</div>
                </div>
              </Td>
              <Td>
                <div className="text-sm">{f.ownerName}</div>
                <div className="text-[11px] text-neutral-500">{f.ownerEmail}</div>
              </Td>
              <Td className="text-neutral-700">{f.cropType ?? '—'}</Td>
              <Td className="text-neutral-700">{f.location ?? '—'}</Td>
              <Td className="text-right tabular-nums">{f.widgetCount}</Td>
              <Td className="text-neutral-500">{formatDate(f.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------- diagnoses table ------------------------- */

function DiagnosesTable({ diagnoses }: { diagnoses: AdminDiagnosis[] }) {
  if (diagnoses.length === 0) return <Empty label="No diagnoses yet." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-neutral-500">
            <Th>ID</Th>
            <Th>Plant</Th>
            <Th>Top label</Th>
            <Th className="text-right">Confidence</Th>
            <Th>User</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {diagnoses.map((d) => (
            <tr key={d.id} className="border-t border-neutral-100 hover:bg-neutral-50">
              <Td className="text-neutral-500 tabular-nums">#{d.id}</Td>
              <Td className="capitalize">{d.plant}</Td>
              <Td className="font-medium">{d.topLabel}</Td>
              <Td className="text-right tabular-nums">
                {(d.topConfidence * 100).toFixed(0)}%
              </Td>
              <Td>
                <div className="text-sm">{d.userName}</div>
                <div className="text-[11px] text-neutral-500">{d.userEmail}</div>
              </Td>
              <Td className="text-neutral-500">{formatDate(d.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th className={cn('text-left font-medium px-3 py-2', className)}>
      {children}
    </th>
  )
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={cn('px-3 py-2.5 align-middle', className)}>{children}</td>
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-200 px-4 py-10 text-center">
      {label}
    </div>
  )
}

/* ------------------------- right stats panel ------------------------- */

function StatsPanel({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-2xl bg-white border border-neutral-200 animate-pulse" />
        <div className="h-44 rounded-2xl bg-white border border-neutral-200 animate-pulse" />
      </div>
    )
  }
  const { totals, recent, plantBreakdown } = stats
  return (
    <>
      {/* Gauge card */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-5">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">
          Activity this week
        </div>
        <Gauge
          value={recent.diagnoses7d}
          total={Math.max(totals.diagnoses, recent.diagnoses7d, 1)}
        />
        <div className="grid grid-cols-2 gap-2 mt-2 text-center">
          <div>
            <div className="text-base font-semibold tabular-nums">
              {recent.diagnoses24h.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500">last 24h</div>
          </div>
          <div>
            <div className="text-base font-semibold tabular-nums">
              {recent.newUsers7d.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500">new users · 7d</div>
          </div>
        </div>
      </div>

      {/* Users status */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Users</h3>
          <span className="text-[11px] text-neutral-500">Active</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden flex">
          <div
            className="bg-[#62c858]"
            style={{
              width: `${pct(totals.users - totals.admins, totals.users)}%`,
            }}
          />
          <div
            className="bg-[#3a7d1f]"
            style={{ width: `${pct(totals.admins, totals.users)}%` }}
          />
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          <LegendRow color="#62c858" label="Members" value={`${pct(totals.users - totals.admins, totals.users)}%`} />
          <LegendRow color="#3a7d1f" label="Admins" value={`${pct(totals.admins, totals.users)}%`} />
        </ul>
      </div>

      {/* Overview */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Overview</h3>
          <span className="text-[11px] text-neutral-500">All time</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Mini label="Farms" value={totals.farms} />
          <Mini label="Widgets" value={totals.widgets} />
          <Mini label="Images" value={totals.images} />
          <Mini label="Favorites" value={totals.favorites} />
          <Mini label="Submissions" value={totals.shopSubmissions} />
          <Mini label="Pending" value={totals.pendingSubmissions} />
        </div>
      </div>

      {/* Top plants */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Top plants</h3>
          <span className="text-[11px] text-neutral-500">Diagnoses</span>
        </div>
        {plantBreakdown.length === 0 ? (
          <div className="text-xs text-neutral-500 mt-3">No data yet.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {plantBreakdown.slice(0, 5).map((p) => {
              const total = plantBreakdown.reduce((s, x) => s + x.value, 0)
              const w = total > 0 ? (p.value / total) * 100 : 0
              return (
                <li key={p.plant} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-neutral-700">{p.plant}</span>
                    <span className="text-neutral-500 tabular-nums">
                      {p.value}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-[#caf26b]"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

function Gauge({ value, total }: { value: number; total: number }) {
  const pctVal = Math.max(0, Math.min(1, value / total))
  // Semicircular gauge: arc spans 180deg, stroke is a conic-gradient mask.
  const angle = Math.round(pctVal * 180)
  return (
    <div className="relative mt-3 mx-auto h-32 w-48">
      <div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from 270deg, #caf26b 0deg, #62c858 ${angle}deg, #f3f4f6 ${angle}deg, #f3f4f6 180deg, transparent 180deg)`,
          WebkitMask:
            'radial-gradient(circle at 50% 100%, transparent 56%, black 57%, black 78%, transparent 79%)',
          mask: 'radial-gradient(circle at 50% 100%, transparent 56%, black 57%, black 78%, transparent 79%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-2 text-center">
        <div className="text-2xl font-bold tabular-nums">
          {value.toLocaleString()}
        </div>
        <div className="text-[11px] text-neutral-500">7-day diagnoses</div>
      </div>
    </div>
  )
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-neutral-700">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="text-neutral-500 tabular-nums">{value}</span>
    </li>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  )
}

/* ------------------------- user detail popover ------------------------- */

function UserDetailPopover({
  user,
  farms,
  diagnoses,
  onClose,
}: {
  user: AdminUser
  farms: AdminFarm[]
  diagnoses: AdminDiagnosis[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-neutral-200 inline-flex items-center justify-center text-xs font-semibold">
              {(user.name || user.email).slice(0, 2).toUpperCase()}
            </div>
            <div className="text-sm font-semibold">{user.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-md hover:bg-neutral-100 inline-flex items-center justify-center text-neutral-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3 text-sm space-y-1.5">
          <div className="flex items-center gap-2 text-neutral-600">
            <HelpCircle className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">ID</span>
            <span className="ml-auto font-mono">#{user.id}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="text-xs text-neutral-500">Email</span>
            <span className="ml-auto truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="text-xs text-neutral-500">Joined</span>
            <span className="ml-auto">{formatDate(user.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="text-xs text-neutral-500">Role</span>
            <span className="ml-auto">{user.isAdmin ? 'Admin' : 'Member'}</span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-2 mb-1">
            Farms ({farms.length})
          </div>
          {farms.length === 0 ? (
            <div className="text-xs text-neutral-500">No farms.</div>
          ) : (
            <ul className="space-y-1">
              {farms.slice(0, 5).map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 text-sm border-t border-neutral-100 pt-1.5"
                >
                  <Sprout className="h-3.5 w-3.5 text-[#3a7d1f]" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-[11px] text-neutral-500">
                    {f.widgetCount} widgets
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-4 mb-1">
            Recent diagnoses ({diagnoses.length})
          </div>
          {diagnoses.length === 0 ? (
            <div className="text-xs text-neutral-500">No diagnoses.</div>
          ) : (
            <ul className="space-y-1">
              {diagnoses.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 text-sm border-t border-neutral-100 pt-1.5"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-[#3a7d1f]" />
                  <div className="flex-1 min-w-0 truncate">
                    {d.topLabel}{' '}
                    <span className="text-neutral-500">· {d.plant}</span>
                  </div>
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {(d.topConfidence * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------- notifications section ------------------------- */

function NotificationsSection({
  stats,
  users,
  diagnoses,
}: {
  stats: AdminStats | null
  users: AdminUser[]
  diagnoses: AdminDiagnosis[]
}) {
  // Build a synthetic notification feed from real data. As the platform grows
  // this can be replaced with a backed table; for now it reflects what's
  // actually happening on the site.
  type Notif = {
    id: string
    title: string
    body: string
    when: string
    tone: 'info' | 'warn' | 'success'
  }

  const items: Notif[] = []

  const pending = stats?.totals.pendingSubmissions ?? 0
  if (pending > 0) {
    items.push({
      id: 'pending-shops',
      title: `${pending} shop submission${pending === 1 ? '' : 's'} awaiting review`,
      body: 'Crowdsourced shops need a moderator before they appear in the map.',
      when: 'now',
      tone: 'warn',
    })
  }

  if ((stats?.recent.newUsers7d ?? 0) > 0) {
    items.push({
      id: 'new-users',
      title: `${stats!.recent.newUsers7d} new user${stats!.recent.newUsers7d === 1 ? '' : 's'} this week`,
      body: 'Welcome them and check their onboarding completed.',
      when: '7d',
      tone: 'success',
    })
  }

  // Most recent users (last 5)
  users.slice(0, 5).forEach((u) => {
    items.push({
      id: `user-${u.id}`,
      title: `${u.name} joined`,
      body: u.email,
      when: formatDate(u.createdAt),
      tone: 'info',
    })
  })

  // Most recent diagnoses (last 5)
  diagnoses.slice(0, 5).forEach((d) => {
    items.push({
      id: `diag-${d.id}`,
      title: `Diagnosis: ${d.topLabel} (${d.plant})`,
      body: `${d.userName} · ${(d.topConfidence * 100).toFixed(0)}% confidence`,
      when: formatDate(d.createdAt),
      tone: 'info',
    })
  })

  if (items.length === 0) {
    return <Empty label="Nothing new to report." />
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
      {items.map((n) => (
        <li key={n.id} className="flex items-start gap-3 px-4 py-3">
          <span
            className={cn(
              'mt-1.5 h-2 w-2 rounded-full shrink-0',
              n.tone === 'warn'
                ? 'bg-amber-500'
                : n.tone === 'success'
                  ? 'bg-[#62c858]'
                  : 'bg-neutral-400',
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{n.title}</div>
            <div className="text-xs text-neutral-500 truncate">{n.body}</div>
          </div>
          <div className="text-[11px] text-neutral-500 whitespace-nowrap">
            {n.when}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------- help & support section ------------------------- */

function HelpSection() {
  const FAQS: { q: string; a: string }[] = [
    {
      q: 'How do I make another user an admin?',
      a: 'Open the Users tab, click the row menu on the user you want to promote and choose "Make admin". You can revoke it later from the same menu.',
    },
    {
      q: 'What does deleting a user remove?',
      a: 'Deleting a user cascades through their farms, widgets, diagnoses, chat history, favourites and shop submissions. This action cannot be undone.',
    },
    {
      q: 'Where does diagnosis data come from?',
      a: 'Plant images are uploaded via the Diagnose page and stored in the configured upload root. The ONNX models in models/ generate predictions, which are persisted with the user and image.',
    },
    {
      q: 'How are shop submissions moderated?',
      a: 'The Notifications tab surfaces submissions in the pending state. Approval/rejection endpoints can be wired through the shop-submissions service.',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Contact card */}
      <div className="rounded-2xl border border-neutral-200 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold">Need a hand?</h3>
          <p className="text-sm text-neutral-600 mt-0.5">
            Reach the FarmSight team directly for admin issues, bug reports
            or feature requests.
          </p>
        </div>
        <a
          href="mailto:olivermazorodze1@gmail.com?subject=FarmSight%20admin%20support"
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white px-3 py-2 text-sm font-medium hover:bg-neutral-800"
        >
          Email support
        </a>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HelpTile
          icon={<LayoutDashboard className="h-4 w-4" />}
          title="API reference"
          body="OpenAPI docs for every endpoint."
          href="http://localhost:3000/reference"
        />
        <HelpTile
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Admin guide"
          body="How roles, permissions and moderation work."
        />
        <HelpTile
          icon={<HelpCircle className="h-4 w-4" />}
          title="Report a bug"
          body="Share a screenshot and what you expected."
          href="mailto:olivermazorodze1@gmail.com?subject=FarmSight%20bug%20report"
        />
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-sm font-semibold mb-2">FAQs</h3>
        <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
          {FAQS.map((f, i) => (
            <details key={i} className="group">
              <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium hover:bg-neutral-50">
                <span>{f.q}</span>
                <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-sm text-neutral-600 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

function HelpTile({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode
  title: string
  body: string
  href?: string
}) {
  const Wrapper: React.ElementType = href ? 'a' : 'div'
  const wrapperProps = href
    ? { href, target: href.startsWith('http') ? '_blank' : undefined, rel: 'noreferrer' }
    : {}
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'block rounded-xl border border-neutral-200 p-4',
        href && 'hover:border-neutral-300 hover:bg-neutral-50 transition-colors',
      )}
    >
      <div className="h-8 w-8 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{body}</div>
    </Wrapper>
  )
}

/* ------------------------- pagination ------------------------- */

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  // Compact page list with ellipses: 1 … (p-1) p (p+1) … N
  const pages: (number | 'ellipsis')[] = []
  const push = (v: number | 'ellipsis') => pages.push(v)
  const window = new Set<number>([1, totalPages, page - 1, page, page + 1])
  let last = 0
  Array.from(window)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b)
    .forEach((n) => {
      if (last && n - last > 1) push('ellipsis')
      push(n)
      last = n
    })

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-neutral-100 pt-3">
      <div className="text-xs text-neutral-500">
        Showing <span className="font-medium text-neutral-700">{start}</span>–
        <span className="font-medium text-neutral-700">{end}</span> of{' '}
        <span className="font-medium text-neutral-700">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-8 w-8 rounded-md border border-neutral-200 bg-white text-neutral-700 inline-flex items-center justify-center hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1.5 text-xs text-neutral-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                'h-8 min-w-8 px-2 rounded-md text-sm font-medium inline-flex items-center justify-center border',
                p === page
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-8 w-8 rounded-md border border-neutral-200 bg-white text-neutral-700 inline-flex items-center justify-center hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------- utils ------------------------- */

function pct(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}
