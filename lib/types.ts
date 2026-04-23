export type RAGStatus = 'green' | 'amber' | 'red'

export interface MetroSummary {
  city: string
  state: string
  reservations: number
  total_spend: number
  venues: number
  members: number
}

export interface VenueLocation {
  venue_id: string
  venue_name: string
  latitude: number
  longitude: number
  reservations: number
  spend: number
}

export interface DailyDemand {
  day: string
  bookings: number
  spend: number
}

export interface DVIInputs {
  volume: number
  cv: number // coefficient of variation
  peakDays: number // days > 2x average
}

export interface DCIInputs {
  venueCount: number
  topVenueSharePct: number // % of bookings at top venue
  commuteRadiusMiles: number
  geoBoundingBoxKm: number
}

export interface ERIInputs {
  annualSpend: number
  hubCostMonthly: number
  requiredSeats: number
  inducedDemandUpliftPct: number
}

export interface HVSScores {
  dvi: number
  dci: number
  eri: number
  composite: number
  status: RAGStatus
  dviStatus: RAGStatus
  dciStatus: RAGStatus
  eriStatus: RAGStatus
}

export type RecommendationEnum =
  | 'STRONG_BUY'
  | 'BUY'
  | 'MONITOR'
  | 'INSUFFICIENT_DATA'
  | 'DO_NOT_PROCEED'

export interface EconomicROI {
  annual_spend_baseline: number
  hub_annual_cost: number
  net_saving: number
  payback_months: number
}

export interface WorkforceROI {
  avg_commute_reduction_miles: number
  employees_benefited: number
  estimated_retention_lift_pct: number
}

export interface HVSReasoningOutput {
  hvs_composite: number
  dvi: { score: number; inputs: DVIInputs }
  dci: { score: number; inputs: DCIInputs }
  eri: { score: number; inputs: ERIInputs }
  recommendation: RecommendationEnum
  recommendation_narrative: string
  recommended_hub_location: { lat: number; lng: number; description: string } | null
  recommended_hub_size: { min_seats: number; max_seats: number; rationale: string }
  what_would_change_it: string[]
  critical_unknowns: string[]
  economic_roi: EconomicROI
  workforce_roi: WorkforceROI
}

export interface StressTestParams {
  hubCostMonthly: number
  inducedDemandUpliftPct: number
  commuteRadiusMiles: number
}

export interface PeerBenchmark {
  percentile: number
  median_hvs: number
  top_quartile_hvs: number
  sample_size: number
  your_score: number
}

export interface ThresholdAlert {
  id: string
  severity: RAGStatus
  message: string
  metric: string
  value: number
  threshold: number
}

export interface MetroHubAnalysis {
  metro: MetroSummary
  venues: VenueLocation[]
  dailyDemand: DailyDemand[]
  hvs: HVSReasoningOutput
  peers: PeerBenchmark
  alerts: ThresholdAlert[]
}
