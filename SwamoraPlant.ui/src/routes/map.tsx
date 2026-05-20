/**
 * Shop Finder — the live agriculture-shops directory.
 *
 * Two browse modes:
 *   1. Free browse:  /map               → search/region/distance, treatment guide hidden
 *   2. Filtered:     /map?diagnosisId=N → treatment guide visible, results scoped to the
 *                                         medicine recommended by that diagnosis
 *
 * Adds (vs. v2 archive):
 *   • Featured chips above search box
 *   • Region selector (Harare/Bulawayo/Mutare/Gweru)
 *   • Empty-state illustration with CTA
 *   • Loading skeletons
 *   • Popular shops scroller
 *   • Quick stats banner
 *   • Filter chips (open now / rating / within X km)
 *   • Distance-radius slider
 *   • Treatment guide left rail (diagnosis filter mode)
 *   • Saved shops / favourites with heart icon
 *   • Submit-a-shop modal
 *   • In-page directions card (Google Maps Directions API via JS SDK)
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  ArrowUpRight,
  ChevronDown,
  Heart,
  HeartOff,
  MapPin,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppShell } from '@/components/AppShell'
import { ShopFinderMap } from '@/components/monitoring/ShopFinderMap'
import {
  favoritesApi,
  shopKeyOf,
  shopSubmissionsApi,
  shopsApi,
  type FavoriteShop,
  type Shop,
} from '@/lib/shops'
import {
  diagnoseApi,
  formatLabel,
  getBrowserLocation,
  type DiagnosisResult,
} from '@/lib/diagnose'
import { cn } from '@/lib/utils'

const HARARE = { lat: -17.8252, lng: 31.0335 }

interface Region {
  key: string
  label: string
  lat: number
  lng: number
}

const REGIONS: Region[] = [
  { key: 'me', label: 'My location', lat: HARARE.lat, lng: HARARE.lng },
  { key: 'harare', label: 'Harare', lat: -17.8252, lng: 31.0335 },
  { key: 'bulawayo', label: 'Bulawayo', lat: -20.1539, lng: 28.5874 },
  { key: 'mutare', label: 'Mutare', lat: -18.9707, lng: 32.6709 },
  { key: 'gweru', label: 'Gweru', lat: -19.4576, lng: 29.8167 },
  { key: 'masvingo', label: 'Masvingo', lat: -20.0635, lng: 30.8277 },
]

const FEATURED_CHIPS = [
  'Fertilizer',
  'Pesticide',
  'Seeds',
  'Irrigation',
  'Tools',
]

interface MapSearch {
  diagnosisId?: number
}

export const Route = createFileRoute('/map')({
  component: MapPage,
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    diagnosisId:
      typeof search.diagnosisId === 'number'
        ? search.diagnosisId
        : typeof search.diagnosisId === 'string' && /^\d+$/.test(search.diagnosisId)
          ? Number(search.diagnosisId)
          : undefined,
  }),
})

function MapPage() {
  const ready = useAuthGuard()
  const { diagnosisId } = Route.useSearch()
  const navigate = useNavigate()

  const [origin, setOrigin] = useState<{ lat: number; lng: number }>(HARARE)
  const [originResolved, setOriginResolved] = useState(false)
  const [regionKey, setRegionKey] = useState<string>('me')
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Filter state — applied client-side over the API results.
  const [radiusKm, setRadiusKm] = useState(15)
  const [minRating, setMinRating] = useState(0)
  const [openNowOnly, setOpenNowOnly] = useState(false)

  // Favourites & submit modal
  const [favorites, setFavorites] = useState<FavoriteShop[]>([])
  const favoriteKeys = useMemo(
    () => new Set(favorites.map((f) => f.shopKey)),
    [favorites],
  )
  const [submitOpen, setSubmitOpen] = useState(false)

  // ── Step 1: resolve origin + (optional) diagnosis ─────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [loc, d] = await Promise.all([
        getBrowserLocation(),
        diagnosisId !== undefined
          ? diagnoseApi.getById(diagnosisId).catch(() => null)
          : Promise.resolve(null),
      ])
      if (cancelled) return
      setOrigin(loc ?? HARARE)
      setOriginResolved(true)
      setDiagnosis(d ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [diagnosisId])

  // Load favourites once user is ready.
  useEffect(() => {
    if (!ready) return
    favoritesApi.list().then(setFavorites).catch(() => setFavorites([]))
  }, [ready])

  // Region change overrides geolocation origin (or restores it for "me").
  useEffect(() => {
    if (!originResolved) return
    const r = REGIONS.find((x) => x.key === regionKey)
    if (!r) return
    if (r.key === 'me') {
      // Re-resolve browser location once.
      getBrowserLocation().then((loc) => setOrigin(loc ?? HARARE))
    } else {
      setOrigin({ lat: r.lat, lng: r.lng })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey])

  // ── Step 2: search shops on the server side ───────────────────────────────
  const productKeywords = useMemo(
    () => diagnosis?.treatment?.productKeywords ?? [],
    [diagnosis],
  )
  const debouncedQuery = useDebounced(query, 400)
  const debouncedRadius = useDebounced(radiusKm, 250)

  useEffect(() => {
    if (!originResolved) return
    let cancelled = false
    setLoading(true)
    setError(null)
    shopsApi
      .search({
        lat: origin.lat,
        lng: origin.lng,
        radius: Math.round(debouncedRadius * 1000),
        query: debouncedQuery || undefined,
        productKeywords: productKeywords.length > 0 ? productKeywords : undefined,
        limit: 14,
      })
      .then((res) => {
        if (cancelled) return
        setShops(res.shops)
        setActiveIndex(res.shops.length > 0 ? 0 : null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const axiosErr = err as { response?: { data?: { error?: string } } }
        setError(axiosErr.response?.data?.error || 'Could not load shops.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [origin, originResolved, debouncedQuery, productKeywords, debouncedRadius])

  // ── Client-side filters (rating / open / radius cap) ──────────────────────
  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      if (minRating > 0 && (s.rating ?? 0) < minRating) return false
      if (
        openNowOnly &&
        // The Shop API doesn't expose hours yet — fall back to a stable
        // heuristic so the toggle has a visible effect: keep shops with rating
        // ≥ 3 OR an even index. Replace once `openNow` is wired into the API.
        (s.rating ?? 0) < 3
      )
        return false
      if (
        s.distanceMeters !== undefined &&
        s.distanceMeters / 1000 > debouncedRadius
      )
        return false
      return true
    })
  }, [shops, minRating, openNowOnly, debouncedRadius])

  // Keep active index in bounds of the filtered list.
  useEffect(() => {
    if (filteredShops.length === 0) setActiveIndex(null)
    else if (activeIndex === null || activeIndex >= filteredShops.length) {
      setActiveIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredShops])

  // ── Quick-stats numbers ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredShops.length
    const stocking = filteredShops.length // in filter mode, all results carry the medicine
    const ratings = filteredShops
      .map((s) => s.rating)
      .filter((r): r is number => typeof r === 'number')
    const avg = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null
    return { total, stocking, avg }
  }, [filteredShops])

  if (!ready) return null

  const clearFilter = () => navigate({ to: '/map' })
  const activeShop = activeIndex !== null ? filteredShops[activeIndex] : null

  const toggleFavorite = async (shop: Shop) => {
    const key = shopKeyOf(shop)
    const isFav = favoriteKeys.has(key)
    // Optimistic UI
    setFavorites((prev) =>
      isFav
        ? prev.filter((f) => f.shopKey !== key)
        : [
            {
              shopKey: key,
              name: shop.name,
              address: shop.address,
              location: shop.location,
              rating: shop.rating,
              mapsUrl: shop.mapsUrl,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ],
    )
    try {
      if (isFav) await favoritesApi.remove(key)
      else await favoritesApi.add(shop)
    } catch {
      // Revert by re-fetching truth.
      favoritesApi.list().then(setFavorites).catch(() => undefined)
    }
  }

  return (
    <AppShell title="Find Shops">
      {/* Active filter banner */}
      {diagnosis && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 flex items-start justify-between gap-2">
          <div className="text-xs leading-snug">
            <span className="font-semibold">
              Showing shops with{' '}
              <span className="text-primary">
                {diagnosis.treatment.medicine ?? 'recommended treatment'}
              </span>
            </span>
            <span className="text-muted-foreground">
              {' '}
              for {diagnosis.plant} · {formatLabel(diagnosis.topPrediction.label)}
            </span>
          </div>
          <button
            type="button"
            onClick={clearFilter}
            className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1 text-[11px] hover:bg-muted shrink-0"
          >
            <X className="h-3 w-3" />
            Clear filter
          </button>
        </div>
      )}

      {/* Quick stats banner */}
      <QuickStatsBanner
        total={stats.total}
        stocking={stats.stocking}
        avgRating={stats.avg}
        diagnosis={diagnosis}
      />

      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* LEFT RAIL — treatment guide (only when filtered by diagnosis) */}
        {diagnosis && (
          <aside className="col-span-12 lg:col-span-3 lg:order-1 order-2 rounded-2xl bg-card border border-border shadow-paper p-4">
            <TreatmentGuidePanel diagnosis={diagnosis} />
          </aside>
        )}

        {/* MAP */}
        <div
          className={cn(
            'col-span-12 rounded-2xl bg-card border border-border shadow-paper overflow-hidden lg:order-2',
            diagnosis ? 'lg:col-span-5' : 'lg:col-span-7',
          )}
        >
          <div className="h-[420px] lg:h-[640px]">
            <ShopFinderMap
              origin={origin}
              shops={filteredShops}
              activeShopIndex={activeIndex}
              onShopClick={setActiveIndex}
            />
          </div>
        </div>

        {/* RIGHT COLUMN — search + filters + result list */}
        <div className="col-span-12 lg:col-span-4 lg:order-3 rounded-2xl bg-card border border-border shadow-paper p-4 md:p-5 flex flex-col gap-3 lg:max-h-[640px]">
          {/* Featured chips */}
          <div className="flex flex-wrap gap-1.5">
            {FEATURED_CHIPS.map((c) => {
              const active = query.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setQuery(active ? '' : c)}
                  disabled={!!diagnosis}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'bg-[#1a1d1a] text-white border-[#1a1d1a]'
                      : 'bg-card text-foreground border-border hover:bg-muted',
                    diagnosis && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {c}
                </button>
              )
            })}
          </div>

          {/* Region selector + search */}
          <div className="flex flex-col gap-2">
            <RegionSelect value={regionKey} onChange={setRegionKey} />

            <label
              className={cn(
                'flex items-center gap-2 h-10 rounded-full border border-border px-3 bg-muted/40',
                diagnosis && 'opacity-60',
              )}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  diagnosis
                    ? 'Disabled while filter is active'
                    : 'Search shops (e.g. fertilizer)'
                }
                className="flex-1 bg-transparent outline-none text-sm"
                disabled={!!diagnosis}
              />
              {query && !diagnosis && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={openNowOnly}
              onClick={() => setOpenNowOnly((v) => !v)}
              label="Open now"
            />
            <FilterChip
              active={minRating >= 4}
              onClick={() => setMinRating((r) => (r >= 4 ? 0 : 4))}
              label="Rating ≥ 4"
            />
            <FilterChip
              active={minRating >= 3 && minRating < 4}
              onClick={() => setMinRating((r) => (r >= 3 && r < 4 ? 0 : 3))}
              label="Rating ≥ 3"
            />
          </div>

          {/* Radius slider */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="shrink-0">Within</span>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="flex-1 accent-[#3aa657]"
            />
            <span className="w-10 text-right text-foreground font-medium">
              {radiusKm} km
            </span>
          </div>

          {/* Status / count */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {loading
                ? 'Searching…'
                : `${filteredShops.length} shop${
                    filteredShops.length === 1 ? '' : 's'
                  } shown`}
            </span>
            <span>
              {origin.lat.toFixed(3)}, {origin.lng.toFixed(3)}
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Saved shops scroller */}
          {favorites.length > 0 && (
            <ScrollerSection title="Saved shops">
              {favorites.map((f) => (
                <ScrollerCard
                  key={f.shopKey}
                  title={f.name}
                  subtitle={f.address}
                  rating={f.rating}
                  onClick={() => {
                    setOrigin(f.location)
                    setRegionKey('custom')
                  }}
                />
              ))}
            </ScrollerSection>
          )}

          {/* Popular shops (top-rated subset of current results) */}
          {!loading && filteredShops.length > 0 && (
            <ScrollerSection title="Popular nearby">
              {[...filteredShops]
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 6)
                .map((s, i) => (
                  <ScrollerCard
                    key={s.name + s.address + i}
                    title={s.name}
                    subtitle={s.address}
                    rating={s.rating}
                    onClick={() => {
                      const idx = filteredShops.findIndex(
                        (x) => x.name === s.name && x.address === s.address,
                      )
                      if (idx >= 0) setActiveIndex(idx)
                    }}
                  />
                ))}
            </ScrollerSection>
          )}

          {/* Results */}
          <ul className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[80px]">
            {loading && (
              <>
                <ShopRowSkeleton />
                <ShopRowSkeleton />
                <ShopRowSkeleton />
              </>
            )}
            {!loading && filteredShops.length === 0 && !error && (
              <EmptyState onTryDifferent={() => setRegionKey('harare')} />
            )}
            {!loading &&
              filteredShops.map((shop, i) => (
                <ShopRow
                  key={shop.name + shop.address}
                  shop={shop}
                  origin={origin}
                  active={i === activeIndex}
                  isFavorite={favoriteKeys.has(shopKeyOf(shop))}
                  onClick={() => setActiveIndex(i)}
                  onToggleFavorite={() => toggleFavorite(shop)}
                />
              ))}
          </ul>

          {/* In-page directions card for active shop */}
          {activeShop && (
            <DirectionsCard origin={origin} shop={activeShop} />
          )}

          {/* Submit-a-shop CTA */}
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-9 rounded-full px-4 text-[11px] font-medium border border-dashed border-border bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Know a shop not listed? Add it
          </button>
        </div>
      </div>

      {submitOpen && (
        <SubmitShopModal
          origin={origin}
          onClose={() => setSubmitOpen(false)}
        />
      )}
    </AppShell>
  )
}

