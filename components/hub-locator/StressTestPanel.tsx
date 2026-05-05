'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer,
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
  serverNetSaving?: number
  serverBaseline?: number
  venues?: VenueLocation[]
  hubCentroid?: { lat: number; lng: number } | null
  isLoading?: boolean
  breakevenSeats?: number
  city?: string
  state?: string
  baselineParams?: StressTestParams
  /** Render as a full-width horizontal strip (default: false = vertical card) */
  horizontal?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NATIONAL_DIST: CostDistribution = {
  city: '', state: '', listing_count: 0,
  min: 150, p10: 200, p25: 280, median: 420, p75: 650, p90: 900, max: 1200, avg: 450, std: 240,
}

function generateCurve(dist: CostDistribution): { x: number; y: number }[] {
  const mean = dist.avg > 0 ? dist.avg : dist.median
  const sigma = dist.std > 0 ? dist.std : Math.max(1, (dist.p75 - dist.p25) / 1.35)
  const xMin = Math.max(0, mean - 3.2 * sigma)
  const xMax = mean + 3.2 * sigma
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= 80; i++) {
    const x = xMin + (i / 80) * (xMax - xMin)
    const y = Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
    pts.push({ x: Math.round(x), y: parseFloat(y.toFixed(6)) })
  }
  return pts
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({
  label, sub, value, min, max, step, format, onChange, primary = false,
}: {
  label: string; sub?: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void; primary?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between mb-1">
        <div className="flex items-baseline gap-1.5">
          <span className={primary
            ? 'text-xs font-semibold text-body'
            : 'text-[11px] font-semibold text-subtle uppercase tracking-wider'}>
            {label}
          </span>
          {sub && <span className="text-[10px] text-subtle">{sub}</span>}
        </div>
        <span className={primary ? 'text-sm font-bold text-body' : 'text-xs font-bold text-subtle'}>
          {format(value)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
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

function DistributionChart({
  curveData, pctLines, selectedCost, height = 64,
}: {
  curveData: { x: number; y: number }[]
  pctLines: { key: string; value: number }[]
  selectedCost: number
  height?: number
}) {
  return (
    // pointer-events:none prevents the recharts SVG from swallowing mouse events
    // that belong to sibling/parent sliders
    <div style={{ height, pointerEvents: 'none', overflow: 'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curveData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#005b94" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#005b94" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} hide />
          <YAxis hide />
          <Area
            type="monotone" dataKey="y"
            stroke="#005b94" strokeWidth={1.5}
            fill="url(#distGrad)" dot={false} isAnimationActive={false}
          />
          {pctLines.map(p => (
            <ReferenceLine
              key={p.key} x={p.value}
              stroke={p.key === 'median' ? '#005b94' : '#cbd5e1'}
              strokeWidth={p.key === 'median' ? 1.5 : 1}
              strokeDasharray={p.key === 'median' ? undefined : '3 2'}
            />
          ))}
          <ReferenceLine x={selectedCost} stroke="#f59e0b" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function StressTestPanel({
  params, onParamsChange, annualSpend, eriScore,
  serverNetSaving, serverBaseline, venues, hubCentroid,
  isLoading, breakevenSeats, city, state, baselineParams,
  horizontal = false,
}: Props) {
  const [local, setLocal] = useState<StressTestParams>(params)
  const [dist, setDist] = useState<CostDistribution | null>(null)
  const [distLoading, setDistLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // NOTE: No useEffect sync here. Local state is the source of truth for
  // slider positions. Session restore causes a full remount via key prop in
  // CanvasRenderer, which re-initialises useState(params) correctly.

  useEffect(() => {
    if (!city || !state) return
    setDistLoading(true)
    fetch(`/api/pulse/cost-distribution?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      .then(r => r.json())
      .then(d => { if (d?.distribution) setDist(d.distribution) })
      .catch(() => {})
      .finally(() => setDistLoading(false))
  }, [city, state])

  const effectiveDist = dist ?? NATIONAL_DIST
  const curveData = useMemo(() => generateCurve(effectiveDist), [effectiveDist])

  const costSliderMin = Math.max(50, Math.round(effectiveDist.p10 * 0.8))
  const costSliderMax = Math.round(effectiveDist.p90 * 1.3)

  function update(patch: Partial<StressTestParams>) {
    const merged = { ...local, ...patch }
    merged.hubCostMonthly = merged.hubCapacitySeats * merged.costPerSeatMonthly
    setLocal(merged)
    onParamsChange(merged)
  }

  const hubMonthly = local.hubCapacitySeats * local.costPerSeatMonthly
  const hubAnnual = hubMonthly * 12

  const displayNetSaving = displayBaseline * (1 + local.inducedDemandUpliftPct / 100) - hubAnnual

  const displayBaseline = !isLoading && serverBaseline != null ? serverBaseline : annualSpend
  const baselineNet = displayBaseline - hubAnnual

  const genuinelyPositive = baselineNet >= 0 && (eriScore == null || eriScore >= 40)
  const savingBg   = genuinelyPositive ? 'bg-green-50'  : displayNetSaving > 0 ? 'bg-orange-50' : 'bg-red-50'
  const savingText = genuinelyPositive ? 'text-success' : displayNetSaving > 0 ? 'text-warning'  : 'text-danger'

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

  const breakevenOk    = breakevenSeats != null ? local.hubCapacitySeats >= breakevenSeats : null
  const breakevenDelta = breakevenSeats != null ? local.hubCapacitySeats - breakevenSeats  : null

  const pctLines = [
    { key: 'p10',    value: effectiveDist.p10 },
    { key: 'p25',    value: effectiveDist.p25 },
    { key: 'median', value: effectiveDist.median },
    { key: 'p75',    value: effectiveDist.p75 },
    { key: 'p90',    value: effectiveDist.p90 },
  ]

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

  // ── HORIZONTAL layout ─────────────────────────────────────────────────────

  if (horizontal) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Stress Test</div>
            {isLoading && (
              <div className="flex items-center gap-1 text-[11px] text-subtle">
                <Loader2 size={10} className="animate-spin text-ls-500" /> Recalculating…
              </div>
            )}
          </div>
          {/* Actions pinned to header */}
          <div className="flex items-center gap-2">
            {baselineParams && (
              <button
                onClick={handleRevert}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-page border border-border text-body rounded-lg text-xs hover:bg-ls-50 hover:border-ls-300 transition-colors"
              >
                <RotateCcw size={10} /> Revert
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saved}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ls-500 text-white rounded-lg text-xs font-semibold hover:bg-ls-600 disabled:opacity-70 transition-colors"
            >
              {saved ? <CheckCircle size={10} /> : <Save size={10} />}
              {saved ? 'Saved!' : 'Save Scenario'}
            </button>
          </div>
        </div>

        {/* 4 equal flex columns separated by dividers */}
        <div className="flex items-stretch min-w-0">

          {/* ── Col 1: Primary Levers — flex-1 ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 pr-4">
            <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider">Primary Levers</div>
            <SliderRow
              label="Hub Capacity" sub="seats"
              value={local.hubCapacitySeats} min={2} max={200} step={1}
              format={v => `${v} seats`}
              onChange={v => update({ hubCapacitySeats: v })}
              primary
            />
            <div>
              <SliderRow
                label="Commute Radius"
                value={local.commuteRadiusMiles} min={10} max={100} step={5}
                format={v => `${v} mi`}
                onChange={v => update({ commuteRadiusMiles: v })}
                primary
              />
              {coverage && (
                <div className={`flex justify-between mt-1 text-[10px] px-0.5 ${coverage.allCaptured ? 'text-subtle' : 'text-warning'}`}>
                  <span>{coverage.venuesIn}/{coverage.venuesTotal} venues</span>
                  <span className="font-semibold">{coverage.spendPct}% spend</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border">
              <SliderRow
                label="Demand Uplift" sub="optional"
                value={local.inducedDemandUpliftPct} min={0} max={100} step={5}
                format={v => `+${v}%`}
                onChange={v => update({ inducedDemandUpliftPct: v })}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border flex-shrink-0 mx-0" />

          {/* ── Col 2: Cost Distribution — flex-[1.4] (chart needs extra breathing room) ── */}
          <div className="flex-[1.4] min-w-0 flex flex-col px-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider">Cost / Seat / Month</div>
              {distLoading
                ? <Loader2 size={10} className="animate-spin text-subtle" />
                : <span className="text-[10px] text-subtle">{effectiveDist.listing_count > 0 ? `${effectiveDist.listing_count} listings` : 'National'}</span>
              }
            </div>
            <DistributionChart curveData={curveData} pctLines={pctLines} selectedCost={local.costPerSeatMonthly} height={68} />
            <div className="flex justify-between text-[9px] text-subtle my-1 px-0.5 tabular-nums">
              <span>P10&thinsp;${effectiveDist.p10}</span>
              <span>P25&thinsp;${effectiveDist.p25}</span>
              <span className="font-semibold text-ls-600">Med&thinsp;${effectiveDist.median}</span>
              <span>P75&thinsp;${effectiveDist.p75}</span>
              <span>P90&thinsp;${effectiveDist.p90}</span>
            </div>
            <SliderRow
              label="Selected cost / seat"
              value={local.costPerSeatMonthly}
              min={costSliderMin} max={costSliderMax} step={10}
              format={v => `$${v}/mo`}
              onChange={v => update({ costPerSeatMonthly: v })}
            />
          </div>

          {/* Divider */}
          <div className="w-px bg-border flex-shrink-0 mx-0" />

          {/* ── Col 3+4: Economics (consolidated) — flex-[1.2] ── */}
          <div className="flex-[1.2] min-w-0 flex flex-col px-4">
            <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-3">Economics</div>

            {/* Inputs: Flex Spend − Hub Cost (compact, supporting data) */}
            <div className="flex items-start gap-2.5 mb-3">
              <div className="min-w-0">
                <div className="text-[10px] text-subtle mb-0.5">Flex Spend</div>
                <div className="text-sm font-bold text-body tabular-nums leading-tight">
                  {formatCurrency(displayBaseline, true)}
                </div>
              </div>
              <div className="text-[10px] text-subtle mt-[18px] flex-shrink-0 select-none">−</div>
              <div className="min-w-0">
                <div className="text-[10px] text-subtle mb-0.5">Hub Cost</div>
                <div className="text-sm font-bold text-body tabular-nums leading-tight">
                  {formatCurrency(hubAnnual, true)}
                </div>
                <div className="text-[9px] text-subtle tabular-nums mt-0.5 leading-tight">
                  {local.hubCapacitySeats} × ${local.costPerSeatMonthly}/mo
                </div>
                {breakevenSeats != null && (
                  <div className={`text-[9px] font-semibold mt-0.5 leading-tight ${breakevenOk ? 'text-success' : 'text-danger'}`}>
                    {breakevenOk ? '✓ breakeven' : '✗ breakeven'}
                  </div>
                )}
              </div>
            </div>

            {/* Net Saving hero — owns the remaining height, centered within it */}
            <div className="flex-1 border-t border-border pt-3 flex flex-col justify-center">
              <div className="text-[10px] text-subtle mb-1.5">Net Saving</div>
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-subtle" />
                  <span className="text-xs text-subtle">Recalculating…</span>
                </div>
              ) : (
                <>
                  <div className={`text-3xl font-bold tabular-nums leading-none ${savingText}`}>
                    {displayNetSaving > 0 ? '+' : ''}{formatCurrency(displayNetSaving, true)}
                  </div>
                  <div className="text-[10px] text-subtle mt-1.5">annual vs. current flex spend</div>
                  {baselineNet < 0 && displayNetSaving > 0 && (
                    <div className="text-[9px] text-warning mt-1">uplift-dependent</div>
                  )}
                </>
              )}
            </div>

          </div>

        </div>
      </div>
    )
  }

  // ── VERTICAL layout (original, for standalone page) ───────────────────────

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Stress Test</div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-[11px] text-subtle">
            <Loader2 size={10} className="animate-spin text-ls-500" /> Recalculating
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <SliderRow label="Hub Capacity" sub="seats"
          value={local.hubCapacitySeats} min={2} max={200} step={1}
          format={v => `${v} seats`} onChange={v => update({ hubCapacitySeats: v })} primary />
        <div>
          <SliderRow label="Commute Radius"
            value={local.commuteRadiusMiles} min={10} max={100} step={5}
            format={v => `${v} mi`} onChange={v => update({ commuteRadiusMiles: v })} primary />
          {coverage && (
            <div className={`flex items-center justify-between mt-1.5 text-[10px] px-0.5 ${coverage.allCaptured ? 'text-subtle' : 'text-warning'}`}>
              <span>{coverage.venuesIn} of {coverage.venuesTotal} venue{coverage.venuesTotal !== 1 ? 's' : ''} within radius</span>
              <span className={`font-semibold ${coverage.allCaptured ? 'text-subtle' : 'text-warning'}`}>{coverage.spendPct}% of spend</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-semibold text-subtle uppercase tracking-wider">Cost per Seat / Month</div>
          {distLoading
            ? <Loader2 size={10} className="animate-spin text-subtle" />
            : <span className="text-[10px] text-subtle">{effectiveDist.listing_count > 0 ? `${effectiveDist.listing_count} Pulse listings` : 'National median'}</span>
          }
        </div>
        <DistributionChart curveData={curveData} pctLines={pctLines} selectedCost={local.costPerSeatMonthly} height={64} />
        <div className="flex justify-between text-[9px] text-subtle mb-2 px-0.5">
          <span>P10 ${effectiveDist.p10}</span>
          <span>P25 ${effectiveDist.p25}</span>
          <span className="font-semibold text-ls-600">Med ${effectiveDist.median}</span>
          <span>P75 ${effectiveDist.p75}</span>
          <span>P90 ${effectiveDist.p90}</span>
        </div>
        <SliderRow label="Selected cost / seat"
          value={local.costPerSeatMonthly} min={costSliderMin} max={costSliderMax} step={10}
          format={v => `$${v}/mo`} onChange={v => update({ costPerSeatMonthly: v })} />
      </div>

      <div className="bg-page rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
        <div className="text-[11px] text-subtle">Hub Annual Cost</div>
        <div className="text-right">
          <div className="text-sm font-bold text-body">{formatCurrency(hubAnnual, true)}</div>
          <div className="text-[9px] text-subtle mt-0.5">{local.hubCapacitySeats} × ${local.costPerSeatMonthly} × 12</div>
        </div>
      </div>

      {breakevenSeats != null && (
        <div className={`rounded-lg px-3 py-2 mb-3 flex items-center justify-between border ${breakevenOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div>
            <div className={`text-[11px] font-semibold ${breakevenOk ? 'text-success' : 'text-danger'}`}>
              {breakevenOk ? '✓ Above breakeven' : '✗ Below breakeven'}
            </div>
            <div className="text-[10px] text-subtle mt-0.5">Required: {breakevenSeats} seats · Hub: {local.hubCapacitySeats} seats</div>
          </div>
          <div className={`text-xl font-bold leading-none ${breakevenOk ? 'text-success' : 'text-danger'}`}>
            {breakevenDelta !== null && breakevenDelta > 0 ? '+' : ''}{breakevenDelta}
          </div>
        </div>
      )}

      <div className="mb-4 pt-3 border-t border-border">
        <SliderRow label="Induced Demand Uplift" sub="(optional)"
          value={local.inducedDemandUpliftPct} min={0} max={100} step={5}
          format={v => `+${v}%`} onChange={v => update({ inducedDemandUpliftPct: v })} />
      </div>

      <div className="pt-3 border-t border-border mb-4">
        <div className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">Net Economics</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-page rounded-lg p-2.5">
            <div className="text-[11px] text-subtle">Annual Flex Spend</div>
            <div className="text-sm font-bold text-body mt-0.5">{formatCurrency(displayBaseline, true)}</div>
          </div>
          <div className={`rounded-lg p-2.5 ${isLoading ? 'bg-page' : savingBg}`}>
            <div className="text-[11px] text-subtle flex items-center gap-1">
              Net Saving
              {!isLoading && baselineNet < 0 && displayNetSaving > 0 && (
                <span className="text-[9px] font-semibold text-warning bg-orange-100 border border-orange-200 px-1 rounded">uplift</span>
              )}
            </div>
            {isLoading
              ? <div className="flex items-center gap-1 mt-0.5"><Loader2 size={11} className="animate-spin text-subtle" /><span className="text-[11px] text-subtle">…</span></div>
              : <>
                  <div className={`text-sm font-bold mt-0.5 ${savingText}`}>
                    {displayNetSaving > 0 ? '+' : ''}{formatCurrency(displayNetSaving, true)}
                  </div>
                  {baselineNet < 0 && displayNetSaving > 0 && (
                    <div className="text-[9px] text-warning mt-0.5">–${Math.round(Math.abs(baselineNet) / 1000)}K without uplift</div>
                  )}
                </>
            }
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saved}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-ls-500 text-white rounded-lg text-xs font-semibold hover:bg-ls-600 disabled:opacity-70 transition-colors">
          {saved ? <CheckCircle size={11} /> : <Save size={11} />}
          {saved ? 'Saved!' : 'Save Scenario'}
        </button>
        {baselineParams && (
          <button onClick={handleRevert}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-page border border-border text-body rounded-lg text-xs hover:bg-ls-50 hover:border-ls-300 transition-colors">
            <RotateCcw size={11} /> Revert
          </button>
        )}
      </div>
    </div>
  )
}
