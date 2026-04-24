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
  HubPurposeEnum,
  HWIOutput,
  CPIOutput,
  RecommendedHubConfiguration,
  AlternativeIntervention,
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

// ── Hub Purpose 2x2 Classifier ───────────────────────────────────────────────
// Threshold of 40 on both axes divides the 2x2 quadrant.
// HWI (x-axis): collaboration-shaped vs concentration-shaped bookings
// CPI (y-axis): share of venue-days where ≥2 employees co-present

export function classifyHubPurpose(hwi: number, cpi: number): HubPurposeEnum {
  const threshold = 40
  if (hwi >= threshold && cpi >= threshold) return 'FULL_COLLABORATION'
  if (hwi >= threshold && cpi < threshold) return 'LATENT_COLLABORATION'
  if (hwi < threshold && cpi >= threshold) return 'CULTURAL_ANCHOR'
  return 'DISTRIBUTED_WORKFORCE'
}

export function buildHubConfiguration(
  hubPurpose: HubPurposeEnum,
  minSeats: number,
  maxSeats: number
): RecommendedHubConfiguration {
  const total = Math.round((minSeats + maxSeats) / 2)

  switch (hubPurpose) {
    case 'FULL_COLLABORATION': {
      // Heavy on meeting rooms; fewer private offices
      const meetingBase = Math.max(1, Math.round(total / 8))
      return {
        total_seats: total,
        private_offices: Math.max(1, Math.round(total * 0.08)),
        dedicated_desks: Math.max(1, Math.round(total * 0.20)),
        hot_desks: Math.max(1, Math.round(total * 0.22)),
        meeting_rooms: [
          { capacity: 4, count: meetingBase },
          { capacity: 8, count: Math.max(1, Math.round(meetingBase * 0.6)) },
          { capacity: 14, count: Math.max(1, Math.round(meetingBase * 0.3)) },
        ],
        phone_booths: Math.max(2, Math.round(total * 0.12)),
        anchor_day_capacity_factor: 1.35,
        configuration_rationale:
          'High HWI and CPI signal teams that regularly converge for collaborative work. Prioritize meeting rooms and shared touchdown desks. Anchor-day overflow provisioned at 35%.',
      }
    }
    case 'LATENT_COLLABORATION': {
      // Good mix; meeting rooms matter but co-presence is infrequent
      const meetingBase = Math.max(1, Math.round(total / 10))
      return {
        total_seats: total,
        private_offices: Math.max(1, Math.round(total * 0.12)),
        dedicated_desks: Math.max(1, Math.round(total * 0.30)),
        hot_desks: Math.max(1, Math.round(total * 0.18)),
        meeting_rooms: [
          { capacity: 4, count: meetingBase },
          { capacity: 8, count: Math.max(1, Math.round(meetingBase * 0.5)) },
        ],
        phone_booths: Math.max(2, Math.round(total * 0.14)),
        anchor_day_capacity_factor: 1.25,
        configuration_rationale:
          'Collaborative work types dominate but co-presence is low, suggesting asynchronous collaboration or travelling teams. Balanced mix with more dedicated desks. Hub can catalyse convergence.',
      }
    }
    case 'CULTURAL_ANCHOR': {
      // Low collab bookings but employees do show up together — social/cultural hub
      const meetingBase = Math.max(1, Math.round(total / 14))
      return {
        total_seats: total,
        private_offices: Math.max(1, Math.round(total * 0.10)),
        dedicated_desks: Math.max(1, Math.round(total * 0.15)),
        hot_desks: Math.max(2, Math.round(total * 0.35)),
        meeting_rooms: [
          { capacity: 4, count: meetingBase },
          { capacity: 8, count: Math.max(1, Math.round(meetingBase * 0.4)) },
        ],
        phone_booths: Math.max(2, Math.round(total * 0.10)),
        anchor_day_capacity_factor: 1.40,
        configuration_rationale:
          'Employees co-locate but book individual/focus space. Hub functions as a cultural touchstone — prioritize open hot desks, café-style seating, and event capacity over private offices.',
      }
    }
    default: {
      // DISTRIBUTED_WORKFORCE — fallback; normally would be ALTERNATIVE_INTERVENTION
      return {
        total_seats: total,
        private_offices: Math.max(1, Math.round(total * 0.10)),
        dedicated_desks: Math.max(1, Math.round(total * 0.20)),
        hot_desks: Math.max(1, Math.round(total * 0.30)),
        meeting_rooms: [{ capacity: 4, count: Math.max(1, Math.round(total / 12)) }],
        phone_booths: Math.max(2, Math.round(total * 0.10)),
        anchor_day_capacity_factor: 1.20,
        configuration_rationale:
          'Distributed workforce — if proceeding, a lightweight hot-desk-heavy configuration minimises fixed cost.',
      }
    }
  }
}

