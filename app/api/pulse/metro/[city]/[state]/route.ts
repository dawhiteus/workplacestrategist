import { NextRequest, NextResponse } from 'next/server'
import { getMetroVenues, getDailyDemand, getMetroPortfolio, getPeerBenchmarks, getWorkTypeData } from '@/lib/pulse'
import { buildHVSReasoning } from '@/lib/hvs'
import type { StressTestParams, ThresholdAlert } from '@/lib/types'
import { ragStatus } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { city: string; state: string } }
) {
  const enterprise = req.nextUrl.searchParams.get('enterprise') || 'Allstate'
  const hubCost = parseInt(req.nextUrl.searchParams.get('hubCost') || '8000')
  const uplift = parseInt(req.nextUrl.searchParams.get('uplift') || '25')
  const radius = parseInt(req.nextUrl.searchParams.get('radius') || '30')
  const city = decodeURIComponent(params.city)
  const state = decodeURIComponent(params.state)

  try {
    const [venues, dailyDemand, portfolio, peerRows, workTypeData] = await Promise.all([
      getMetroVenues(enterprise, city, state),
      getDailyDemand(enterprise, city, state, 365),
      getMetroPortfolio(enterprise),
      getPeerBenchmarks(city, state, enterprise),
      getWorkTypeData(enterprise, city, state),
    ])

    const metro = portfolio.find(m => m.city === city && m.state === state)
    if (!metro) {
      return NextResponse.json({ error: 'Metro not found' }, { status: 404 })
    }

    const stressParams: StressTestParams = {
      hubCostMonthly: hubCost,
      inducedDemandUpliftPct: uplift,
      commuteRadiusMiles: radius,
    }

    const hvs = buildHVSReasoning(metro, venues, dailyDemand, stressParams, workTypeData)

    // Peer benchmark — anonymized, requires ≥5 accounts
    let peers = null
    if (peerRows.length >= 5) {
      const scores = peerRows.map(p => {
        const reservationProxy = p.reservations
        return Math.min(100, Math.round((reservationProxy / metro.reservations) * hvs.hvs_composite))
      })
      scores.sort((a, b) => a - b)
      const median = scores[Math.floor(scores.length / 2)]
      const q3 = scores[Math.floor(scores.length * 0.75)]
      const rank = scores.filter(s => s < hvs.hvs_composite).length
      peers = {
        percentile: Math.round((rank / scores.length) * 100),
        median_hvs: median,
        top_quartile_hvs: q3,
        sample_size: peerRows.length,
        your_score: hvs.hvs_composite,
      }
    }

    // Threshold alerts
    const alerts: ThresholdAlert[] = []
    if (hvs.dvi.score < 40) {
      alerts.push({
        id: 'dvi-low',
        severity: ragStatus(hvs.dvi.score),
        message: 'Demand volume or consistency below hub threshold',
        metric: 'DVI',
        value: hvs.dvi.score,
        threshold: 40,
      })
    }
    if (hvs.eri.score < 40) {
      alerts.push({
        id: 'eri-low',
        severity: ragStatus(hvs.eri.score),
        message: 'Hub economics unfavorable at current cost parameters',
        metric: 'ERI',
        value: hvs.eri.score,
        threshold: 40,
      })
    }
    if (hvs.dci.score < 40) {
      alerts.push({
        id: 'dci-low',
        severity: ragStatus(hvs.dci.score),
        message: 'Demand too dispersed for single-hub coverage',
        metric: 'DCI',
        value: hvs.dci.score,
        threshold: 40,
      })
    }
    if (hvs.dvi.inputs.peakDays > 15) {
      alerts.push({
        id: 'spike-risk',
        severity: 'amber',
        message: `${hvs.dvi.inputs.peakDays} spike days detected — hub may be undersized on peak days`,
        metric: 'PEAK_DAYS',
        value: hvs.dvi.inputs.peakDays,
        threshold: 15,
      })
    }

    return NextResponse.json({ metro, venues, dailyDemand, hvs, peers, alerts })
  } catch (err) {
    console.error(`[/api/pulse/metro/${city}/${state}]`, err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
