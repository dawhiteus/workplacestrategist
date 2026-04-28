'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { Save, RotateCcw, Loader2, CheckCircle } from 'lucide-react'
import type { StressTestParams, VenueLocation, CostDistribution, SavedScenario } from '@/lib/types'
import { formatCurrency, haversineKm } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  params: StressTestParams
  onParamsChange: (p: StressTestParams) => void
  annualSpend: number
  eriScore?: number
  /** Server-computed net saving (catchment-adjusted) */
  serverNetSaving?: number
  /** Server-computed baseline spend (catchment-adjusted) */
  serverBaseline?: number
  /** Venues + hub centroid for live catchment preview as radius slider moves */
  venues?: VenueLocation[]
  hubCentroid?: { lat: number; lng: number } | null
  isLoading?: boolean
  /** ERI-derived minimum seats for economic breakeven */
  breakevenSeats?: number
  /** Market city for fetching the cost-per-seat distribution */
  city?: string
  /** Market state for fetching the cost-per-seat distribution */
  state?: string
  /** Original params to revert to */
  baselineParams?: StressTestParams
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NATIONAL_DIST: CostDistribution = {
  city: '', state: '', listing_count: 0,
  min: 150, p10: 200, p25: 280, median: 420, p75: 650, p90: 900, max: 1200, avg: 450, std: 240,
}

