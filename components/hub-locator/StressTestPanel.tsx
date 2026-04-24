'use client'

import { useState, useMemo } from 'react'
import type { StressTestParams, VenueLocation } from '@/lib/types'
import { formatCurrency, haversineKm } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface Props {
  params: StressTestParams
  onParamsChange: (p: StressTestParams) => void
  annualSpend: number
  eriScore?: number
  /** Server-computed net saving (catchment-adjusted, reflects all three sliders) */
  serverNetSaving?: number
  /** Server-computed baseline spend (catchment-adjusted) */
  serverBaseline?: number
  /** Venues + hub centroid for live catchment preview as radius slider moves */
  venues?: VenueLocation[]
  hubCentroid?: { lat: number; lng: number } | null
  isLoading?: boolean
}

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold text-subtle uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-body">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #005b94 ${pct}%, #e5e7eb 0%)`, accentColor: '#005b94' }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-xs text-subtle">{format(min)}</span>
        <span className="text-xs text-subtle">{format(max)}</span>
      </div>
    </div>
  )
}

export function StressTestPanel({ params, onParamsChange, annualSpend, eriScore, serverNetSaving, serverBaseline, venues, hubCentroid, isLoading }: Props) {
  const [local, setLocal] = useState(params)
  function update(key: keyof StressTestParams, value: number) {
    const next = { ...local, [key]: value }
    setLocal(next)
    onParamsChange(next)
  }

  const hubAnnual = local.hubCostMonthly * 12

  // Use server-computed values (catchment-adjusted — all three sliders feed into them) when available
  // and not mid-flight. Fall back to local estimate during the API round-trip; hub cost and uplift
  // are correct locally, but radius is only reflected once the server responds.
  const displayNetSaving = !isLoading && serverNetSaving != null
    ? serverNetSaving
    : annualSpend * (1 + local.inducedDemandUpliftPct / 100) - hubAnnual
  const displayBaseline = !isLoading && serverBaseline != null ? serverBaseline : annualSpend
  const baselineNet = displayBaseline - hubAnnual

  // Color is ERI-aware: green only when baseline spend alone covers hub cost AND ERI is acceptable,
  // amber when net positive only due to uplift or ERI < 40, red when uneconomic even with uplift.
  const genuinelyPositive = baselineNet >= 0 && (eriScore == null || eriScore >= 40)
  const savingBg  = genuinelyPositive ? 'bg-green-50'  : displayNetSaving > 0 ? 'bg-orange-50' : 'bg-red-50'
  const savingText = genuinelyPositive ? 'text-success' : displayNetSaving > 0 ? 'text-warning' : 'text-danger'

  const savingTooltip = baselineNet < 0 && displayNetSaving > 0
    ? `Spend within radius ($${Math.round(displayBaseline / 1000)}K) < hub cost ($${Math.round(hubAnnual / 1000)}K). Positive only at +${local.inducedDemandUpliftPct}% induced demand uplift.`
    : undefined

  // Live venue coverage — recomputes instantly as radius slider moves, no API needed
  const coverage = useMemo(() => {
    if (!venues?.length || !hubCentroid) return null
    const radiusKm = local.commuteRadiusMiles * 1.609
    const totalSpend = venues.reduce((s, v) => s + v.spend, 0)
    const inRange = venues.filter(
      v => haversineKm(hubCentroid.lat, hubCentroid.lng, v.latitude, v.longitude) <= radiusKm
    )
    const rangeSpend = inRange.reduce((s, v) => s + v.spend, 0)
    return {
      venuesIn: inRange.length,
      venuesTotal: venues.length,
      spendPct: totalSpend > 0 ? Math.round((rangeSpend / totalSpend) * 100) : 100,
      allCaptured: inRange.length === venues.length,
    }
  }, [venues, hubCentroid, local.commuteRadiusMiles])

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Stress Test</div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-subtle">
            <Loader2 size={11} className="animate-spin text-ls-500" /> Recalculating
          </div>
        )}
      </div>
      {/* Interactive sliders — hidden in print */}
      <div className="print-sliders flex flex-col gap-4 mb-4">
        <Slider label="Hub Cost / Month" value={local.hubCostMonthly} min={2000} max={25000} step={500}
          format={v => formatCurrency(v, true)} onChange={v => update('hubCostMonthly', v)} />
        <Slider label="Induced Demand Uplift" value={local.inducedDemandUpliftPct} min={0} max={100} step={5}
          format={v => `+${v}%`} onChange={v => update('inducedDemandUpliftPct', v)} />
        <div>
          <Slider label="Commute Radius" value={local.commuteRadiusMiles} min={5} max={60} step={5}
            format={v => `${v} mi`} onChange={v => update('commuteRadiusMiles', v)} />
          {coverage && (
            <div className={`flex items-center justify-between mt-1.5 text-[10px] px-0.5 ${coverage.allCaptured ? 'text-subtle' : 'text-warning'}`}>
              <span>
                {coverage.venuesIn} of {coverage.venuesTotal} venue{coverage.venuesTotal !== 1 ? 's' : ''} within radius
              </span>
              <span className={`font-semibold ${coverage.allCaptured ? 'text-subtle' : 'text-warning'}`}>
                {coverage.spendPct}% of spend
              </span>
            </div>
          )}
          {coverage?.allCaptured && (
            <div className="text-[10px] text-subtle opacity-60 mt-0.5 px-0.5">
              All venues in range — pull left to see radius sensitivity
            </div>
          )}
        </div>
      </div>

      {/* Print-only: static parameter summary */}
      <div className="print-stress-static hidden grid-cols-3 gap-2 mb-4 text-center">
        {[
          ['Hub Cost/mo', formatCurrency(local.hubCostMonthly, true)],
          ['Demand Uplift', `+${local.inducedDemandUpliftPct}%`],
          ['Commute Radius', `${local.commuteRadiusMiles} mi`],
        ].map(([label, val]) => (
          <div key={label} className="bg-page rounded-lg p-2 border border-border">
            <div className="text-[10px] text-subtle">{label}</div>
            <div className="text-xs font-bold text-body mt-0.5">{val}</div>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Net Economics</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-page rounded-lg p-2.5">
            <div className="text-xs text-subtle">Hub Annual Cost</div>
            <div className="text-sm font-bold text-body mt-0.5">{formatCurrency(hubAnnual, true)}</div>
          </div>
          <div className={`rounded-lg p-2.5 ${isLoading ? 'bg-page' : savingBg}`} title={savingTooltip}>
            <div className="text-xs text-subtle flex items-center gap-1">
              Net Saving
              {!isLoading && baselineNet < 0 && displayNetSaving > 0 && (
                <span className="text-[9px] font-semibold text-warning bg-orange-100 border border-orange-200 px-1 rounded">uplift</span>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center gap-1 mt-0.5 text-subtle">
                <Loader2 size={11} className="animate-spin" />
                <span className="text-xs">Recalculating…</span>
              </div>
            ) : (
              <>
                <div className={`text-sm font-bold mt-0.5 ${savingText}`}>
                  {displayNetSaving > 0 ? '+' : ''}{formatCurrency(displayNetSaving, true)}
                </div>
                {baselineNet < 0 && displayNetSaving > 0 && (
                  <div className="text-[9px] text-warning mt-0.5 leading-tight">
                    –${Math.round(Math.abs(baselineNet) / 1000)}K without uplift
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
