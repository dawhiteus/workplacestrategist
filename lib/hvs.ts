import type {
  DVIInputs,
  DCIInputs,
  ERIInputs,
  HVSScores,
  HVSReasoningOutput,
  StressTestParams,
  RecommendationEnum,
  VenueLocation,
  DailyDemand,
  MetroSummary,
} from './types'
import { ragStatus, weightedCentroid, haversineKm } from './utils'

// DVI: Demand Viability Index
// Measures whether demand is consistent enough to justify a hub
export function computeDVI(inputs: DVIInputs): number {
  // Volume score: 0-50 points (100 reservations = 50 pts; 500+ = full 50)
  const volumeScore = Math.min(50, (inputs.volume / 200) * 50)

  // Consistency score: 0-35 points — CV < 0.8 = consistent; CV > 2.0 = very spiky
  const consistencyScore = Math.max(0, 35 - Math.max(0, inputs.cv - 0.5) * 20)

  // Peak penalty: spike days hurt hub economics (max -15 pts)
  const peakPenalty = Math.min(15, inputs.peakDays * 1.5)

  return Math.round(Math.min(100, Math.max(0, volumeScore + consistencyScore - peakPenalty)))
}

// DCI: Demand Concentration Index
// Measures whether demand is geographically concentrated enough for one hub
export function computeDCI(inputs: DCIInputs): number {
  // Geographic concentration: fewer venues in smaller area = more concentrated
  const concentrationScore = Math.min(50, (100 - inputs.topVenueSharePct) * 0.5 + 25)

  // Venue count score: fewer venues = more concentrated demand
  const venueScore = Math.max(0, 50 - (inputs.venueCount - 1) * 5)

  // Bounding box coverage: smaller box relative to commute radius = better fit
  const coverageFit = Math.max(
    0,
    50 - Math.max(0, inputs.geoBoundingBoxKm - inputs.commuteRadiusMiles * 1.609) * 2
  )

  return Math.round(Math.min(100, Math.max(0, (concentrationScore + venueScore + coverageFit) / 1.5)))
}

// ERI: Economic Return Index
// Measures whether a hub creates positive economics vs. current spend
export function computeERI(inputs: ERIInputs): number {
  const hubAnnualCost = inputs.hubCostMonthly * 12
  const upliftedSpend = inputs.annualSpend * (1 + inputs.inducedDemandUpliftPct / 100)

  // Savings ratio: how much of effective spend would be captured vs. hub cost (0-80 pts)
  const savingsRatio = (upliftedSpend - hubAnnualCost) / upliftedSpend
  const savingsScore = Math.max(0, savingsRatio * 80)

  // Demand coverage: graduated score based on ratio of monthly demand value to hub cost (0-20 pts)
  // Replaces binary cliff — rewards markets where spend meaningfully exceeds hub cost
  const demandCoverage = Math.min(20, Math.max(0, ((upliftedSpend / 12) / inputs.hubCostMonthly) * 10))

  return Math.round(Math.min(100, Math.max(0, savingsScore + demandCoverage)))
}

export function computeHVS(dvi: number, dci: number, eri: number): number {
  // Weighted composite: DVI 40%, DCI 30%, ERI 30%
  return Math.round(dvi * 0.4 + dci * 0.3 + eri * 0.3)
}

function toRecommendation(composite: number, volume: number): RecommendationEnum {
  if (volume < 30) return 'INSUFFICIENT_DATA'
  if (composite >= 75) return 'STRONG_BUY'
  if (composite >= 55) return 'BUY'
  if (composite >= 35) return 'MONITOR'
  return 'DO_NOT_PROCEED'
}

function recommendationNarrative(
  rec: RecommendationEnum,
  metro: string,
  hvs: number,
  eri: ERIInputs
): string {
  const saving = ((eri.annualSpend * 1.25 - eri.hubCostMonthly * 12) / 1000).toFixed(0)
  const narratives: Record<RecommendationEnum, string> = {
    STRONG_BUY: `${metro} shows strong hub viability (HVS ${hvs}). Demand is consistent and geographically concentrated. A dedicated hub would capture ~$${saving}K in annual savings vs. current flex spend, with favorable commute coverage.`,
    BUY: `${metro} is a viable hub candidate (HVS ${hvs}). Demand volume supports commitment, though some variability exists. Projected net savings of ~$${saving}K annually warrant a 12-month pilot.`,
    MONITOR: `${metro} is borderline (HVS ${hvs}). Demand exists but lacks the consistency or concentration required for a committed hub. Monitor for 2 more quarters before deciding.`,
    INSUFFICIENT_DATA: `Insufficient booking history in ${metro} to make a reliable hub recommendation (HVS ${hvs}). Expand team access and re-evaluate in Q2.`,
    DO_NOT_PROCEED: `${metro} does not support a dedicated hub at this time (HVS ${hvs}). Demand is too low, too dispersed, or economics are unfavorable. Maintain flex-only approach.`,
  }
  return narratives[rec]
}