/** Generate a normal-distribution curve from a CostDistribution */
function generateCurve(dist: CostDistribution): { x: number; y: number }[] {
  const mean = dist.avg > 0 ? dist.avg : dist.median
  const sigma = dist.std > 0 ? dist.std : Math.max(1, (dist.p75 - dist.p25) / 1.35)
  const xMin = Math.max(0, mean - 3.2 * sigma)
  const xMax = mean + 3.2 * sigma
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= 80; i++) {
    const x = xMin + (i / 80) * (xMax - xMin)
    const y =
      Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
    pts.push({ x: Math.round(x), y: parseFloat(y.toFixed(6)) })
  }
  return pts
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({
  label, sub, value, min, max, step, format, onChange, primary = false,
}: {
  label: string
  sub?: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  primary?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between mb-1">
        <div className="flex items-baseline gap-1.5">
          <span className={primary ? 'text-xs font-semibold text-body' : 'text-[11px] font-semibold text-subtle uppercase tracking-wider'}>
            {label}
          </span>
          {sub && <span className="text-[10px] text-subtle">{sub}</span>}
        </div>
        <span className={primary ? 'text-sm font-bold text-body' : 'text-xs font-bold text-subtle'}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full appearance-none rounded-full cursor-pointer"
        style={{
          height: primary ? '6px' : '4px',
          background: `linear-gradient(to right, #005b94 ${pct}%, #e5e7eb 0%)`,
          accentColor: '#005b94',
        }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-subtle">{format(min)}</span>
        <span className="text-[10px] text-subtle">{format(max)}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function StressTestPanel({
  params,
  onParamsChange,
  annualSpend,
  eriScore,
  serverNetSaving,
  serverBaseline,
  venues,
  hubCentroid,
  isLoading,
  breakevenSeats,
  city,
  state,
  baselineParams,
}: Props) {
  const [local, setLocal] = useState<StressTestParams>(params)
  const [dist, setDist] = useState<CostDistribution | null>(null)
  const [distLoading, setDistLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Keep local in sync if parent restores a session (params reference changes)
  useEffect(() => { setLocal(params) }, [params])

  // Fetch cost-per-seat distribution for this market
  useEffect(() => {
    if (!city || !state) return
    setDistLoading(true)
    fetch(
      `/api/pulse/cost-distribution?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`
    )
      .then(r => r.json())
      .then(d => { if (d?.distribution) setDist(d.distribution) })
      .catch(() => {})
      .finally(() => setDistLoading(false))
  }, [city, state])

  const effectiveDist = dist ?? NATIONAL_DIST
  const curveData = useMemo(() => generateCurve(effectiveDist), [effectiveDist])

  // Cost slider range — p10 × 0.8 → p90 × 1.3
  const costSliderMin = Math.max(50, Math.round(effectiveDist.p10 * 0.8))
  const costSliderMax = Math.round(effectiveDist.p90 * 1.3)

  // ── Param update helper ──────────────────────────────────────────────────────

  function update(patch: Partial<StressTestParams>) {
    const merged = { ...local, ...patch }
    // Always re-derive hubCostMonthly from capacity × cost-per-seat
    merged.hubCostMonthly = merged.hubCapacitySeats * merged.costPerSeatMonthly
    setLocal(merged)
    onParamsChange(merged)
  }

  // ── Economics ────────────────────────────────────────────────────────────────

  const hubMonthly = local.hubCapacitySeats * local.costPerSeatMonthly
  const hubAnnual = hubMonthly * 12

  const displayNetSaving =
    !isLoading && serverNetSaving != null
      ? serverNetSaving
      : annualSpend * (1 + local.inducedDemandUpliftPct / 100) - hubAnnual

  const displayBaseline =
    !isLoading && serverBaseline != null ? serverBaseline : annualSpend

  const baselineNet = displayBaseline - hubAnnual

  const genuinelyPositive = baselineNet >= 0 && (eriScore == null || eriScore >= 40)
  const savingBg = genuinelyPositive
    ? 'bg-green-50' : displayNetSaving > 0 ? 'bg-orange-50' : 'bg-red-50'
  const savingText = genuinelyPositive
    ? 'text-success' : displayNetSaving > 0 ? 'text-warning' : 'text-danger'

  // ── Live venue coverage ───────────────────────────────────────────────────────

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

  // ── Breakeven ─────────────────────────────────────────────────────────────────

  const breakevenOk =
    breakevenSeats != null ? local.hubCapacitySeats >= breakevenSeats : null
  const breakevenDelta =
    breakevenSeats != null ? local.hubCapacitySeats - breakevenSeats : null

  // ── Percentile guide lines for chart ─────────────────────────────────────────

  const pctLines = [
    { key: 'p10',    value: effectiveDist.p10,    label: 'P10' },
    { key: 'p25',    value: effectiveDist.p25,    label: 'P25' },
    { key: 'median', value: effectiveDist.median, label: 'Med' },
    { key: 'p75',    value: effectiveDist.p75,    label: 'P75' },
    { key: 'p90',    value: effectiveDist.p90,    label: 'P90' },
  ]

  // ── Save scenario ─────────────────────────────────────────────────────────────

  function handleSave() {
    const scenario: SavedScenario = {
      id: `scenario-${Date.now()}`,
      name: `${city ?? 'Market'} · ${local.hubCapacitySeats} seats · $${local.costPerSeatMonthly}/seat`,
      savedAt: new Date(),
      params: { ...local },
      hvs_composite: 0,
      net_saving: displayNetSaving,
    }
    window.dispatchEvent(new CustomEvent('scenario-saved', { detail: scenario }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function handleRevert() {
    if (!baselineParams) return
    setLocal(baselineParams)
    onParamsChange(baselineParams)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Stress Test</div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-[11px] text-subtle">
            <Loader2 size={10} className="animate-spin text-ls-500" /> Recalculating
          </div>
        )}
      </div>

      {/* ── Primary levers ── */}
      <div className="flex flex-col gap-4 mb-4">

        {/* Hub Capacity — primary */}
        <SliderRow
          label="Hub Capacity"
          sub="seats"
          value={local.hubCapacitySeats}
          min={2} max={200} step={1}
          format={v => `${v} seats`}
          onChange={v => update({ hubCapacitySeats: v })}
          primary
        />

        {/* Commute Radius — primary */}
        <div>
          <SliderRow
            label="Commute Radius"
            value={local.commuteRadiusMiles}
            min={10} max={100} step={5}
            format={v => `${v} mi`}
            onChange={v => update({ commuteRadiusMiles: v })}
            primary
          />
          {/* Live venue coverage badge */}
          {coverage && (
            <div
              className={`flex items-center justify-between mt-1.5 text-[10px] px-0.5 ${
                coverage.allCaptured ? 'text-subtle' : 'text-warning'
              }`}
            >
              <span>
                {coverage.venuesIn} of {coverage.venuesTotal} venue
                {coverage.venuesTotal !== 1 ? 's' : ''} within radius
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

      {/* ── Cost per Seat / Month (distribution) ── */}
      <div className="mb-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-semibold text-subtle uppercase tracking-wider">
            Cost per Seat / Month
          </div>
          {distLoading ? (
            <Loader2 size={10} className="animate-spin text-subtle" />
          ) : (
            <span className="text-[10px] text-subtle">
              {effectiveDist.listing_count > 0
                ? `${effectiveDist.listing_count} Pulse listings`
                : 'National median'}
            </span>
          )}
        </div>

        {/* Bell-curve chart */}
        <div className="h-16 mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={curveData}
              margin={{ top: 2, right: 2, bottom: 0, left: 2 }}
            >
              <defs>
                <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#005b94" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#005b94" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                hide
              />
              <YAxis hide />

              {/* Distribution curve */}
              <Area
                type="monotone"
                dataKey="y"
                stroke="#005b94"
                strokeWidth={1.5}
                fill="url(#distGrad)"
                dot={false}
                isAnimationActive={false}
              />

              {/* Percentile guide lines */}
              {pctLines.map(p => (
                <ReferenceLine
                  key={p.key}
                  x={p.value}
                  stroke={p.key === 'median' ? '#005b94' : '#cbd5e1'}
                  strokeWidth={p.key === 'median' ? 1.5 : 1}
                  strokeDasharray={p.key === 'median' ? undefined : '3 2'}
                />
              ))}

              {/* User-selected cost marker */}
              <ReferenceLine
                x={local.costPerSeatMonthly}
                stroke="#f59e0b"
                strokeWidth={2}
              />

              <Tooltip
                formatter={(val: number) => [`$${Math.round(val * 10000) / 100}`, 'Density']}
                labelFormatter={v => `$${v}/mo`}
                contentStyle={{ fontSize: 10, padding: '2px 6px' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Percentile labels row */}
        <div className="flex justify-between text-[9px] text-subtle mb-2 px-0.5">
          <span>P10 ${effectiveDist.p10}</span>
          <span>P25 ${effectiveDist.p25}</span>
          <span className="font-semibold text-ls-600">Med ${effectiveDist.median}</span>
          <span>P75 ${effectiveDist.p75}</span>
          <span>P90 ${effectiveDist.p90}</span>
        </div>

        {/* Cost slider */}
        <SliderRow
          label="Selected cost / seat"
          value={local.costPerSeatMonthly}
          min={costSliderMin}
          max={costSliderMax}
          step={10}
          format={v => `$${v}/mo`}
          onChange={v => update({ costPerSeatMonthly: v })}
        />
      </div>

      {/* ── Hub Annual Cost (derived, read-only) ── */}
      <div className="bg-page rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
        <div className="text-[11px] text-subtle">Hub Annual Cost</div>
        <div className="text-right">
          <div className="text-sm font-bold text-body">{formatCurrency(hubAnnual, true)}</div>
          <div className="text-[9px] text-subtle mt-0.5">
            {local.hubCapacitySeats} seats × ${local.costPerSeatMonthly}/mo × 12
          </div>
        </div>
      </div>

      {/* ── Breakeven comparison ── */}
      {breakevenSeats != null && (
        <div
          className={`rounded-lg px-3 py-2 mb-3 flex items-center justify-between border ${
            breakevenOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div>
            <div
              className={`text-[11px] font-semibold ${
                breakevenOk ? 'text-success' : 'text-danger'
              }`}
            >
              {breakevenOk ? '✓ Above breakeven' : '✗ Below breakeven'}
            </div>
            <div className="text-[10px] text-subtle mt-0.5">
              Required: {breakevenSeats} seats · Your hub: {local.hubCapacitySeats} seats
            </div>
          </div>
          <div
            className={`text-xl font-bold leading-none ${
              breakevenOk ? 'text-success' : 'text-danger'
            }`}
          >
            {breakevenDelta !== null && breakevenDelta > 0 ? '+' : ''}
            {breakevenDelta}
          </div>
        </div>
      )}

      {/* ── Tertiary: Induced Demand Uplift ── */}
      <div className="mb-4 pt-3 border-t border-border">
        <SliderRow
          label="Induced Demand Uplift"
          sub="(optional)"
          value={local.inducedDemandUpliftPct}
          min={0} max={100} step={5}
          format={v => `+${v}%`}
          onChange={v => update({ inducedDemandUpliftPct: v })}
        />
      </div>

      {/* ── Net Economics ── */}
      <div className="pt-3 border-t border-border mb-4">
        <div className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
          Net Economics
        </div>

        {/* Print-only: static table */}
        <div className="print-stress-static hidden grid-cols-3 gap-2 mb-3 text-center">
          {[
            ['Capacity', `${local.hubCapacitySeats} seats`],
            ['Cost/Seat', `$${local.costPerSeatMonthly}/mo`],
            ['Commute', `${local.commuteRadiusMiles} mi`],
            ['Uplift', `+${local.inducedDemandUpliftPct}%`],
            ['Hub Annual', formatCurrency(hubAnnual, true)],
          ].map(([lbl, val]) => (
            <div key={lbl} className="bg-page rounded-lg p-2 border border-border">
              <div className="text-[10px] text-subtle">{lbl}</div>
              <div className="text-xs font-bold text-body mt-0.5">{val}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-page rounded-lg p-2.5">
            <div className="text-[11px] text-subtle">Annual Flex Spend</div>
            <div className="text-sm font-bold text-body mt-0.5">
              {formatCurrency(displayBaseline, true)}
            </div>
          </div>
          <div className={`rounded-lg p-2.5 ${isLoading ? 'bg-page' : savingBg}`}>
            <div className="text-[11px] text-subtle flex items-center gap-1">
              Net Saving
              {!isLoading && baselineNet < 0 && displayNetSaving > 0 && (
                <span className="text-[9px] font-semibold text-warning bg-orange-100 border border-orange-200 px-1 rounded">
                  uplift
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center gap-1 mt-0.5 text-subtle">
                <Loader2 size={11} className="animate-spin" />
                <span className="text-[11px]">…</span>
              </div>
            ) : (
              <>
                <div className={`text-sm font-bold mt-0.5 ${savingText}`}>
                  {displayNetSaving > 0 ? '+' : ''}
                  {formatCurrency(displayNetSaving, true)}
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

      {/* ── Actions ── */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saved}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-ls-500 text-white rounded-lg text-xs font-semibold hover:bg-ls-600 disabled:opacity-70 transition-colors"
        >
          {saved ? <CheckCircle size={11} /> : <Save size={11} />}
          {saved ? 'Saved!' : 'Save Scenario'}
        </button>
        {baselineParams && (
          <button
            onClick={handleRevert}
            title="Revert to baseline parameters"
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-page border border-border text-body rounded-lg text-xs hover:bg-ls-50 hover:border-ls-300 transition-colors"
          >
            <RotateCcw size={11} />
            Revert
          </button>
        )}
      </div>
    </div>
  )
}
