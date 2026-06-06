import { MapPin, Pill, Sparkles } from 'lucide-react'
import type { DiagnosisResult } from '@/lib/diagnose'
import { formatLabel } from '@/lib/diagnose'

interface Props {
  result: DiagnosisResult
}

export function DiagnosisResultCard({ result }: Props) {
  const { topPrediction, predictions, treatment, shops } = result
  const confidencePct = Math.round(topPrediction.confidence * 100)
  const isHealthy = topPrediction.label === 'healthy'

  return (
    <div className="w-full rounded-lg border border-border bg-card shadow-paper overflow-hidden">
      {/* Diagnosis header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Diagnosis
          </div>
          <h3 className="text-base font-semibold mt-0.5">
            {formatLabel(topPrediction.label)}
          </h3>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-md font-medium ${
            isHealthy
              ? 'bg-primary/10 text-primary'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}
        >
          {confidencePct}% confidence
        </span>
      </div>

      {/* Other predictions */}
      {predictions.length > 1 && (
        <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground">
          Also considered:{' '}
          {predictions.slice(1).map((p, i) => (
            <span key={p.label}>
              {i > 0 && ', '}
              {formatLabel(p.label)} ({Math.round(p.confidence * 100)}%)
            </span>
          ))}
        </div>
      )}

      {/* Treatment */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Pill className="h-3 w-3" />
          Recommendation
        </div>
        <p className="text-sm leading-relaxed">{treatment.summary}</p>
        {treatment.medicine && (
          <p className="text-sm mt-1.5">
            <span className="text-muted-foreground">Suggested product: </span>
            <span className="font-medium">{treatment.medicine}</span>
          </p>
        )}
        {treatment.products && treatment.products.length > 0 && (
          <div className="mt-2.5">
            <div className="text-xs text-muted-foreground mb-1">
              Available products & indicative prices
            </div>
            <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {treatment.products.map((p) => (
                <li
                  key={`${p.name}-${p.size}`}
                  className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm"
                >
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {p.size}
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    ${p.priceUsd}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Shops */}
      {shops.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3" />
            Nearby shops
          </div>
          <ul className="space-y-2">
            {shops.map((s) => (
              <li key={s.name + s.address} className="text-sm">
                <a
                  href={s.mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block rounded-md border border-border px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.distanceMeters !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {(s.distanceMeters / 1000).toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.address}</div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