export function buildHVSReasoning(
  metro: MetroSummary,
  venues: VenueLocation[],
  dailyDemand: DailyDemand[],
  stressParams: StressTestParams
): HVSReasoningOutput {
  // Venue geometry — computed first so catchmentRatio can gate both DVI and ERI
  const totalSpend = venues.reduce((s, v) => s + v.spend, 0)
  const centroid = weightedCentroid(venues.map(v => ({ lat: v.latitude, lng: v.longitude, weight: v.spend })))
  const maxDistKm = centroid
    ? venues.reduce((m, v) => Math.max(m, haversineKm(centroid.lat, centroid.lng, v.latitude, v.longitude)), 0)
    : 0

  // Catchment ratio: fraction of venue spend reachable within commute radius of the hub centroid.
  // Gates effective demand and spend — a tighter radius means fewer venues (and their bookings) are served.
  const radiusKm = stressParams.commuteRadiusMiles * 1.609
  const catchmentRatio = centroid && totalSpend > 0
    ? venues
        .filter(v => haversineKm(centroid.lat, centroid.lng, v.latitude, v.longitude) <= radiusKm)
        .reduce((s, v) => s + v.spend, 0) / totalSpend
    : 1

  // DVI computation — volume scaled by catchment so radius affects demand score
  const bookingCounts = dailyDemand.map(d => d.bookings)
  const mean = bookingCounts.reduce((a, b) => a + b, 0) / (bookingCounts.length || 1)
  const variance = bookingCounts.reduce((s, b) => s + (b - mean) ** 2, 0) / (bookingCounts.length || 1)
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
  const peakDays = bookingCounts.filter(b => b > mean * 2).length

  const dviInputs: DVIInputs = {
    volume: Math.round(metro.reservations * catchmentRatio),
    cv: parseFloat(cv.toFixed(3)),
    peakDays,
  }
  const dviScore = computeDVI(dviInputs)

  // DCI computation
  const topVenueSharePct = venues.length > 0 ? (venues[0].spend / totalSpend) * 100 : 0
  const dciInputs: DCIInputs = {
    venueCount: venues.length,
    topVenueSharePct: parseFloat(topVenueSharePct.toFixed(1)),
    commuteRadiusMiles: stressParams.commuteRadiusMiles,
    geoBoundingBoxKm: parseFloat((maxDistKm * 2).toFixed(1)),
  }
  const dciScore = computeDCI(dciInputs)

  // ERI computation — annualSpend scaled by catchment so radius affects economics
  const avgDailyBookings = mean
  const requiredSeats = Math.max(2, Math.ceil(avgDailyBookings * 1.3))

  const eriInputs: ERIInputs = {
    annualSpend: metro.total_spend * catchmentRatio,
    hubCostMonthly: stressParams.hubCostMonthly,
    requiredSeats,
    inducedDemandUpliftPct: stressParams.inducedDemandUpliftPct,
  }
  const eriScore = computeERI(eriInputs)

  const composite = computeHVS(dviScore, dciScore, eriScore)
  const rec = toRecommendation(composite, metro.reservations)
  const metroLabel = `${metro.city}, ${metro.state}`

  const hubAnnualCost = stressParams.hubCostMonthly * 12
  const upliftedSpend = metro.total_spend * (1 + stressParams.inducedDemandUpliftPct / 100)
  const netSaving = upliftedSpend - hubAnnualCost
  const paybackMonths = netSaving > 0 ? Math.round((hubAnnualCost / (netSaving / 12))) : 999

  return {
    hvs_composite: composite,
    dvi: { score: dviScore, inputs: dviInputs },
    dci: { score: dciScore, inputs: dciInputs },
    eri: { score: eriScore, inputs: eriInputs },
    recommendation: rec,
    recommendation_narrative: recommendationNarrative(rec, metroLabel, composite, eriInputs),
    recommended_hub_location: centroid
      ? {
          lat: parseFloat(centroid.lat.toFixed(4)),
          lng: parseFloat(centroid.lng.toFixed(4)),
          description: `Weighted centroid of ${venues.length} active venue${venues.length !== 1 ? 's' : ''} by spend`,
        }
      : null,
    recommended_hub_size: {
      min_seats: requiredSeats,
      max_seats: Math.ceil(requiredSeats * 1.5),
      rationale: `Based on average daily demand of ${mean.toFixed(1)} bookings with 30% headroom, scaling to 50% for peak days.`,
    },
    what_would_change_it: [
      `Demand volume growing beyond ${Math.ceil(metro.reservations * 1.5)} reservations/year would push DVI into green`,
      `Hub cost below $${Math.round(stressParams.hubCostMonthly * 0.7).toLocaleString()}/month improves ERI significantly`,
      `Geographic consolidation to ≤3 venues would raise DCI by ~15 points`,
      `Reducing CV below 0.6 through policy (required booking days) would improve consistency score`,
    ],
    critical_unknowns: [
      'Employee home address distribution for true commute radius validation',
      'Real estate availability and pricing at centroid location',
      'Headcount growth projections for next 24 months',
      'Employee sentiment data on hub vs. remote preference',
    ],
    economic_roi: {
      annual_spend_baseline: parseFloat(metro.total_spend.toFixed(0)),
      hub_annual_cost: hubAnnualCost,
      net_saving: parseFloat(netSaving.toFixed(0)),
      payback_months: paybackMonths,
    },
    workforce_roi: {
      avg_commute_reduction_miles: parseFloat((stressParams.commuteRadiusMiles * 0.4).toFixed(1)),
      employees_benefited: metro.members,
      estimated_retention_lift_pct: composite >= 70 ? 4.2 : composite >= 40 ? 2.1 : 0.8,
    },
  }
}

export function scoreAll(
  metro: MetroSummary,
  venues: VenueLocation[],
  dailyDemand: DailyDemand[],
  stressParams: StressTestParams
): HVSScores {
  const r = buildHVSReasoning(metro, venues, dailyDemand, stressParams)
  return {
    dvi: r.dvi.score,
    dci: r.dci.score,
    eri: r.eri.score,
    composite: r.hvs_composite,
    status: ragStatus(r.hvs_composite),
    dviStatus: ragStatus(r.dvi.score),
    dciStatus: ragStatus(r.dci.score),
    eriStatus: ragStatus(r.eri.score),
  }
}