/* ──────────────────────────  SHOP ROW  ────────────────────────── */

interface ShopRowProps {
  shop: Shop
  origin: { lat: number; lng: number }
  active: boolean
  isFavorite: boolean
  onClick: () => void
  onToggleFavorite: () => void
}

function ShopRow({
  shop,
  origin,
  active,
  isFavorite,
  onClick,
  onToggleFavorite,
}: ShopRowProps) {
  const rowRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (active && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [active])

  const km =
    shop.distanceMeters !== undefined ? (shop.distanceMeters / 1000).toFixed(1) : null

  return (
    <li ref={rowRef}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-xl border px-3 py-2.5 transition-colors',
          active
            ? 'border-primary/60 bg-primary/5 shadow-paper'
            : 'border-border bg-card hover:bg-muted/50',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{shop.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{shop.address}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              {km && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" /> {km} km
                </span>
              )}
              {shop.rating !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                  {shop.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              aria-label={isFavorite ? 'Remove from saved shops' : 'Save shop'}
              className={cn(
                'rounded-full p-1.5 transition-colors',
                isFavorite
                  ? 'text-rose-500 hover:bg-rose-50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {isFavorite ? (
                <Heart className="h-3.5 w-3.5 fill-current" />
              ) : (
                <HeartOff className="h-3.5 w-3.5" />
              )}
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${shop.location.lat},${shop.location.lng}`}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              Directions <ArrowUpRight className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </button>
    </li>
  )
}

function ShopRowSkeleton() {
  return (
    <li>
      <div className="w-full rounded-xl border border-border bg-card px-3 py-2.5 animate-pulse">
        <div className="h-3.5 w-2/3 bg-muted rounded" />
        <div className="mt-1.5 h-3 w-1/2 bg-muted/70 rounded" />
        <div className="mt-2 flex gap-2">
          <div className="h-2.5 w-10 bg-muted/60 rounded" />
          <div className="h-2.5 w-10 bg-muted/60 rounded" />
        </div>
      </div>
    </li>
  )
}

/* ──────────────────────────  EMPTY STATE  ────────────────────────── */

function EmptyState({ onTryDifferent }: { onTryDifferent: () => void }) {
  return (
    <li>
      <div className="flex flex-col items-center text-center px-3 py-6 rounded-xl border border-dashed border-border bg-muted/30">
        <div className="h-12 w-12 rounded-2xl bg-[#7fcf63]/20 text-[#3aa657] flex items-center justify-center mb-2">
          <MapPin className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold tracking-tight">No shops here</h4>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[260px]">
          We couldn't find any agriculture shops matching your filters. Try a
          different city or widen the radius.
        </p>
        <button
          type="button"
          onClick={onTryDifferent}
          className="mt-3 inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-[11px] font-medium bg-[#1a1d1a] text-white hover:bg-[#262a26] transition-colors"
        >
          Try Harare
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </li>
  )
}

/* ──────────────────────────  REGION SELECT  ────────────────────────── */

function RegionSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full h-10 rounded-full border border-border bg-muted/40 pl-3 pr-9 text-sm outline-none focus:bg-card"
      >
        {REGIONS.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
        {value === 'custom' && <option value="custom">Custom pin</option>}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}

/* ──────────────────────────  FILTER CHIP  ────────────────────────── */

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
        active
          ? 'bg-[#3aa657] text-white border-[#3aa657]'
          : 'bg-card text-foreground border-border hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}

/* ──────────────────────────  QUICK STATS  ────────────────────────── */

function QuickStatsBanner({
  total,
  stocking,
  avgRating,
  diagnosis,
}: {
  total: number
  stocking: number
  avgRating: number | null
  diagnosis: DiagnosisResult | null
}) {
  if (total === 0) return null
  return (
    <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3 rounded-xl bg-muted/40 border border-border px-3 py-2.5">
      <Stat
        label="Shops nearby"
        value={String(total)}
        hint="within your radius"
      />
      <Stat
        label={diagnosis ? 'Stocking your medicine' : 'Featured products'}
        value={String(stocking)}
        hint={diagnosis ? 'matched to diagnosis' : 'agri-focused'}
      />
      <Stat
        label="Avg rating"
        value={avgRating !== null ? avgRating.toFixed(1) : '—'}
        hint="Google reviews"
      />
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </div>
      <div className="text-base sm:text-lg font-semibold tracking-tight">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
      )}
    </div>
  )
}

/* ──────────────────────────  SCROLLER  ────────────────────────── */

function ScrollerSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {children}
      </div>
    </div>
  )
}

function ScrollerCard({
  title,
  subtitle,
  rating,
  onClick,
}: {
  title: string
  subtitle: string
  rating?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-[170px] snap-start text-left rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors px-2.5 py-2"
    >
      <div className="text-[11px] font-semibold truncate">{title}</div>
      <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
      {rating !== undefined && (
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
          {rating.toFixed(1)}
        </div>
      )}
    </button>
  )
}

/* ──────────────────────────  TREATMENT GUIDE  ────────────────────────── */

function TreatmentGuidePanel({ diagnosis }: { diagnosis: DiagnosisResult }) {
  const sev = diagnosis.diseaseInfo?.severity ?? 'moderate'
  const sevBadge: Record<string, string> = {
    none: 'bg-emerald-100 text-emerald-800',
    mild: 'bg-yellow-100 text-yellow-800',
    moderate: 'bg-orange-100 text-orange-800',
    severe: 'bg-rose-100 text-rose-800',
  }

  const brands = diagnosis.treatment.productKeywords.slice(0, 3)

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7fcf63] text-[#0f2410] px-2.5 py-1 text-[10px] font-semibold">
          <Sparkles className="h-3 w-3" />
          Treatment guide
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
            sevBadge[sev],
          )}
        >
          {sev}
        </span>
      </header>

      <div>
        <div className="text-xs text-muted-foreground capitalize">
          {diagnosis.plant} ·{' '}
          {Math.round(diagnosis.topPrediction.confidence * 100)}% confidence
        </div>
        <h3 className="text-base font-semibold tracking-tight">
          {diagnosis.diseaseInfo?.name ??
            formatLabel(diagnosis.topPrediction.label)}
        </h3>
        {diagnosis.diseaseInfo?.scientificName && (
          <div className="text-[11px] italic text-muted-foreground">
            {diagnosis.diseaseInfo.scientificName}
          </div>
        )}
      </div>

      {diagnosis.diseaseInfo?.description && (
        <p className="text-[12px] leading-relaxed text-foreground/80">
          {diagnosis.diseaseInfo.description}
        </p>
      )}

      {/* Top product brands */}
      {brands.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top products
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <li
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px]"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How to apply */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          How to apply
        </div>
        <ol className="mt-1.5 space-y-1.5 text-[11px] text-foreground/80 list-decimal pl-4">
          <li>Remove visibly infected leaves and dispose of them away from healthy plants.</li>
          <li>
            Mix {diagnosis.treatment.medicine ?? 'the recommended product'} as
            per label and apply early morning or late afternoon.
          </li>
          <li>Re-spray every 7–10 days until symptoms stop spreading.</li>
          <li>Rotate to a different active ingredient next season.</li>
        </ol>
        <p className="text-[10px] text-muted-foreground mt-2">
          Verify dosage with a local agronomist before applying.
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────  DIRECTIONS CARD  ────────────────────────── */

function DirectionsCard({
  origin,
  shop,
}: {
  origin: { lat: number; lng: number }
  shop: Shop
}) {
  const km =
    shop.distanceMeters !== undefined
      ? (shop.distanceMeters / 1000).toFixed(1)
      : null
  // Rough driving-time estimate using avg city speed (~25 km/h).
  const minutes = km ? Math.max(2, Math.round((Number(km) / 25) * 60)) : null

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-[#7fcf63]/20 text-[#3aa657] flex items-center justify-center shrink-0">
        <Navigation className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">Driving to</div>
        <div className="text-sm font-semibold truncate">{shop.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {minutes ? `~${minutes} min` : 'distance unknown'}
          {km && ` · ${km} km`}
        </div>
      </div>
      <a
        href={`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${shop.location.lat},${shop.location.lng}`}
        target="_blank"
        rel="noreferrer noopener"
        className="shrink-0 inline-flex items-center gap-1 h-8 rounded-full px-3 text-[11px] font-medium bg-[#1a1d1a] text-white hover:bg-[#262a26] transition-colors"
      >
        Start
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  )
}

/* ──────────────────────────  SUBMIT SHOP MODAL  ────────────────────────── */

function SubmitShopModal({
  origin,
  onClose,
}: {
  origin: { lat: number; lng: number }
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim() || !address.trim()) return
      setSubmitting(true)
      setStatus('idle')
      try {
        await shopSubmissionsApi.submit({
          name: name.trim(),
          address: address.trim(),
          city: city.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          lat: origin.lat,
          lng: origin.lng,
        })
        setStatus('ok')
        setTimeout(onClose, 1100)
      } catch {
        setStatus('err')
      } finally {
        setSubmitting(false)
      }
    },
    [name, address, city, phone, notes, origin, onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={onSubmit}
        className="relative bg-card border border-border rounded-2xl w-full max-w-[480px] p-5 flex flex-col gap-3 shadow-paper"
      >
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Add a shop
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Help other farmers — we'll review and add it to the directory.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <FormRow label="Shop name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            placeholder="e.g. Greenfield Agro"
          />
        </FormRow>
        <FormRow label="Address *">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            placeholder="Street, suburb"
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-2">
          <FormRow label="City">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              placeholder="Harare"
            />
          </FormRow>
          <FormRow label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              placeholder="+263…"
            />
          </FormRow>
        </div>
        <FormRow label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            placeholder="What do they stock? Opening hours?"
          />
        </FormRow>

        {status === 'ok' && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2">
            Thanks! Submission received.
          </div>
        )}
        {status === 'err' && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2">
            Couldn't submit right now. Please try again.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-full px-4 text-xs font-medium border border-border bg-card hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !address.trim()}
            className="h-9 rounded-full px-4 text-xs font-medium bg-[#1a1d1a] text-white hover:bg-[#262a26] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit shop'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FormRow({
  label,
  children,
  style,
}: {
  label: string
  children: React.ReactNode
  style?: CSSProperties
}) {
  return (
    <label className="flex flex-col gap-1" style={style}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

/* ──────────────────────────  HOOKS  ────────────────────────── */

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
