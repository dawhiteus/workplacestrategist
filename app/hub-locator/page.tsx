'use client'

import { useEffect, useState } from 'react'
import {
  MapPin, TrendingUp, DollarSign, BarChart3, Scale, X,
  Building2, Globe, Users, AlertTriangle, GitFork, Zap,
  type LucideIcon,
} from 'lucide-react'
import type { MetroSummary } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useEnterprise } from '@/lib/enterprise-context'
import { PLATFORM_STATS } from '@/lib/prospect-constants'

// ── Types ─────────────────────────────────────────────────────────────────────

type CardAction =
  | { type: 'canvas'; city: string; state: string; hubCost?: number }
  | { type: 'compare'; metros: Array<{ city: string; state: string }> }
  | { type: 'ranking'; sortBy: 'spend' | 'concentration' }

// ── Starter analyses ──────────────────────────────────────────────────────────

const STATIC_CARDS: Array<{
  icon: LucideIcon
  label: string
  headline: string
  action: CardAction
}> = [
  {
    icon: TrendingUp,
    label: 'Portfolio Ranking',
    headline: 'Which markets have the highest activity?',
    action: { type: 'ranking', sortBy: 'spend' },
  },
  {
    icon: BarChart3,
    label: 'Demand Patterns',
    headline: 'Where is demand most concentrated?',
    action: { type: 'ranking', sortBy: 'concentration' },
  },
]

// ── Portfolio stat derivation ─────────────────────────────────────────────────

interface PortfolioStats {
  totalMarkets: number
  totalStates: number
  totalSpend: number
  totalReservations: number
  totalMembers: number
  hubCandidates: MetroSummary[]
  topSpendMarket: MetroSummary
  secondSpendMarket: MetroSummary
  top2ConcentrationPct: number
  avgSpendPerBooking: number
  mostFragmented: MetroSummary           // highest venue count among top-20 by bookings
  spendOutlier: MetroSummary | null      // highest-volume market with spend/booking far below avg
  spendOutlierRatio: number              // how far below avg (0–1)
}

function deriveStats(metros: MetroSummary[]): PortfolioStats | null {
  if (metros.length === 0) return null
  const totalSpend = metros.reduce((s, m) => s + m.total_spend, 0)
  const totalReservations = metros.reduce((s, m) => s + m.reservations, 0)
  const totalMembers = metros.reduce((s, m) => s + m.members, 0)
  const states = new Set(metros.map(m => m.state)).size
  const avgSpendPerBooking = totalSpend / totalReservations

  const bySpend = [...metros].sort((a, b) => b.total_spend - a.total_spend)
  const hubCandidates = metros.filter(m => m.total_spend >= 25000)
  const top2Spend = bySpend[0].total_spend + (bySpend[1]?.total_spend ?? 0)
  const top2ConcentrationPct = Math.round((top2Spend / totalSpend) * 100)

  // Most fragmented: highest venue count among markets with ≥ 100 reservations
  const highVolume = metros.filter(m => m.reservations >= 100)
  const mostFragmented = [...highVolume].sort((a, b) => b.venues - a.venues)[0] ?? bySpend[0]

  // Spend outlier: market with ≥ 100 reservations and spend/booking far below portfolio avg
  const outlierCandidates = metros
    .filter(m => m.reservations >= 100 && m.venues > 0)
    .map(m => ({ m, ratio: (m.total_spend / m.reservations) / avgSpendPerBooking }))
    .sort((a, b) => a.ratio - b.ratio)
  const outlier = outlierCandidates[0]

  return {
    totalMarkets: metros.length,
    totalStates: states,
    totalSpend,
    totalReservations,
    totalMembers,
    hubCandidates,
    topSpendMarket: bySpend[0],
    secondSpendMarket: bySpend[1],
    top2ConcentrationPct,
    avgSpendPerBooking: Math.round(avgSpendPerBooking),
    mostFragmented,
    spendOutlier: outlier?.m ?? null,
    spendOutlierRatio: outlier?.ratio ?? 1,
  }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  accent?: 'blue' | 'green' | 'amber' | 'purple'
  onClick?: () => void
}) {
  const colors = {
    blue:   { icon: 'text-ls-500',   bg: 'bg-ls-50',     border: 'border-ls-100' },
    green:  { icon: 'text-success',  bg: 'bg-green-50',  border: 'border-green-100' },
    amber:  { icon: 'text-warning',  bg: 'bg-orange-50', border: 'border-orange-100' },
    purple: { icon: 'text-purple',   bg: 'bg-purple-50', border: 'border-purple-100' },
  }
  const c = colors[accent ?? 'blue']

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border border-border p-4 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-ls-300 hover:shadow-sm transition-all' : ''}`}
    >
      <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
        <Icon size={15} className={c.icon} />
      </div>
      <div>
        <div className="text-[10px] font-semibold text-disabled uppercase tracking-wider mb-1">{label}</div>
        <div className="text-xl font-bold text-body leading-tight">{value}</div>
        <div className="text-xs text-subtle mt-1">{sub}</div>
      </div>
    </div>
  )
}

