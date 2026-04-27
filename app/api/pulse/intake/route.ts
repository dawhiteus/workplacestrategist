import { NextRequest, NextResponse } from 'next/server'
import { getMarketData, generateIntakeDemand } from '@/lib/platform-venues'
import { buildHVSReasoning } from '@/lib/hvs'
import { getPeerBenchmarks } from '@/lib/pulse'
import type { MetroSummary, VenueLocation, ThresholdAlert, StressTestParams, HWIOutput, CPIOutput } from '@/lib/types'
import { ragStatus } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface IntakeBody {
  city: string
  state: string
  inputMode: 'spend' | 'headcount'
  monthlySpend?: number    // required when inputMode === 'spend'
  headcount?: number       // required when inputMode === 'headcount'
  daysPerWeek?: number     // required when inputMode === 'headcount'
  hubCostMonthly?: number  // default 8000
  commuteRadiusMiles?: number // default 30
}

export async function POST(req: NextRequest) {
  let body: IntakeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { city, state, inputMode } = body
  if (!city || !state || !inputMode) {
    return NextResponse.json({ error: 'city, state, and inputMode are required' }, { status: 400 })
  }

  // Validate required fields per mode
  if (inputMode === 'spend' && !body.monthlySpend) {
    return NextResponse.json({ error: 'monthlySpend is required when inputMode is "spend"' }, { status: 400 })
  }
  if (inputMode === 'headcount' && (!body.headcount || !body.daysPerWeek)) {
    return NextResponse.json({ error: 'headcount and daysPerWeek are required when inputMode is "headcount"' }, { status: 400 })
  }

  // Get market platform data
  const marketData = getMarketData(city, state)
  if (!marketData) {
    return NextResponse.json({ error: `No platform data available for ${city}, ${state}` }, { status: 404 })
  }

  const hubCostMonthly = body.hubCostMonthly ?? 8000
  const commuteRadiusMiles = body.commuteRadiusMiles ?? 30
  const { avgRatePerBooking, venueCoords } = marketData

  // ── Derive annual spend ─────────────────────────────────────────────────────
  let annualSpend: number
  let members: number

  if (inputMode === 'spend') {
    annualSpend = (body.monthlySpend ?? 0) * 12
    // Estimate members: avg 15 bookings/year per active member
    members = Math.max(1, Math.round(annualSpend / avgRatePerBooking / 15))
  } else {
    // headcount × daysPerWeek × 52 weeks × avg rate per booking day
    annualSpend = (body.headcount ?? 0) * (body.daysPerWeek ?? 0) * 52 * avgRatePerBooking
    members = body.headcount ?? 1
  }

  const annualBookings = Math.round(annualSpend / avgRatePerBooking)

  // ── Build MetroSummary ──────────────────────────────────────────────────────
  const metro: MetroSummary = {
    city,
    state,
    reservations: annualBookings,
    total_spend: Math.round(annualSpend),
    venues: venueCoords.length,
    members,
  }

  // ── Build VenueLocation[] ───────────────────────────────────────────────────
  // Distribute spend across venues with a slight leader (venue[0] gets ~35%, rest share equally)
  const leaderShare = 0.35
  const remainingShare = 1 - leaderShare
  const venues: VenueLocation[] = venueCoords.map((coord, i) => {
    const shareFraction =
      i === 0
        ? leaderShare
        : remainingShare / (venueCoords.length - 1)
    const venueSpend = Math.round(annualSpend * shareFraction)
    const venueBookings = Math.round(annualBookings * shareFraction)
    return {
      venue_id: coord.venue_id,
      venue_name: coord.venue_name,
      latitude: coord.latitude,
      longitude: coord.longitude,
      reservations: venueBookings,
      spend: venueSpend,
    }
  })

  // ── Generate synthetic demand ───────────────────────────────────────────────
  const dailyDemand = generateIntakeDemand(annualSpend, avgRatePerBooking)

  // ── Platform-average behavioral signals ─────────────────────────────────────
  // New markets default to Latent Collaboration (HWI just above threshold, CPI just below)
  // This is the most common profile for enterprises entering a new flex market.
  const hwi: HWIOutput = {
    score: 42,
    collaboration_seat_days: Math.round(annualBookings * 0.42),
    concentration_seat_days: Math.round(annualBookings * 0.58),
  }
  const cpi: CPIOutput = {
    score: 38,
    copresence_event_count: Math.round(annualBookings * 0.12),
    median_group_size: 2.4,
    total_venue_days: Math.round(annualBookings * 0.31),
  }

  // ── Run HVS ────────────────────────────────────────────────────────────────
  const stressParams: StressTestParams = {
    hubCostMonthly,
    inducedDemandUpliftPct: 25,
    commuteRadiusMiles,
  }

  const hvs = buildHVSReasoning(metro, venues, dailyDemand, stressParams, { hwi, cpi })

  // ── Peer benchmarks ─────────────────────────────────────────────────────────
  let peers = null
  try {
    const peerRows = await getPeerBenchmarks(city, state, 'INTAKE')
    if (peerRows.length >= 5) {
      const scores = peerRows.map(p =>
        Math.min(100, Math.round((p.reservations / Math.max(1, metro.reservations)) * hvs.hvs_composite))
      )
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
  } catch {
    // Peer data is non-critical — swallow errors
  }

  // ── Threshold alerts ────────────────────────────────────────────────────────
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

  return NextResponse.json({ metro, venues, dailyDemand, hvs, peers, alerts })
}
