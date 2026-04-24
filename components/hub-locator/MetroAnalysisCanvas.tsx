'use client'

import { useState } from 'react'
import { HVSScorecard } from './HVSScorecard'
import { DemandSignaturePanel } from './DemandSignaturePanel'
import { HubLocationMap } from './HubLocationMap'
import { StressTestPanel } from './StressTestPanel'
import { PeerBenchmarkPanel } from './PeerBenchmarkPanel'
import { RecommendationCard } from './RecommendationCard'
import { HubPurposePanel } from './HubPurposePanel'
import { ThresholdAlertBadge } from './ThresholdAlertBadge'
import { ExportDialog } from './ExportDialog'
import type { MetroHubAnalysis, StressTestParams } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

interface Props {
  data: MetroHubAnalysis
  onBack: () => void
  onDataUpdate?: (data: MetroHubAnalysis) => void
}

const DEFAULT_STRESS: StressTestParams = {
  hubCostMonthly: 8000,
  inducedDemandUpliftPct: 25,
  commuteRadiusMiles: 30,
}

export function MetroAnalysisCanvas({ data: initialData, onBack, onDataUpdate }: Props) {
  const [data, setData] = useState(initialData)
  const [stressParams, setStressParams] = useState<StressTestParams>(DEFAULT_STRESS)
  const [stressLoading, setStressLoading] = useState(false)

  const metroLabel = `${data.metro.city}, ${data.metro.state}`
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  async function handleStressChange(p: StressTestParams) {
    setStressParams(p)
    setStressLoading(true)
    try {
      const qs = new URLSearchParams({
        enterprise: 'Allstate',
        hubCost: String(p.hubCostMonthly),
        uplift: String(p.inducedDemandUpliftPct),
        radius: String(p.commuteRadiusMiles),
      })
      const res = await fetch(`/api/pulse/metro/${encodeURIComponent(data.metro.city)}/${encodeURIComponent(data.metro.state)}?${qs}`)
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
        onDataUpdate?.(newData)
      }
    } catch {}
    setStressLoading(false)
  }

  function handleOriginate(reqId: string) {
    // Originated event is broadcast via CustomEvent in RecommendationCard.
    // No additional state needed here — RightRail listens directly.
    console.info(`[MetroAnalysisCanvas] Sourcing requirement originated: ${reqId} for ${metroLabel}`)
  }

  return (
    <div className="print-canvas p-5">

      {/* ── Print-only report header ── */}
      <div className="print-header">
        <div>
          <div className="print-header-logo">LiquidSpace</div>
          <div className="print-header-sub">Workplace Strategist · Hub Locator</div>
        </div>
        <div className="print-header-meta">
          <div className="print-header-title">Hub Viability Report</div>
          <div>Allstate Insurance · {metroLabel}</div>
          <div>{dateStr}</div>
          <div className="print-header-confidential">CONFIDENTIAL — STRATEGIC USE ONLY</div>
        </div>
      </div>

      {/* ── Screen breadcrumb + actions ── */}
      <div className="no-print flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-subtle hover:text-ls-600 transition-colors"
          >
            <ArrowLeft size={14} /> Portfolio
          </button>
          <span className="text-border-strong">/</span>
          <span className="text-sm font-semibold text-body">{metroLabel}</span>
          <span className="text-xs px-2 py-0.5 rounded-pill bg-ls-50 border border-ls-100 text-ls-600 font-medium">
            Hub Viability Analysis
          </span>
        </div>
        <ExportDialog hvs={data.hvs} metro={data.metro} enterprise="Allstate" />
      </div>

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div className="mb-4 print-avoid-break">
          <ThresholdAlertBadge alerts={data.alerts} />
        </div>
      )}

      {/* Row 1: Scorecard + Demand */}
      <div className="print-row-1 grid grid-cols-[360px_1fr] gap-4 mb-4">
        <HVSScorecard hvs={data.hvs} metro={metroLabel} />
        <DemandSignaturePanel dailyDemand={data.dailyDemand} metro={metroLabel} />
      </div>

      {/* Row 1b: Hub Purpose Panel — full width, between demand and map */}
      <div className="print-avoid-break mb-4">
        <HubPurposePanel
          hwi={data.hvs.hwi ?? null}
          cpi={data.hvs.cpi ?? null}
          hubPurpose={data.hvs.hub_purpose ?? null}
        />
      </div>

      {/* Row 2: Map + Controls */}
      <div className="print-row-2 grid grid-cols-[1fr_300px] gap-4 mb-4">
        <HubLocationMap venues={data.venues} hvs={data.hvs} metro={metroLabel} />
        <div className="print-row-2-right flex flex-col gap-4">
          <StressTestPanel
            params={stressParams}
            onParamsChange={handleStressChange}
            annualSpend={data.metro.total_spend}
            eriScore={data.hvs.eri?.score}
            serverNetSaving={data.hvs.economic_roi?.net_saving}
            serverBaseline={data.hvs.economic_roi?.annual_spend_baseline}
            venues={data.venues}
            hubCentroid={data.hvs.recommended_hub_location}
            isLoading={stressLoading}
          />
          <PeerBenchmarkPanel
            peers={data.peers}
            yourScore={data.hvs.hvs_composite}
            metro={metroLabel}
            hubPurpose={data.hvs.hub_purpose ?? null}
          />
        </div>
      </div>

      {/* Row 3: Recommendation */}
      <div className="print-avoid-break">
        <RecommendationCard
          hvs={data.hvs}
          metro={metroLabel}
          onOriginate={handleOriginate}
        />
      </div>

      {/* Print footer */}
      <div className="print-only" style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9ca3af' }}>
        <span>Generated by LiquidSpace Workplace Strategist · liquidspace.com</span>
        <span>Hub Viability Score v1.1 · {dateStr}</span>
      </div>
    </div>
  )
}