const INSIGHT_COLORS = {
  amber:  { border: '#f59e0b', icon: '#f59e0b', label: '#b45309' },
  teal:   { border: '#00b8c4', icon: '#00b8c4', label: '#007a80' },
  purple: { border: '#7c3aed', icon: '#7c3aed', label: '#5b21b6' },
}

function InsightBanner({
  icon: Icon,
  headline,
  body,
  cta,
  onCta,
  variant = 'amber',
}: {
  icon: LucideIcon
  headline: string
  body: string
  cta: string
  onCta: () => void
  variant?: 'amber' | 'teal' | 'purple'
}) {
  const c = INSIGHT_COLORS[variant]
  return (
    <div
      className="bg-card border border-border rounded-xl flex items-start gap-3.5 px-4 py-3.5"
      style={{ borderLeftWidth: 3, borderLeftColor: c.border }}
    >
      <Icon size={14} className="flex-shrink-0 mt-0.5" style={{ color: c.icon }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold mb-0.5" style={{ color: c.label }}>{headline}</div>
        <div className="text-xs text-subtle leading-relaxed">{body}</div>
      </div>
      <button
        onClick={onCta}
        className="flex-shrink-0 text-xs font-semibold text-body hover:text-ls-600 transition-colors whitespace-nowrap"
      >
        {cta} →
      </button>
    </div>
  )
}

// ── Compare card with market picker ──────────────────────────────────────────

function CompareCard({ metros, defaultMarkets, onCompare }: {
  metros: MetroSummary[]
  defaultMarkets: Array<{ city: string; state: string }>
  onCompare: (markets: Array<{ city: string; state: string }>) => void
}) {
  const [selected, setSelected] = useState<Array<{ city: string; state: string }>>(defaultMarkets)

  // Keep in sync if defaults change (data loads after mount)
  useEffect(() => {
    if (selected.length === 0 && defaultMarkets.length > 0) setSelected(defaultMarkets)
  }, [defaultMarkets]) // eslint-disable-line

  const remove = (city: string) => setSelected(s => s.filter(m => m.city !== city))
  const remaining = metros.filter(m => !selected.find(s => s.city === m.city))

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-card rounded-xl border border-border hover:border-ls-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-ls-50 border border-ls-100 flex items-center justify-center flex-shrink-0">
          <Scale size={13} className="text-ls-500" />
        </div>
        <div>
          <div className="text-[10px] font-semibold text-ls-500 uppercase tracking-wider mb-0.5">Market Comparison</div>
          <div className="text-xs font-medium text-body">Compare up to 3 markets side by side</div>
        </div>
      </div>

      {/* Selected market chips */}
      <div className="flex flex-wrap gap-1.5 pl-10">
        {selected.map(m => (
          <span key={m.city} className="inline-flex items-center gap-1 text-[10px] font-medium bg-ls-50 border border-ls-100 text-ls-600 px-2 py-0.5 rounded-pill">
            {m.city}
            <button onClick={() => remove(m.city)} className="hover:text-danger transition-colors ml-0.5">
              <X size={9} />
            </button>
          </span>
        ))}
        {selected.length < 3 && (
          <select
            value=""
            onChange={e => {
              if (!e.target.value) return
              const [city, state] = e.target.value.split('||')
              setSelected(s => [...s, { city, state }])
            }}
            className="text-[10px] text-ls-500 bg-transparent border-none cursor-pointer outline-none font-medium"
          >
            <option value="">+ Add market</option>
            {remaining.map(m => (
              <option key={m.city} value={`${m.city}||${m.state}`}>{m.city}, {m.state}</option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={() => selected.length >= 2 && onCompare(selected)}
        disabled={selected.length < 2}
        className="ml-10 text-left text-xs text-subtle hover:text-ls-500 disabled:opacity-30 transition-colors font-medium flex items-center gap-1"
      >
        Compare {selected.length} market{selected.length !== 1 ? 's' : ''} →
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HubLocatorPage() {
  const enterprise = useEnterprise()
  const isProspect = enterprise === 'PROSPECT'
  const [metros, setMetros] = useState<MetroSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pulse/metros?enterprise=${enterprise}`)
      .then(r => r.json())
      .then(d => setMetros(d.metros ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [enterprise])

  const stats = deriveStats(metros)

  function dispatch(action: CardAction) {
    if (action.type === 'canvas') {
      window.dispatchEvent(new CustomEvent('load-canvas', { detail: { city: action.city, state: action.state, hubCost: action.hubCost } }))
    } else if (action.type === 'compare') {
      window.dispatchEvent(new CustomEvent('load-compare', { detail: { metros: action.metros } }))
    } else {
      window.dispatchEvent(new CustomEvent('load-ranking', { detail: { sortBy: action.sortBy } }))
    }
  }

  // ── Benchmark Mode portfolio ─────────────────────────────────────────────────
  if (isProspect) {
    return (
      <div className="p-6 max-w-5xl">
        {/* Prospect header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold text-body">Hub Market Intelligence</h1>
            <span className="text-xs px-2 py-0.5 rounded-pill bg-purple-50 border border-purple-200 text-purple-700 font-medium">
              Benchmark Mode
            </span>
          </div>
          <p className="text-sm text-subtle mt-0.5">
            Explore hub viability across markets where enterprise clients are actively booking on the LiquidSpace platform.
            Scores represent a per-enterprise average based on real booking data.
          </p>
        </div>

        {/* Platform KPI tiles */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatTile icon={Globe}     label="Platform Markets"    value={`${PLATFORM_STATS.marketsWithData}+`}  sub="Markets with 3+ enterprise clients" accent="blue" />
          <StatTile icon={Building2} label="Enterprise Clients"  value={PLATFORM_STATS.totalEnterprises.toString()} sub="Active enterprise accounts" accent="purple" />
          <StatTile icon={Users}     label="Members Active"      value={PLATFORM_STATS.totalMembers.toLocaleString()} sub="Across all enterprise accounts" accent="amber" />
          <StatTile icon={DollarSign} label="Platform Bookings" value={`${Math.round(PLATFORM_STATS.totalBookings / 1000)}K+`} sub="Annual enterprise reservations" accent="green" />
        </div>

        {/* Prospect insight banner */}
        <div className="mb-5 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-1">How Benchmark Mode Works</div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
            <Zap size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-purple-700 mb-1">Benchmarks from real enterprise data</div>
              <p className="text-xs text-purple-700/80 leading-relaxed">
                Each market below shows a <strong>per-enterprise average</strong> — what a typical enterprise client books in that city.
                Select a market to see a full Hub Viability Score based on those benchmarks. Use the Stress Test panel
                inside any market to model your company's actual headcount and budget.
              </p>
            </div>
          </div>
        </div>

        {/* Market grid */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-2">
            Top Markets by Enterprise Activity
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {metros.map((m, i) => (
                <button
                  key={`${m.city}-${m.state}`}
                  onClick={() => window.dispatchEvent(new CustomEvent('load-canvas', { detail: { city: m.city, state: m.state, hubCost: 8000 } }))}
                  className="flex flex-col gap-1.5 p-3.5 bg-card rounded-xl border border-border hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-disabled w-4">#{i + 1}</span>
                      <span className="text-sm font-medium text-body group-hover:text-purple-700 transition-colors">
                        {m.city}, {m.state}
                      </span>
                    </div>
                    <span className="text-subtle group-hover:text-purple-500 transition-colors text-xs">→</span>
                  </div>
                  <div className="flex gap-3 pl-5">
                    <div>
                      <div className="text-[10px] text-disabled uppercase tracking-wider">Avg bkgs/yr</div>
                      <div className="text-xs font-semibold text-body">{m.reservations}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-disabled uppercase tracking-wider">Avg spend/yr</div>
                      <div className="text-xs font-semibold text-body">{formatCurrency(m.total_spend, true)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-disabled uppercase tracking-wider">Venues</div>
                      <div className="text-xs font-semibold text-body">{m.venues}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-body">Hub Locator</h1>
        <p className="text-sm text-subtle mt-0.5">
          Identify where Allstate's distributed workforce warrants a dedicated hub.
        </p>
      </div>

      {/* ── KPI tiles ── */}
      {loading ? (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 h-28 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <StatTile
              icon={Globe}
              label="Portfolio Footprint"
              value={`${stats.totalMarkets} markets`}
              sub={`Across ${stats.totalStates} states`}
              accent="blue"
            />
            <StatTile
              icon={DollarSign}
              label="Annual Portfolio Spend"
              value={formatCurrency(stats.totalSpend, true)}
              sub={`${stats.avgSpendPerBooking.toLocaleString()} avg per booking`}
              accent="green"
            />
            <StatTile
              icon={Building2}
              label="Hub Candidates"
              value={`${stats.hubCandidates.length} markets`}
              sub="Spend ≥ $25K — viable hub economics"
              accent="purple"
              onClick={() => window.dispatchEvent(new CustomEvent('load-ranking', { detail: { sortBy: 'spend', minSpend: 25000 } }))}
            />
            <StatTile
              icon={Users}
              label="Members Served"
              value={stats.totalMembers.toLocaleString()}
              sub={`${stats.totalReservations.toLocaleString()} reservations/yr`}
              accent="amber"
            />
          </div>

          {/* Portfolio Insights */}
          <div className="mb-5">
            <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-2">
              Portfolio Insights
            </div>
            <div className="flex flex-col gap-2">
              <InsightBanner
                variant="amber"
                icon={AlertTriangle}
                headline="Spend concentration risk"
                body={`${stats.topSpendMarket.city} and ${stats.secondSpendMarket.city} together account for ${stats.top2ConcentrationPct}% of total portfolio spend. A hub in either city would have outsized portfolio impact.`}
                cta={`Analyze ${stats.topSpendMarket.city}`}
                onCta={() => dispatch({ type: 'canvas', city: stats.topSpendMarket.city, state: stats.topSpendMarket.state })}
              />
              <InsightBanner
                variant="teal"
                icon={GitFork}
                headline="High fragmentation opportunity"
                body={`${stats.mostFragmented.city} is active across ${stats.mostFragmented.venues} venues for just ${stats.mostFragmented.reservations} bookings — the most fragmented market in the portfolio. A single hub would consolidate demand and reduce friction for employees.`}
                cta={`Analyze ${stats.mostFragmented.city}`}
                onCta={() => dispatch({ type: 'canvas', city: stats.mostFragmented.city, state: stats.mostFragmented.state })}
              />
              {stats.spendOutlier && stats.spendOutlierRatio < 0.35 && (
                <InsightBanner
                  variant="purple"
                  icon={TrendingUp}
                  headline="Anomalous spend-per-booking"
                  body={`${stats.spendOutlier.city} has ${stats.spendOutlier.reservations} reservations but spends only $${Math.round(stats.spendOutlier.total_spend / stats.spendOutlier.reservations)}/booking — ${Math.round((1 - stats.spendOutlierRatio) * 100)}% below the portfolio average. Employees may be using low-grade venues; a hub could raise quality without increasing cost.`}
                  cta={`Analyze ${stats.spendOutlier.city}`}
                  onCta={() => dispatch({ type: 'canvas', city: stats.spendOutlier!.city, state: stats.spendOutlier!.state })}
                />
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* ── Quick analyses ── */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-2">
          Quick Analyses
        </div>
        <div className="grid grid-cols-2 gap-2">

          {/* Dynamic top hub candidate card */}
          {stats && (
            <button
              onClick={() => dispatch({ type: 'canvas', city: stats.topSpendMarket.city, state: stats.topSpendMarket.state })}
              className="flex items-center gap-3 p-3.5 bg-card rounded-xl border border-ls-100 hover:border-ls-300 hover:bg-ls-50 transition-colors text-left group"
            >
              <div className="w-7 h-7 rounded-lg bg-ls-50 border border-ls-100 flex items-center justify-center flex-shrink-0 group-hover:bg-ls-100 transition-colors">
                <MapPin size={13} className="text-ls-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-ls-500 uppercase tracking-wider mb-0.5">Top Hub Candidate</div>
                <div className="text-xs font-medium text-body leading-snug">
                  Is {stats.topSpendMarket.city} ready for a dedicated hub?
                </div>
                <div className="text-[10px] text-subtle mt-0.5">
                  #{1} by spend · {formatCurrency(stats.topSpendMarket.total_spend, true)}/yr · {stats.topSpendMarket.venues} venues
                </div>
              </div>
              <span className="text-subtle group-hover:text-ls-500 transition-colors flex-shrink-0 text-sm">→</span>
            </button>
          )}

          {/* Budget simulator card */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('load-budget'))}
            className="flex items-center gap-3 p-3.5 bg-card rounded-xl border border-border hover:border-ls-300 hover:bg-ls-50 transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-ls-50 border border-ls-100 flex items-center justify-center flex-shrink-0 group-hover:bg-ls-100 transition-colors">
              <DollarSign size={13} className="text-ls-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-ls-500 uppercase tracking-wider mb-0.5">Budget Simulator</div>
              <div className="text-xs font-medium text-body leading-snug">
                What hub cost makes each market viable?
              </div>
              <div className="text-[10px] text-subtle mt-0.5">
                Drag a slider · see all {stats?.hubCandidates.length ?? '—'} candidates update live
              </div>
            </div>
            <span className="text-subtle group-hover:text-ls-500 transition-colors flex-shrink-0 text-sm">→</span>
          </button>

          {/* Static analyses */}
          {STATIC_CARDS.map(card => {
            const Icon = card.icon
            return (
              <button
                key={card.headline}
                onClick={() => dispatch(card.action)}
                className="flex items-center gap-3 p-3.5 bg-card rounded-xl border border-border hover:border-ls-300 hover:bg-ls-50 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-ls-50 border border-ls-100 flex items-center justify-center flex-shrink-0 group-hover:bg-ls-100 transition-colors">
                  <Icon size={13} className="text-ls-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-ls-500 uppercase tracking-wider mb-0.5">{card.label}</div>
                  <div className="text-xs font-medium text-body leading-snug">{card.headline}</div>
                </div>
                <span className="text-subtle group-hover:text-ls-500 transition-colors flex-shrink-0 text-sm">→</span>
              </button>
            )
          })}

          {/* Interactive comparison card — spans full width */}
          <div className="col-span-2">
            <CompareCard
              metros={metros}
              defaultMarkets={stats ? [
                { city: stats.topSpendMarket.city, state: stats.topSpendMarket.state },
                { city: stats.secondSpendMarket.city, state: stats.secondSpendMarket.state },
                { city: stats.hubCandidates[2]?.city ?? '', state: stats.hubCandidates[2]?.state ?? '' },
              ].filter(m => m.city) : []}
              onCompare={ms => window.dispatchEvent(new CustomEvent('load-compare', { detail: { metros: ms } }))}
            />
          </div>
        </div>
      </div>

    </div>
  )
}
