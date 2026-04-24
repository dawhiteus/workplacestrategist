'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { HVSScorecard } from '@/components/hub-locator/HVSScorecard'
import { DemandSignaturePanel } from '@/components/hub-locator/DemandSignaturePanel'
import { HubLocationMap } from '@/components/hub-locator/HubLocationMap'
import { StressTestPanel } from '@/components/hub-locator/StressTestPanel'
import { PeerBenchmarkPanel } from '@/components/hub-locator/PeerBenchmarkPanel'
import { RecommendationCard } from '@/components/hub-locator/RecommendationCard'
import { ExportDialog } from '@/components/hub-locator/ExportDialog'
import { ThresholdAlertBadge } from '@/components/hub-locator/ThresholdAlertBadge'
import type { MetroHubAnalysis, StressTestParams } from '@/lib/types'
import { ArrowLeft, RefreshCw, Download } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_STRESS: StressTestParams = {
  hubCostMonthly: 8000,
  inducedDemandUpliftPct: 25,
  commuteRadiusMiles: 30,
}

export default function MetroPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const city = decodeURIComponent(params.city as string)
  const state = decodeURIComponent(params.state as string)
  const enterprise = searchParams.get('enterprise') || 'Allstate'

  const [data, setData] = useState<MetroHubAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stressParams, setStressParams] = useState<StressTestParams>(DEFAULT_STRESS)
  const [stressLoading, setStressLoading] = useState(false)

  const fetchData = useCallback(async (sp: StressTestParams, isStress = false) => {
    if (isStress) setStressLoading(true)
    else setLoading(true)
    const qs = new URLSearchParams({
      enterprise,
      hubCost: String(sp.hubCostMonthly),
      uplift: String(sp.inducedDemandUpliftPct),
      radius: String(sp.commuteRadiusMiles),
    })
    try {
      const res = await fetch(`/api/pulse/metro/${encodeURIComponent(city)}/${encodeURIComponent(state)}?${qs}`)
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      if (isStress) setStressLoading(false)
      else setLoading(false)
    }
  }, [city, state, enterprise])

  useEffect(() => { fetchData(stressParams) }, []) // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { if (!loading) fetchData(stressParams, true) }, 600)
    return () => clearTimeout(t)
  }, [stressParams]) // eslint-disable-line

  const metroLabel = `${city}, ${state}`

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={22} className="text-ls-500 animate-spin" />
        <div className="text-sm text-subtle">Loading analysis for {metroLabel}…</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-danger max-w-xl">
        <div className="font-semibold mb-1">Failed to load {metroLabel}</div>
        <div className="text-xs opacity-80">{error}</div>
      </div>
    </div>
  )

  if (!data) return null

  return (
    <div className="p-5">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/hub-locator" className="flex items-center gap-1.5 text-sm text-subtle hover:text-ls-600 transition-colors">
            <ArrowLeft size={14} /> Portfolio
          </Link>
          <span className="text-border-strong">/</span>
          <span className="text-sm font-semibold text-body">{metroLabel}</span>
          <span className="text-xs px-2 py-0.5 rounded-pill bg-ls-50 border border-ls-100 text-ls-600 font-medium">
            Hub Viability Analysis
          </span>
        </div>
        {data && <ExportDialog hvs={data.hvs} metro={data.metro} enterprise={enterprise} />}
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-4">
          <ThresholdAlertBadge alerts={data.alerts} />
        </div>
      )}

      {/* Row 1: Scorecard + Demand */}
      <div className="grid grid-cols-[360px_1fr] gap-4 mb-4">
        <HVSScorecard hvs={data.hvs} metro={metroLabel} />
        <DemandSignaturePanel dailyDemand={data.dailyDemand} metro={metroLabel} />
      </div>

      {/* Row 2: Map + Controls */}
      <div className="grid grid-cols-[1fr_300px] gap-4 mb-4">
        <HubLocationMap venues={data.venues} hvs={data.hvs} metro={metroLabel} />
        <div className="flex flex-col gap-4">
          <StressTestPanel
            params={stressParams}
            onParamsChange={setStressParams}
            annualSpend={data.metro.total_spend}
            isLoading={stressLoading}
          />
          <PeerBenchmarkPanel peers={data.peers} yourScore={data.hvs.hvs_composite} metro={metroLabel} hubPurpose={data.hvs.hub_purpose ?? null} />
        </div>
      </div>

      {/* Row 3: Recommendation */}
      <RecommendationCard hvs={data.hvs} />
    </div>
  )
}
