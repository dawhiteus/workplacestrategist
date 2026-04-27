'use client'

import { useState, useEffect } from 'react'
import type { CanvasData, SessionEntry } from './Shell'
import type { MetroHubAnalysis, MetroSummary } from '@/lib/types'
import { Download, TrendingUp, Zap, Clock, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RightRailProps {
  canvasData: CanvasData | null
  sessionHistory: SessionEntry[]
  activeSessionId: number | null
  onRestoreSession: (entry: SessionEntry) => void
}

// ── Insight derivation ────────────────────────────────────────────────────────

interface Insight {
  id: string
  type: 'finding' | 'action' | 'alert' | 'originated'
  title: string
  body: string
}

interface OriginatedEvent {
  reqId: string
  city: string
  timestamp: string
}

function deriveInsights(canvasData: CanvasData): Insight[] {
  const insights: Insight[] = []

  if (canvasData.tool === 'get_metro_analysis') {
    const d = canvasData.data as MetroHubAnalysis
    const hvs = d?.hvs
    if (!hvs) return []

    // 1. Recommendation + composite
    const recLabel = hvs.recommendation.replace(/_/g, ' ')
    insights.push({
      id: 'rec',
      type: 'finding',
      title: `${d.metro.city} scores ${hvs.hvs_composite}/100 — ${recLabel}`,
      body: hvs.recommendation_narrative,
    })

    // 2. Weakest sub-score
    const subs = [
      { name: 'Demand Volume (DVI)', val: hvs.dvi.score },
      { name: 'Concentration (DCI)', val: hvs.dci.score },
      { name: 'Economic Return (ERI)', val: hvs.eri.score },
    ].sort((a, b) => a.val - b.val)
    if (subs[0].val < 50) {
      insights.push({
        id: 'weak',
        type: 'action',
        title: `${subs[0].name} is limiting`,
        body: `Score of ${subs[0].val}/100 is the primary drag on the composite. Address this to move the recommendation.`,
      })
    }

    // 3. Economic ROI — compare baseline (no uplift) vs hub cost to avoid misleading findings
    const net = hvs.economic_roi.net_saving          // upliftedSpend − hubCost
    const baseline = hvs.economic_roi.annual_spend_baseline  // actual spend, no uplift
    const hubCost = hvs.economic_roi.hub_annual_cost
    const eriScore = hvs.eri?.score ?? 0
    const baselineNet = baseline - hubCost            // true net without any uplift

    if (baselineNet >= 0) {
      // Positive even on raw bookings — genuinely strong finding
      insights.push({
        id: 'roi',
        type: 'finding',
        title: `Hub saves $${Math.round(baselineNet / 1000)}K/yr`,
        body: `$${Math.round(baseline / 1000)}K flex spend vs. $${Math.round(hubCost / 1000)}K hub cost — economics are positive on current bookings alone.`,
      })
    } else if (net >= 0 && eriScore >= 40) {
      // Positive only because of induced demand uplift — flag the assumption
      insights.push({
        id: 'roi',
        type: 'action',
        title: `ROI depends on induced demand uplift`,
        body: `Baseline spend ($${Math.round(baseline / 1000)}K) is below hub cost ($${Math.round(hubCost / 1000)}K/yr). At the 25% uplift assumption, net saving is $${Math.round(net / 1000)}K/yr. Validate demand uplift before committing.`,
      })
    } else if (net >= 0 && eriScore < 40) {
      // ERI flags weak economics — don't call it a positive finding
      insights.push({
        id: 'roi',
        type: 'alert',
        title: `Economics rely on unconfirmed uplift (ERI ${eriScore})`,
        body: `Baseline spend ($${Math.round(baseline / 1000)}K) < hub cost ($${Math.round(hubCost / 1000)}K/yr). ERI of ${eriScore}/100 signals return is too thin to rely on demand uplift alone.`,
      })
    } else {
      // Clearly uneconomic even with uplift
      const breakeven = Math.round(baseline / 12 / 1000 * 10) / 10
      insights.push({
        id: 'roi',
        type: 'alert',
        title: `Hub costs $${Math.round(Math.abs(net) / 1000)}K more than flex`,
        body: `Break-even requires hub cost ≤ $${breakeven}K/mo, or higher demand volume. Use the stress test to find the threshold.`,
      })
    }

    // 4. Threshold alerts
    if (d.alerts?.length) {
      const red = d.alerts.filter(a => a.severity === 'red')
      if (red.length) {
        insights.push({
          id: 'alert',
          type: 'alert',
          title: `${red.length} critical threshold${red.length > 1 ? 's' : ''} breached`,
          body: red[0].message,
        })
      }
    }
  }

  if (canvasData.tool === 'compare_metros') {
    const comp = ((canvasData.data as Record<string, unknown>).comparison as Array<Record<string, unknown>>) || []
    const withHvs = comp.filter(m => m.hvs != null)
    if (!withHvs.length) return []

    const top = [...withHvs].sort((a, b) => Number(b.hvs) - Number(a.hvs))[0]
    insights.push({
      id: 'top',
      type: 'finding',
      title: `${top.city} leads — HVS ${top.hvs}`,
      body: `${String(top.recommendation || '').replace(/_/g, ' ')} · $${Math.round(Number(top.spend || 0) / 1000)}K spend, ${top.reservations} reservations.`,
    })

    const bestROI = [...withHvs].sort((a, b) => Number(b.net_saving ?? -Infinity) - Number(a.net_saving ?? -Infinity))[0]
    if (bestROI && Number(bestROI.net_saving) > 0) {
      insights.push({
        id: 'roi',
        type: 'finding',
        title: `Best economics: ${bestROI.city}`,
        body: `Net saving of $${Math.round(Number(bestROI.net_saving) / 1000)}K/yr at current hub cost assumptions.`,
      })
    }

    const worst = [...withHvs].sort((a, b) => Number(a.hvs) - Number(b.hvs))[0]
    if (worst.city !== top.city) {
      insights.push({
        id: 'gap',
        type: 'action',
        title: `${Number(top.hvs) - Number(worst.hvs)}-point gap: ${top.city} vs. ${worst.city}`,
        body: `Focus hub investment on ${top.city}. ${worst.city} needs more demand volume before a hub makes sense.`,
      })
    }
  }

  if (canvasData.tool === 'portfolio_ranking') {
    const metros = ((canvasData.data as Record<string, unknown>).metros as MetroSummary[]) || []
    const sortBy = (canvasData.data as Record<string, unknown>).sortBy as string
    if (!metros.length) return []

    const top = metros[0]
    if (sortBy === 'concentration') {
      const ratio = top.venues > 0 ? (top.reservations / top.venues).toFixed(1) : '—'
      insights.push({
        id: 'top',
        type: 'finding',
        title: `${top.city} most concentrated`,
        body: `${ratio} bookings/venue — demand is tightly clustered, a strong hub signal.`,
      })
      const bottom = metros[metros.length - 1]
      insights.push({
        id: 'spread',
        type: 'action',
        title: `${bottom.city} demand is scattered`,
        body: `Low bookings-per-venue ratio means a hub would serve only a fraction of the workforce.`,
      })
    } else {
      insights.push({
        id: 'top',
        type: 'finding',
        title: `${top.city} leads at $${Math.round(top.total_spend / 1000)}K`,
        body: `${top.reservations} reservations across ${top.venues} venues — highest portfolio spend.`,
      })
      const topConc = [...metros].sort((a, b) => (b.reservations / Math.max(b.venues, 1)) - (a.reservations / Math.max(a.venues, 1)))[0]
      if (topConc.city !== top.city) {
        insights.push({
          id: 'conc',
          type: 'action',
          title: `${topConc.city} has tightest demand`,
          body: `Despite lower spend, ${topConc.city} has a ${(topConc.reservations / Math.max(topConc.venues, 1)).toFixed(1)} bkgs/venue ratio — may be a stronger hub candidate.`,
        })
      }
    }
  }

  return insights
}

interface DownloadItem {
  label: string
  action: 'print' | 'soon'
}

function downloadsForCanvas(canvasData: CanvasData): DownloadItem[] {
  if (canvasData.tool === 'get_metro_analysis') {
    const d = canvasData.data as MetroHubAnalysis
    return [
      { label: `${d.metro?.city} Hub Viability Report (PDF)`, action: 'print' },
      { label: `${d.metro?.city} Venue & Demand Data (CSV)`, action: 'soon' },
    ]
  }
  if (canvasData.tool === 'compare_metros') return [
    { label: 'Market Comparison Summary (PDF)', action: 'print' },
    { label: 'Comparison Data (CSV)', action: 'soon' },
  ]
  if (canvasData.tool === 'portfolio_ranking') return [
    { label: 'Portfolio Ranking Report (PDF)', action: 'print' },
    { label: 'All Markets Data (CSV)', action: 'soon' },
  ]
  return []
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const configMap = {
    finding:    { icon: TrendingUp,    color: 'text-ls-600 bg-ls-50 border-ls-100',         label: 'Finding' },
    action:     { icon: Zap,           color: 'text-warning bg-orange-50 border-orange-100', label: 'Action' },
    alert:      { icon: AlertTriangle, color: 'text-danger bg-red-50 border-red-100',        label: 'Alert' },
    originated: { icon: CheckCircle2,  color: 'text-success bg-green-50 border-green-200',   label: 'Originated' },
  }
  const config = configMap[insight.type] ?? configMap.finding
  const Icon = config.icon

  return (
    <div className={cn('rounded-xl border p-3', config.color)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold mb-1 uppercase tracking-wide">
        <Icon size={10} />
        {config.label}
      </div>
      <div className="text-xs font-medium text-body mb-0.5">{insight.title}</div>
      <div className="text-xs text-subtle leading-relaxed">{insight.body}</div>
    </div>
  )
}

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────

export function RightRail({ canvasData, sessionHistory, activeSessionId, onRestoreSession }: RightRailProps) {
  const [originatedEvents, setOriginatedEvents] = useState<OriginatedEvent[]>([])

  useEffect(() => {
    function handleOriginated(e: Event) {
      const detail = (e as CustomEvent<OriginatedEvent>).detail
      if (detail?.reqId) {
        setOriginatedEvents(prev => {
          // Avoid duplicates
          if (prev.some(o => o.reqId === detail.reqId)) return prev
          return [detail, ...prev]
        })
      }
    }
    window.addEventListener('hub-originated', handleOriginated)
    return () => window.removeEventListener('hub-originated', handleOriginated)
  }, [])

  const originatedInsights: Insight[] = originatedEvents.map(ev => ({
    id: `originated-${ev.reqId}`,
    type: 'originated' as const,
    title: `${ev.reqId} · Sourcing requirement originated`,
    body: `${ev.city} hub requirement added to Transaction Manager at ${new Date(ev.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`,
  }))

  const derivedInsights = canvasData ? deriveInsights(canvasData) : []
  const insights = [...originatedInsights, ...derivedInsights]
  const downloads = canvasData ? downloadsForCanvas(canvasData) : []

  return (
    <aside className="w-[280px] min-w-[280px] bg-card border-l border-border flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="font-semibold text-body text-sm">Analysis Panel</div>
        <div className="text-subtle text-xs mt-0.5">Insights & exports for active view</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-5">

        {/* Empty state */}
        {!canvasData && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-10 h-10 rounded-full bg-page border border-border flex items-center justify-center mb-3">
              <BarChart3 size={16} className="text-subtle" />
            </div>
            <p className="text-xs text-subtle leading-relaxed px-2">
              Select a market or run an analysis — insights and export options will appear here.
            </p>
          </div>
        )}

        {/* Derived insights */}
        {insights.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">Key Insights</div>
            <div className="flex flex-col gap-2">
              {insights.map(ins => <InsightCard key={ins.id} insight={ins} />)}
            </div>
          </div>
        )}

        {/* Downloads */}
        {downloads.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">Downloads</div>
            <div className="flex flex-col gap-1.5">
              {downloads.map(item => (
                <button
                  key={item.label}
                  onClick={item.action === 'print' ? () => window.print() : undefined}
                  disabled={item.action === 'soon'}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-colors ${
                    item.action === 'print'
                      ? 'border-border text-body hover:bg-ls-50 hover:border-ls-300 cursor-pointer'
                      : 'border-border text-subtle opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Download size={11} className="flex-shrink-0" />
                    {item.label}
                  </span>
                  {item.action === 'soon' && (
                    <span className="text-[9px] bg-page border border-border px-1.5 py-0.5 rounded-full text-subtle">Soon</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session history */}
        {sessionHistory.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">This Session</div>
            <div className="flex flex-col gap-0.5">
              {sessionHistory.map((s, i) => {
                const isActive = s.id === activeSessionId
                return (
                  <button
                    key={i}
                    onClick={() => onRestoreSession(s)}
                    className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-ls-50 text-ls-700'
                        : 'hover:bg-page text-body'
                    }`}
                  >
                    <Clock size={10} className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-ls-500' : 'text-subtle'}`} />
                    <div>
                      <div className={`text-xs leading-tight ${isActive ? 'font-medium text-ls-700' : 'text-body'}`}>
                        {s.label}
                      </div>
                      <div className="text-[10px] text-subtle">{timeAgo(s.timestamp)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
