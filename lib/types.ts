export type RAGStatus = 'green' | 'amber' | 'red'

export interface MetroSummary {
  city: string
  /**
   * For US markets: 2-letter state code (e.g. 'NY', 'CA').
   * For international markets: country name (e.g. 'United Kingdom', 'Australia').
   */
  state: string
  /**
   * Explicit country identifier. 'US' for domestic markets.
   * For international, matches the country name used in `state`.
   * Optional for backward-compat with existing US-only seed files.
   */
  country?: string
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
  | 'ALTERNATIVE_INTERVENTION'

export type HubPurposeEnum =
  | 'FULL_COLLABORATION'
  | 'LATENT_COLLABORATION'
  | 'CULTURAL_ANCHOR'
  | 'DISTRIBUTED_WORKFORCE'

export interface HWIOutput {
  score: number
  collaboration_seat_days: number
  concentration_seat_days: number
}

export interface CPIOutput {
  score: number
  copresence_event_count: number
  median_group_size: number
  total_venue_days: number
}

export interface MeetingRoom {
  capacity: number
  count: number
}

export interface RecommendedHubConfiguration {
  total_seats: number
  private_offices: number
  dedicated_desks: number
  hot_desks: number
  meeting_rooms: MeetingRoom[]
  phone_booths: number
  anchor_day_capacity_factor: number
  configuration_rationale: string
}

export interface AlternativeIntervention {
  intervention_type: 'GOVERNED_ON_DEMAND' | 'PREFERRED_OPERATOR_PROGRAM'
  rationale: string
  suggested_next_step: string
}

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
  hwi: HWIOutput | null
  cpi: CPIOutput | null
  hub_purpose: HubPurposeEnum | null
  recommended_hub_configuration: RecommendedHubConfiguration | null
  alternative_intervention: AlternativeIntervention | null
  /** ERI-derived seat count at which hub becomes economic (breakeven) */
  breakeven_seats: number
}

export interface StressTestParams {
  /** Primary lever — user-specified seat count */
  hubCapacitySeats: number
  /** Cost per seat/month from Pulse supply data; user adjustable via distribution chart */
  costPerSeatMonthly: number
  /** Derived: hubCapacitySeats × costPerSeatMonthly. Never user-entered. */
  hubCostMonthly: number
  inducedDemandUpliftPct: number
  commuteRadiusMiles: number
}

export interface CostDistribution {
  city: string
  state: string
  listing_count: number
  min: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
  max: number
  avg: number
  std: number
}

export interface SavedScenario {
  id: string
  name: string
  savedAt: Date
  params: StressTestParams
  hvs_composite: number
  net_saving: number
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
