'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Navigation } from './Navigation'
import { ConversationPanel } from '@/components/chat/ConversationPanel'
import { RightRail } from './RightRail'
import { ContextBar } from './ContextBar'
import type { MetroHubAnalysis, MetroSummary } from '@/lib/types'

// Lazy-load the heavy metro analysis canvas to avoid SSR issues with leaflet
const MetroAnalysisCanvas = dynamic(
  () => import('@/components/hub-locator/MetroAnalysisCanvas').then(m => m.MetroAnalysisCanvas),
  { ssr: false }
)

export type ActiveTool = 'portfolio' | 'hub-locator'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface RailInsight {
  id: string
  type: 'finding' | 'action' | 'download'
  title: string
  body: string
  timestamp: Date
  downloadUrl?: string
  downloadLabel?: string
}

export interface CanvasData {
  tool: string
  data: MetroHubAnalysis | Record<string, unknown>
}

interface ShellProps {
  children?: React.ReactNode
}

export interface SessionEntry {
  label: string
  timestamp: Date
}

export function Shell({ children }: ShellProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>('hub-locator')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [insights, setInsights] = useState<RailInsight[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null)
  const [metros, setMetros] = useState<MetroSummary[]>([])
  const [selectedMetro, setSelectedMetro] = useState<{ city: string; state: string } | null>(null)
  const [metroLoading, setMetroLoading] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([])

  // Track real session history whenever a canvas loads
  useEffect(() => {
    if (!canvasData) return
    let label = ''
    if (canvasData.tool === 'get_metro_analysis') {
      const d = canvasData.data as MetroHubAnalysis
      label = `${d.metro?.city}, ${d.metro?.state} — Hub Viability`
    } else if (canvasData.tool === 'compare_metros') {
      const comp = (canvasData.data as Record<string, unknown>).comparison as Array<Record<string, unknown>>
      const names = (comp || []).map(m => m.city).join(', ')
      label = `Comparison: ${names}`
    } else if (canvasData.tool === 'portfolio_ranking') {
      const sortBy = (canvasData.data as Record<string, unknown>).sortBy
      label = sortBy === 'concentration' ? 'Demand Concentration Ranking' : 'Portfolio Ranking by Spend'
    }
    if (label) {
      setSessionHistory(prev => [{ label, timestamp: new Date() }, ...prev].slice(0, 8))
    }
  }, [canvasData])

  useEffect(() => {
    fetch('/api/pulse/metros?enterprise=Allstate')
      .then(r => r.json())
      .then(d => setMetros(d.metros || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onLoadCanvas(e: Event) {
      const { city, state, hubCost } = (e as CustomEvent).detail
      handleMetroSelectWithCost(city, state, hubCost ?? 8000)
    }
    function onLoadCompare(e: Event) {
      const { metros: metroList } = (e as CustomEvent).detail
      handleCompareMetros(metroList)
    }
    function onLoadRanking(e: Event) {
      const { sortBy, minSpend } = (e as CustomEvent).detail
      handleLoadRanking(sortBy, minSpend)
    }
    window.addEventListener('load-canvas', onLoadCanvas)
    window.addEventListener('load-compare', onLoadCompare)
    window.addEventListener('load-ranking', onLoadRanking)
    return () => {
      window.removeEventListener('load-canvas', onLoadCanvas)
      window.removeEventListener('load-compare', onLoadCompare)
      window.removeEventListener('load-ranking', onLoadRanking)
    }
  }, []) // eslint-disable-line

  async function handleMetroSelect(city: string, state: string) {
    if (!city) {
      setSelectedMetro(null)
      setCanvasData(null)
      return
    }
    setSelectedMetro({ city, state })
    setMetroLoading(true)
    try {
      const res = await fetch(`/api/pulse/metro/${encodeURIComponent(city)}/${encodeURIComponent(state)}?enterprise=Allstate&hubCost=8000&uplift=25&radius=30`)
      if (res.ok) {
        const data = await res.json()
        setCanvasData({ tool: 'get_metro_analysis', data })
      }
    } catch {}
    setMetroLoading(false)
  }

  async function handleMetroSelectWithCost(city: string, state: string, hubCost: number) {
    setSelectedMetro({ city, state })
    setMetroLoading(true)
    try {
      const res = await fetch(`/api/pulse/metro/${encodeURIComponent(city)}/${encodeURIComponent(state)}?enterprise=Allstate&hubCost=${hubCost}&uplift=25&radius=30`)
      if (res.ok) {
        const data = await res.json()
        setCanvasData({ tool: 'get_metro_analysis', data })
      }
    } catch {}
    setMetroLoading(false)
  }

  async function handleLoadRanking(sortBy: 'spend' | 'concentration', minSpend?: number) {
    setMetroLoading(true)
    setCanvasData(null)
    try {
      const res = await fetch('/api/pulse/metros?enterprise=Allstate')
      if (res.ok) {
        const { metros } = await res.json()
        setCanvasData({ tool: 'portfolio_ranking', data: { metros, sortBy, minSpend: minSpend ?? null } })
      }
    } catch {}
    setMetroLoading(false)
  }

  async function handleCompareMetros(metroList: Array<{ city: string; state: string }>) {
    setMetroLoading(true)
    setCanvasData(null)
    try {
      const results = await Promise.all(
        metroList.map(({ city, state }) =>
          fetch(`/api/pulse/metro/${encodeURIComponent(city)}/${encodeURIComponent(state)}?enterprise=Allstate&hubCost=8000&uplift=25&radius=30`)
            .then(r => r.ok ? r.json() : null)
        )
      )
      const comparison = results.map((r, i) => r ? ({
        city: metroList[i].city,
        state: metroList[i].state,
        hvs: r?.hvs?.hvs_composite,
        dvi: r?.hvs?.dvi?.score,
        dci: r?.hvs?.dci?.score,
        eri: r?.hvs?.eri?.score,
        recommendation: r?.hvs?.recommendation,
        spend: r?.metro?.total_spend,
        reservations: r?.metro?.reservations,
        members: r?.metro?.members,
        venues: r?.metro?.venues,
        net_saving: r?.hvs?.economic_roi?.net_saving,
        hub_annual_cost: r?.hvs?.economic_roi?.hub_annual_cost,
        payback_months: r?.hvs?.economic_roi?.payback_months,
      }) : { city: metroList[i].city, state: metroList[i].state, error: 'Not found' })
      setCanvasData({ tool: 'compare_metros', data: { comparison } })
    } catch {}
    setMetroLoading(false)
  }

  function addMessage(msg: ChatMessage) {
    setMessages(prev => [...prev, msg])
  }

  function addInsight(insight: RailInsight) {
    setInsights(prev => [insight, ...prev])
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Left: nav + conversation */}
      <aside className="no-print flex flex-col w-64 min-w-64 bg-sidebar border-r border-border">
        <Navigation activeTool={activeTool} onToolChange={setActiveTool} />
        <ConversationPanel
          messages={messages}
          isStreaming={isStreaming}
          onAddMessage={addMessage}
          onAddInsight={addInsight}
          onStreamingChange={setIsStreaming}
          onCanvasData={setCanvasData}
          activeTool={activeTool}
          metros={metros}
        />
      </aside>

      {/* Middle: context bar + canvas */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ContextBar
          metros={metros}
          selectedMetro={selectedMetro}
          onMetroSelect={handleMetroSelect}
        />
        <main className="flex-1 overflow-y-auto">
          {canvasData ? (
            <CanvasRenderer
              canvasData={canvasData}
              metroLoading={metroLoading}
              onBack={() => { setCanvasData(null); setSelectedMetro(null) }}
            />
          ) : (
            children
          )}
        </main>
      </div>

      {/* Right: insights rail */}
      <RightRail canvasData={canvasData} sessionHistory={sessionHistory} />
    </div>
  )
}

function CanvasRenderer({ canvasData, metroLoading, onBack }: {
  canvasData: CanvasData
  metroLoading: boolean
  onBack: () => void
}) {
  if (metroLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ls-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-subtle">Loading analysis…</div>
        </div>
      </div>
    )
  }

  if (canvasData.tool === 'get_metro_analysis') {
    const d = canvasData.data as MetroHubAnalysis
    if (!d.hvs) return null
    return <MetroAnalysisCanvas data={d} onBack={onBack} />
  }

  if (canvasData.tool === 'compare_metros') {
    return <CompareCanvas data={canvasData.data as Record<string, unknown>} onBack={onBack} />
  }

  if (canvasData.tool === 'portfolio_ranking') {
    return <RankingCanvas data={canvasData.data as Record<string, unknown>} onBack={onBack} />
  }

  return null
}

const recColor: Record<string, string> = {
  STRONG_BUY: 'text-success bg-green-50 border-green-200',
  BUY: 'text-ls-600 bg-ls-50 border-ls-100',
  MONITOR: 'text-warning bg-orange-50 border-orange-200',
  DO_NOT_PROCEED: 'text-danger bg-red-50 border-red-200',
  INSUFFICIENT_DATA: 'text-subtle bg-gray-50 border-gray-200',
}

function RankingCanvas({ data, onBack }: { data: Record<string, unknown>; onBack: () => void }) {
  const allMetros = (data.metros as MetroSummary[]) || []
  const sortBy = data.sortBy as string
  const minSpend = data.minSpend as number | null

  const sorted = [...allMetros]
    .filter(m => minSpend == null || m.total_spend >= minSpend)
    .sort((a, b) => {
      if (sortBy === 'concentration') {
        const ra = a.venues > 0 ? a.reservations / a.venues : 0
        const rb = b.venues > 0 ? b.reservations / b.venues : 0
        return rb - ra
      }
      return b.total_spend - a.total_spend
    })

  const title = minSpend != null
    ? `Hub Candidates — Markets with ≥ $${Math.round(minSpend / 1000)}K Spend`
    : sortBy === 'concentration' ? 'Demand Concentration by Market' : 'Portfolio Ranking by Spend'
  const subtitle = minSpend != null
    ? `${sorted.length} markets where hub economics are most likely to work`
    : sortBy === 'concentration'
      ? 'Markets ranked by bookings-per-venue ratio — higher = more concentrated demand'
      : 'Markets ranked by total Allstate spend'

  const maxVal = sorted[0]
    ? (sortBy === 'concentration'
        ? (sorted[0].venues > 0 ? sorted[0].reservations / sorted[0].venues : 0)
        : sorted[0].total_spend)
    : 1

  return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-subtle hover:text-body mb-4 transition-colors">
        ← Back to portfolio
      </button>
      <h2 className="text-lg font-semibold text-body mb-1">{title}</h2>
      <p className="text-sm text-subtle mb-5">{subtitle}</p>
      <div className="max-w-2xl space-y-1.5">
        {sorted.map((m, i) => {
          const val = sortBy === 'concentration'
            ? (m.venues > 0 ? m.reservations / m.venues : 0)
            : m.total_spend
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
          const label = sortBy === 'concentration'
            ? `${val.toFixed(1)} bkgs/venue`
            : `$${Math.round(m.total_spend / 1000)}K`

          return (
            <button
              key={`${m.city}-${m.state}`}
              onClick={() => window.dispatchEvent(new CustomEvent('load-canvas', { detail: { city: m.city, state: m.state, hubCost: 8000 } }))}
              className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-2.5 w-full text-left hover:border-ls-300 hover:bg-ls-50 transition-colors group"
            >
              <div className="w-5 text-xs font-semibold text-subtle text-right">{i + 1}</div>
              <div className="w-36 flex-shrink-0">
                <div className="text-sm font-medium text-body group-hover:text-ls-600 transition-colors">{m.city}, {m.state}</div>
                <div className="text-xs text-subtle">{m.reservations} bkgs · {m.venues} venues</div>
              </div>
              <div className="flex-1 h-1.5 bg-ls-50 rounded-full overflow-hidden">
                <div className="h-full bg-ls-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-24 text-right text-xs font-semibold text-ls-600">{label}</div>
              <span className="text-subtle group-hover:text-ls-500 text-xs transition-colors">→</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface CompareMarket {
  city: string; state: string; hvs: number; dvi: number; dci: number; eri: number
  recommendation: string; spend: number; reservations: number; members: number
  venues: number; net_saving: number; hub_annual_cost: number; payback_months: number
  error?: string
}

function CompareCanvas({ data, onBack }: { data: Record<string, unknown>; onBack: () => void }) {
  const markets = ((data.comparison as CompareMarket[]) || []).filter(m => !m.error)
  const n = markets.length
  if (n === 0) return null

  // Return index of best value in an array (-1 if all tied or only 1 market)
  function bestIdx(vals: number[], higherBetter = true): number {
    if (n < 2) return -1
    const target = higherBetter ? Math.max(...vals) : Math.min(...vals)
    const idx = vals.indexOf(target)
    return vals.filter(v => v === target).length === 1 ? idx : -1
  }

  function ScoreRow({ label, values, sub }: { label: string; values: number[]; sub?: string }) {
    const best = bestIdx(values)
    return (
      <div className="grid gap-3 py-2.5 border-b border-border last:border-0" style={{ gridTemplateColumns: `160px repeat(${n}, 1fr)` }}>
        <div className="text-xs text-subtle self-center">{label}{sub && <span className="block text-[10px] text-disabled">{sub}</span>}</div>
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-ls-50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: v >= 70 ? '#28a745' : v >= 40 ? '#005b94' : '#dc3545' }} />
            </div>
            <span className={`text-sm font-bold w-7 text-right tabular-nums ${i === best ? 'text-success' : 'text-body'}`}>{v}</span>
            {i === best && <span className="text-[10px] text-success font-semibold">↑</span>}
          </div>
        ))}
      </div>
    )
  }

  function MetricRow({ label, values, format, higherBetter = true }: {
    label: string; values: number[]; format: (v: number) => string; higherBetter?: boolean
  }) {
    const best = bestIdx(values, higherBetter)
    return (
      <div className="grid gap-3 py-2 border-b border-border last:border-0" style={{ gridTemplateColumns: `160px repeat(${n}, 1fr)` }}>
        <div className="text-xs text-subtle self-center">{label}</div>
        {values.map((v, i) => (
          <div key={i} className={`text-sm font-semibold tabular-nums ${i === best ? 'text-success' : 'text-body'}`}>
            {format(v)}{i === best && n > 1 && <span className="text-[10px] ml-1">↑</span>}
          </div>
        ))}
      </div>
    )
  }

  const fmtK = (v: number) => v >= 0 ? `+$${Math.round(v/1000)}K` : `-$${Math.round(Math.abs(v)/1000)}K`
  const fmtDollar = (v: number) => `$${Math.round(v/1000)}K`
  const fmtN = (v: number) => v.toLocaleString()
  const fmtMo = (v: number) => v >= 999 ? 'N/A' : `${v} mo`

  return (
    <div className="p-6 max-w-5xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-subtle hover:text-body mb-4 transition-colors">
        ← Back to portfolio
      </button>
      <h2 className="text-lg font-semibold text-body mb-1">Market Comparison</h2>
      <p className="text-sm text-subtle mb-5">{n} market{n !== 1 ? 's' : ''} · Hub cost assumed $8,000/month</p>

      {/* Market header columns */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {markets.map(m => {
          const rec = m.recommendation || 'INSUFFICIENT_DATA'
          return (
            <div key={`${m.city}-${m.state}`} className="bg-card border border-border rounded-xl p-4">
              <div className="text-sm font-bold text-body mb-1">{m.city}, {m.state}</div>
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-pill border mb-3 ${recColor[rec] || recColor.INSUFFICIENT_DATA}`}>
                {rec.replace(/_/g, ' ')}
              </span>
              <div className="text-2xl font-bold text-body mb-0.5">{m.hvs ?? '—'}<span className="text-xs font-normal text-subtle ml-1">/100</span></div>
              <div className="text-[10px] text-subtle mb-3">HVS Composite</div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('load-canvas', { detail: { city: m.city, state: m.state } }))}
                className="text-[10px] text-ls-500 hover:text-ls-600 font-medium transition-colors"
              >
                Full analysis →
              </button>
            </div>
          )
        })}
      </div>

      {/* Sub-score breakdown */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-3">HVS Sub-Scores</div>
        <ScoreRow label="Demand Viability" values={markets.map(m => m.dvi)} sub="Volume · consistency · peaks" />
        <ScoreRow label="Geo Concentration" values={markets.map(m => m.dci)} sub="Venue spread · commute radius" />
        <ScoreRow label="Economic Return" values={markets.map(m => m.eri)} sub="Spend vs. hub cost" />
      </div>

      {/* Economics */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-3">Hub Economics</div>
        <MetricRow label="Annual Spend" values={markets.map(m => m.spend)} format={fmtDollar} />
        <MetricRow label="Hub Annual Cost" values={markets.map(m => m.hub_annual_cost)} format={fmtDollar} higherBetter={false} />
        <MetricRow label="Net Saving/yr" values={markets.map(m => m.net_saving)} format={fmtK} />
        <MetricRow label="Payback Period" values={markets.map(m => m.payback_months)} format={fmtMo} higherBetter={false} />
      </div>

      {/* Activity */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest mb-3">Demand &amp; Activity</div>
        <MetricRow label="Reservations/yr" values={markets.map(m => m.reservations)} format={fmtN} />
        <MetricRow label="Members" values={markets.map(m => m.members)} format={fmtN} />
        <MetricRow label="Active Venues" values={markets.map(m => m.venues)} format={fmtN} higherBetter={false} />
      </div>
    </div>
  )
}