export function buildAlternativeIntervention(): AlternativeIntervention {
  return {
    intervention_type: 'GOVERNED_ON_DEMAND',
    rationale:
      'Booking patterns show predominantly individual, concentration-style work with low employee co-presence. A fixed hub would be underutilised on most days, eroding the economic case despite favourable spend levels.',
    suggested_next_step:
      'Configure a governed on-demand program with preferred-operator agreements across the existing venue footprint. Set per-employee monthly spend caps and require manager pre-approval for bookings above $X/day. Re-evaluate for a hub in 2 quarters if co-presence or collaboration bookings increase materially.',
  }
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
    ALTERNATIVE_INTERVENTION: `${metro} has favorable economics (HVS ${hvs}) but behavioral signals indicate a distributed workforce — employees book primarily individual space with low co-presence. A fixed hub would be underutilised. A governed on-demand program is the recommended intervention.`,
  }
  return narratives[rec]
}

export function buildHVSReasoning(
  metro: MetroSummary,
  venues: VenueLocation[],
  dailyDemand: DailyDemand[],
  stressParams: StressTestParams,
  workTypeData?: { hwi: HWIOutput; cpi: CPIOutput } | null
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
  let rec = toRecommendation(composite, metro.reservations)
  const metroLabel = `${metro.city}, ${metro.state}`

  const hubAnnualCost = stressParams.hubCostMonthly * 12
  // Use catchment-adjusted baseline so radius gates both ERI and the economics tile
  const catchmentBaseline = metro.total_spend * catchmentRatio
  const upliftedSpend = catchmentBaseline * (1 + stressParams.inducedDemandUpliftPct / 100)
  const netSaving = upliftedSpend - hubAnnualCost
  const paybackMonths = netSaving > 0 ? Math.round((hubAnnualCost / (netSaving / 12))) : 999

  // ── Behavioral overlay: HWI / CPI / Hub Purpose ───────────────────────────
  const hwi = workTypeData?.hwi ?? null
  const cpi = workTypeData?.cpi ?? null
  const hubPurpose = hwi && cpi ? classifyHubPurpose(hwi.score, cpi.score) : null

  // ALTERNATIVE_INTERVENTION: economics say buy, but workforce is distributed
  const economicsBuy = rec === 'STRONG_BUY' || rec === 'BUY'
  if (hubPurpose === 'DISTRIBUTED_WORKFORCE' && economicsBuy) {
    rec = 'ALTERNATIVE_INTERVENTION'
  }

  // Hub configuration — only for actionable hub recommendations
  const buildConfig = (rec === 'STRONG_BUY' || rec === 'BUY') && hubPurpose !== null
  const recommendedHubConfiguration: RecommendedHubConfiguration | null = buildConfig && hubPurpose
    ? buildHubConfiguration(hubPurpose, requiredSeats, Math.ceil(requiredSeats * 1.5))
    : null

  // Alternative intervention — only when DISTRIBUTED_WORKFORCE
  const alternativeIntervention: AlternativeIntervention | null =
    rec === 'ALTERNATIVE_INTERVENTION' ? buildAlternativeIntervention() : null

  const whatWouldChangeIt = rec === 'ALTERNATIVE_INTERVENTION'
    ? [
        `Collaboration booking share rising above 40% (current: ${hwi ? hwi.score : 0}%) would shift Hub Purpose away from Distributed Workforce`,
        `Co-presence rate exceeding 40% of venue-days (current: ${cpi ? cpi.score : 0}%) would indicate team convergence`,
        `Demand volume growing beyond ${Math.ceil(metro.reservations * 1.5)} reservations/year strengthens the economic case`,
        `A policy mandate (e.g. 2 required anchor days/week) would raise both HWI and CPI`,
      ]
    : [
        `Demand volume growing beyond ${Math.ceil(metro.reservations * 1.5)} reservations/year would push DVI into green`,
        `Hub cost below $${Math.round(stressParams.hubCostMonthly * 0.7).toLocaleString()}/month improves ERI significantly`,
        `Geographic consolidation to ≤3 venues would raise DCI by ~15 points`,
        `Reducing CV below 0.6 through policy (required booking days) would improve consistency score`,
      ]

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
    what_would_change_it: whatWouldChangeIt,
    critical_unknowns: [
      'Employee home address distribution for true commute radius validation',
      'Real estate availability and pricing at centroid location',
      'Headcount growth projections for next 24 months',
      'Employee sentiment data on hub vs. remote preference',
    ],
    economic_roi: {
      annual_spend_baseline: parseFloat(catchmentBaseline.toFixed(0)),
      hub_annual_cost: hubAnnualCost,
      net_saving: parseFloat(netSaving.toFixed(0)),
      payback_months: paybackMonths,
    },
    workforce_roi: {
      avg_commute_reduction_miles: parseFloat((stressParams.commuteRadiusMiles * 0.4).toFixed(1)),
      employees_benefited: metro.members,
      estimated_retention_lift_pct: composite >= 70 ? 4.2 : composite >= 40 ? 2.1 : 0.8,
    },
    hwi,
    cpi,
    hub_purpose: hubPurpose,
    recommended_hub_configuration: recommendedHubConfiguration,
    alternative_intervention: alternativeIntervention,
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
