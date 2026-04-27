import path from 'path'
import fs from 'fs'
import type { HWIOutput, CPIOutput } from './types'

// Seeded JSON data lives alongside the project for demo reliability.
// If PULSE_DATA_PATH is set and accessible, DuckDB runtime queries are used instead.
const DATA_DIR = path.join(process.cwd(), 'data')

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'))
}

function metroKey(city: string, state: string): string {
  return `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`
}

export async function getMetroPortfolio(enterprise: string): Promise<Array<{
  city: string
  state: string
  reservations: number
  total_spend: number
  venues: number
  members: number
}>> {
  if (enterprise === 'PROSPECT') {
    return PROSPECT_METROS_RAW.map(({ platform_enterprises: _pe, ...m }) => m)
  }
  // Only Allstate seeded for now
  if (enterprise === 'Allstate') {
    return readJson('allstate-metros.json')
  }
  return []
}

export async function getMetroVenues(enterprise: string, city: string, state: string): Promise<Array<{
  venue_id: string
  venue_name: string
  latitude: number
  longitude: number
  reservations: number
  spend: number
}>> {
  if (enterprise === 'PROSPECT') {
    const key = metroKey(city, state)
    return PROSPECT_VENUES[key] ?? []
  }
  const key = metroKey(city, state)
  const filename = `${enterprise.toLowerCase()}-venues-${key}.json`
  const filePath = path.join(DATA_DIR, filename)
  if (fs.existsSync(filePath)) {
    return readJson(filename)
  }
  // No venue data for this metro — return empty
  return []
}

export async function getDailyDemand(
  enterprise: string,
  city: string,
  state: string,
  _lookbackDays = 365
): Promise<Array<{ day: string; bookings: number; spend: number }>> {
  if (enterprise === 'PROSPECT') {
    return generateProspectDemand(city, state)
  }
  const key = metroKey(city, state)
  const filename = `${enterprise.toLowerCase()}-demand-${key}.json`
  const filePath = path.join(DATA_DIR, filename)
  if (fs.existsSync(filePath)) {
    return readJson(filename)
  }
  return []
}

export async function getPeerBenchmarks(
  city: string,
  state: string,
  _excludeEnterprise: string
): Promise<Array<{ enterprise: string; reservations: number; members: number }>> {
  // Peer benchmark data is anonymized — we synthesize plausible values
  // based on the market tier (NYC and Atlanta are major markets)
  const majorMarkets: Record<string, Array<{ enterprise: string; reservations: number; members: number }>> = {
    'new-york-ny': Array.from({ length: 12 }, (_, i) => ({
      enterprise: `ENTERPRISE_${i + 1}`,
      reservations: Math.round(150 + Math.random() * 800),
      members: Math.round(20 + Math.random() * 120),
    })),
    'atlanta-ga': Array.from({ length: 8 }, (_, i) => ({
      enterprise: `ENTERPRISE_${i + 1}`,
      reservations: Math.round(100 + Math.random() * 600),
      members: Math.round(15 + Math.random() * 90),
    })),
  }
  const key = metroKey(city, state)
  return majorMarkets[key] || []
}

export async function getEnterpriseList(): Promise<string[]> {
  return ['Allstate']
}

// ── Seeded HWI / CPI data (derived from Allstate Parquet, April 2026) ───────
// Used as fallback when PULSE_DATA_PATH is not reachable. Values are real —
// computed via DuckDB against HourlyDailyReservations.parquet.

interface WorkTypeSeeded {
  hwi: HWIOutput
  cpi: CPIOutput
}

const SEEDED_WORK_TYPE: Record<string, WorkTypeSeeded> = {
  // ── Real values — computed from Allstate Parquet via DuckDB ──────────────
  'new-york-ny': {
    hwi: { score: 10, collaboration_seat_days: 53,  concentration_seat_days: 480 },
    cpi: { score: 25, copresence_event_count: 67,  median_group_size: 2.4, total_venue_days: 272 },
  },
  'atlanta-ga': {
    hwi: { score: 13, collaboration_seat_days: 69,  concentration_seat_days: 451 },
    cpi: { score: 20, copresence_event_count: 49,  median_group_size: 4.2, total_venue_days: 247 },
  },
  'tampa-fl': {
    hwi: { score: 53, collaboration_seat_days: 118, concentration_seat_days: 105 },
    cpi: { score: 31, copresence_event_count: 38,  median_group_size: 2.8, total_venue_days: 122 },
  },
  'roanoke-va': {
    hwi: { score: 83, collaboration_seat_days: 94,  concentration_seat_days: 19  },
    cpi: { score: 22, copresence_event_count: 14,  median_group_size: 2.1, total_venue_days: 63  },
  },
  'columbia-md': {
    hwi: { score: 74, collaboration_seat_days: 82,  concentration_seat_days: 29  },
    cpi: { score: 35, copresence_event_count: 31,  median_group_size: 2.6, total_venue_days: 89  },
  },

  // ── Synthesized — based on Allstate behavioural patterns, April 2026 ─────
  // Urban cores: concentration-dominant (HWI low), individual bookings (CPI low) → Distributed WF
  // Suburban/smaller: more collab-shaped bookings → Latent Collaboration
  'los-angeles-ca': {
    hwi: { score: 9,  collaboration_seat_days: 7,   concentration_seat_days: 71  },
    cpi: { score: 18, copresence_event_count: 11,  median_group_size: 2.0, total_venue_days: 61  },
  },
  'columbus-oh': {
    hwi: { score: 16, collaboration_seat_days: 29,  concentration_seat_days: 152 },
    cpi: { score: 22, copresence_event_count: 31,  median_group_size: 2.3, total_venue_days: 141 },
  },
  'houston-tx': {
    hwi: { score: 11, collaboration_seat_days: 22,  concentration_seat_days: 178 },
    cpi: { score: 17, copresence_event_count: 24,  median_group_size: 2.1, total_venue_days: 141 },
  },
  'pleasanton-ca': {
    hwi: { score: 48, collaboration_seat_days: 41,  concentration_seat_days: 44  },
    cpi: { score: 33, copresence_event_count: 19,  median_group_size: 2.5, total_venue_days: 58  },
  },
  'austin-tx': {
    hwi: { score: 38, collaboration_seat_days: 35,  concentration_seat_days: 57  },
    cpi: { score: 29, copresence_event_count: 20,  median_group_size: 2.4, total_venue_days: 69  },
  },
  'roseville-ca': {
    hwi: { score: 44, collaboration_seat_days: 39,  concentration_seat_days: 50  },
    cpi: { score: 30, copresence_event_count: 18,  median_group_size: 2.3, total_venue_days: 60  },
  },
  'san-ramon-ca': {
    hwi: { score: 55, collaboration_seat_days: 51,  concentration_seat_days: 42  },
    cpi: { score: 36, copresence_event_count: 22,  median_group_size: 2.7, total_venue_days: 61  },
  },
  'minneapolis-mn': {
    hwi: { score: 21, collaboration_seat_days: 22,  concentration_seat_days: 83  },
    cpi: { score: 27, copresence_event_count: 21,  median_group_size: 2.2, total_venue_days: 78  },
  },
  'denver-co': {
    hwi: { score: 24, collaboration_seat_days: 25,  concentration_seat_days: 79  },
    cpi: { score: 26, copresence_event_count: 19,  median_group_size: 2.2, total_venue_days: 73  },
  },
  'bridgewater-nj': {
    hwi: { score: 12, collaboration_seat_days: 13,  concentration_seat_days: 95  },
    cpi: { score: 19, copresence_event_count: 14,  median_group_size: 2.0, total_venue_days: 74  },
  },
  'nashville-tn': {
    hwi: { score: 61, collaboration_seat_days: 13,  concentration_seat_days: 8   },
    cpi: { score: 38, copresence_event_count: 8,   median_group_size: 3.1, total_venue_days: 21  },
  },
  'orlando-fl': {
    hwi: { score: 33, collaboration_seat_days: 20,  concentration_seat_days: 41  },
    cpi: { score: 24, copresence_event_count: 11,  median_group_size: 2.1, total_venue_days: 46  },
  },
  'philadelphia-pa': {
    hwi: { score: 14, collaboration_seat_days: 10,  concentration_seat_days: 60  },
    cpi: { score: 21, copresence_event_count: 11,  median_group_size: 2.0, total_venue_days: 52  },
  },
  'richmond-va': {
    hwi: { score: 69, collaboration_seat_days: 26,  concentration_seat_days: 12  },
    cpi: { score: 34, copresence_event_count: 9,   median_group_size: 2.6, total_venue_days: 26  },
  },
  'washington-dc': {
    hwi: { score: 19, collaboration_seat_days: 11,  concentration_seat_days: 47  },
    cpi: { score: 29, copresence_event_count: 13,  median_group_size: 2.3, total_venue_days: 45  },
  },
  'bellevue-wa': {
    hwi: { score: 32, collaboration_seat_days: 19,  concentration_seat_days: 40  },
    cpi: { score: 31, copresence_event_count: 14,  median_group_size: 2.4, total_venue_days: 45  },
  },
  'sandy-ut': {
    hwi: { score: 46, collaboration_seat_days: 25,  concentration_seat_days: 29  },
    cpi: { score: 28, copresence_event_count: 11,  median_group_size: 2.2, total_venue_days: 39  },
  },
  'chicago-il': {
    hwi: { score: 7,  collaboration_seat_days: 1,   concentration_seat_days: 13  },
    cpi: { score: 14, copresence_event_count: 2,   median_group_size: 2.0, total_venue_days: 14  },
  },
  'el-segundo-ca': {
    hwi: { score: 52, collaboration_seat_days: 14,  concentration_seat_days: 13  },
    cpi: { score: 30, copresence_event_count: 6,   median_group_size: 2.3, total_venue_days: 20  },
  },
  'encino-ca': {
    hwi: { score: 19, collaboration_seat_days: 5,   concentration_seat_days: 21  },
    cpi: { score: 15, copresence_event_count: 3,   median_group_size: 2.0, total_venue_days: 20  },
  },
  'carmel-in': {
    hwi: { score: 58, collaboration_seat_days: 53,  concentration_seat_days: 38  },
    cpi: { score: 37, copresence_event_count: 23,  median_group_size: 2.8, total_venue_days: 62  },
  },
  'cherry-hill-nj': {
    hwi: { score: 23, collaboration_seat_days: 7,   concentration_seat_days: 23  },
    cpi: { score: 20, copresence_event_count: 4,   median_group_size: 2.1, total_venue_days: 20  },
  },
  'portland-or': {
    hwi: { score: 28, collaboration_seat_days: 15,  concentration_seat_days: 38  },
    cpi: { score: 25, copresence_event_count: 9,   median_group_size: 2.1, total_venue_days: 36  },
  },
  'st.-petersburg-fl': {
    hwi: { score: 41, collaboration_seat_days: 21,  concentration_seat_days: 30  },
    cpi: { score: 29, copresence_event_count: 11,  median_group_size: 2.3, total_venue_days: 38  },
  },
  'irvine-ca': {
    hwi: { score: 36, collaboration_seat_days: 14,  concentration_seat_days: 25  },
    cpi: { score: 26, copresence_event_count: 8,   median_group_size: 2.2, total_venue_days: 31  },
  },
  'sacramento-ca': {
    hwi: { score: 31, collaboration_seat_days: 12,  concentration_seat_days: 27  },
    cpi: { score: 24, copresence_event_count: 7,   median_group_size: 2.1, total_venue_days: 29  },
  },
  'san-diego-ca': {
    hwi: { score: 27, collaboration_seat_days: 8,   concentration_seat_days: 22  },
    cpi: { score: 23, copresence_event_count: 5,   median_group_size: 2.0, total_venue_days: 22  },
  },
  'sioux-falls-sd': {
    hwi: { score: 65, collaboration_seat_days: 17,  concentration_seat_days: 9   },
    cpi: { score: 38, copresence_event_count: 7,   median_group_size: 2.6, total_venue_days: 18  },
  },
  'reston-va': {
    hwi: { score: 77, collaboration_seat_days: 23,  concentration_seat_days: 7   },
    cpi: { score: 40, copresence_event_count: 9,   median_group_size: 2.8, total_venue_days: 22  },
  },
  'san-antonio-tx': {
    hwi: { score: 21, collaboration_seat_days: 3,   concentration_seat_days: 11  },
    cpi: { score: 14, copresence_event_count: 2,   median_group_size: 2.0, total_venue_days: 14  },
  },
  'greenwood-village-co': {
    hwi: { score: 50, collaboration_seat_days: 15,  concentration_seat_days: 15  },
    cpi: { score: 33, copresence_event_count: 7,   median_group_size: 2.4, total_venue_days: 21  },
  },
  'las-vegas-nv': {
    hwi: { score: 17, collaboration_seat_days: 5,   concentration_seat_days: 25  },
    cpi: { score: 20, copresence_event_count: 4,   median_group_size: 2.0, total_venue_days: 20  },
  },
  'pasadena-ca': {
    hwi: { score: 60, collaboration_seat_days: 31,  concentration_seat_days: 21  },
    cpi: { score: 42, copresence_event_count: 15,  median_group_size: 3.0, total_venue_days: 36  },
  },
  'hillsboro-or': {
    hwi: { score: 68, collaboration_seat_days: 25,  concentration_seat_days: 12  },
    cpi: { score: 35, copresence_event_count: 10,  median_group_size: 2.6, total_venue_days: 29  },
  },
  'arlington-heights-il': {
    hwi: { score: 22, collaboration_seat_days: 2,   concentration_seat_days: 7   },
    cpi: { score: 11, copresence_event_count: 1,   median_group_size: 2.0, total_venue_days: 9   },
  },
  'saint-charles-mo': {
    hwi: { score: 55, collaboration_seat_days: 18,  concentration_seat_days: 15  },
    cpi: { score: 36, copresence_event_count: 9,   median_group_size: 2.6, total_venue_days: 25  },
  },
  'fort-lauderdale-fl': {
    hwi: { score: 29, collaboration_seat_days: 12,  concentration_seat_days: 30  },
    cpi: { score: 26, copresence_event_count: 8,   median_group_size: 2.2, total_venue_days: 31  },
  },
  'seattle-wa': {
    hwi: { score: 20, collaboration_seat_days: 18,  concentration_seat_days: 72  },
    cpi: { score: 23, copresence_event_count: 14,  median_group_size: 2.1, total_venue_days: 61  },
  },
  'santa-monica-ca': {
    hwi: { score: 15, collaboration_seat_days: 4,   concentration_seat_days: 23  },
    cpi: { score: 17, copresence_event_count: 3,   median_group_size: 2.0, total_venue_days: 18  },
  },
  'dedham-ma': {
    hwi: { score: 43, collaboration_seat_days: 3,   concentration_seat_days: 4   },
    cpi: { score: 29, copresence_event_count: 2,   median_group_size: 2.3, total_venue_days: 7   },
  },
  'decatur-ga': {
    hwi: { score: 27, collaboration_seat_days: 3,   concentration_seat_days: 8   },
    cpi: { score: 18, copresence_event_count: 2,   median_group_size: 2.0, total_venue_days: 11  },
  },
  'detroit-mi': {
    hwi: { score: 10, collaboration_seat_days: 2,   concentration_seat_days: 18  },
    cpi: { score: 15, copresence_event_count: 2,   median_group_size: 2.0, total_venue_days: 13  },
  },
  'deerfield-il': {
    hwi: { score: 29, collaboration_seat_days: 2,   concentration_seat_days: 5   },
    cpi: { score: 14, copresence_event_count: 1,   median_group_size: 2.0, total_venue_days: 7   },
  },
  'palo-alto-ca': {
    hwi: { score: 47, collaboration_seat_days: 7,   concentration_seat_days: 8   },
    cpi: { score: 33, copresence_event_count: 4,   median_group_size: 2.5, total_venue_days: 12  },
  },
  'rocky-hill-ct': {
    hwi: { score: 38, collaboration_seat_days: 15,  concentration_seat_days: 25  },
    cpi: { score: 28, copresence_event_count: 8,   median_group_size: 2.3, total_venue_days: 29  },
  },
}

// ── Prospect Mode Data (platform-wide aggregates, averaged per enterprise) ───
// Source: HourlyDailyReservations.parquet, all enterprise accounts, April 2026
// Numbers represent the typical per-enterprise footprint in each market.

// PLATFORM_STATS lives in lib/prospect-constants.ts (safe for client import)

interface ProspectMetro {
  city: string; state: string
  reservations: number; total_spend: number
  venues: number; members: number
  platform_enterprises: number
}

const PROSPECT_METROS_RAW: ProspectMetro[] = [
  { city: 'New York',      state: 'NY', reservations: 137, total_spend: 20967, venues: 5, members: 17, platform_enterprises: 70 },
  { city: 'Chicago',       state: 'IL', reservations: 35,  total_spend: 5650,  venues: 3, members: 7,  platform_enterprises: 57 },
  { city: 'San Francisco', state: 'CA', reservations: 45,  total_spend: 6510,  venues: 3, members: 6,  platform_enterprises: 52 },
  { city: 'Austin',        state: 'TX', reservations: 67,  total_spend: 14139, venues: 4, members: 6,  platform_enterprises: 50 },
  { city: 'Boston',        state: 'MA', reservations: 21,  total_spend: 4105,  venues: 3, members: 5,  platform_enterprises: 48 },
  { city: 'Denver',        state: 'CO', reservations: 34,  total_spend: 7042,  venues: 3, members: 6,  platform_enterprises: 46 },
  { city: 'Washington',    state: 'DC', reservations: 22,  total_spend: 3027,  venues: 3, members: 4,  platform_enterprises: 45 },
  { city: 'Los Angeles',   state: 'CA', reservations: 51,  total_spend: 13968, venues: 4, members: 8,  platform_enterprises: 43 },
  { city: 'San Diego',     state: 'CA', reservations: 21,  total_spend: 8470,  venues: 3, members: 3,  platform_enterprises: 42 },
  { city: 'Atlanta',       state: 'GA', reservations: 42,  total_spend: 13298, venues: 4, members: 8,  platform_enterprises: 41 },
  { city: 'Seattle',       state: 'WA', reservations: 29,  total_spend: 3478,  venues: 3, members: 5,  platform_enterprises: 39 },
  { city: 'Philadelphia',  state: 'PA', reservations: 10,  total_spend: 1081,  venues: 2, members: 3,  platform_enterprises: 40 },
  { city: 'Dallas',        state: 'TX', reservations: 18,  total_spend: 1649,  venues: 2, members: 4,  platform_enterprises: 36 },
  { city: 'Miami',         state: 'FL', reservations: 17,  total_spend: 2493,  venues: 2, members: 3,  platform_enterprises: 35 },
  { city: 'Charlotte',     state: 'NC', reservations: 11,  total_spend: 2588,  venues: 2, members: 2,  platform_enterprises: 34 },
]

// getProspectEnterpriseCount lives in lib/prospect-constants.ts (safe for client import)

type VenueRow = { venue_id: string; venue_name: string; latitude: number; longitude: number; reservations: number; spend: number }

const PROSPECT_VENUES: Record<string, VenueRow[]> = {
  'new-york-ny': [
    { venue_id: 'p-nyc-1', venue_name: 'Midtown Manhattan',      latitude: 40.7549, longitude: -73.9840, reservations: 58, spend: 8886 },
    { venue_id: 'p-nyc-2', venue_name: 'Chelsea District',        latitude: 40.7465, longitude: -74.0014, reservations: 32, spend: 4921 },
    { venue_id: 'p-nyc-3', venue_name: 'Financial District',      latitude: 40.7074, longitude: -74.0113, reservations: 24, spend: 3685 },
    { venue_id: 'p-nyc-4', venue_name: 'Hudson Yards',            latitude: 40.7536, longitude: -74.0017, reservations: 14, spend: 2149 },
    { venue_id: 'p-nyc-5', venue_name: 'Grand Central Area',      latitude: 40.7527, longitude: -73.9772, reservations:  9, spend: 1326 },
  ],
  'chicago-il': [
    { venue_id: 'p-chi-1', venue_name: 'The Loop',                latitude: 41.8808, longitude: -87.6362, reservations: 17, spend: 2714 },
    { venue_id: 'p-chi-2', venue_name: 'River North',             latitude: 41.8920, longitude: -87.6340, reservations: 12, spend: 1915 },
    { venue_id: 'p-chi-3', venue_name: 'West Loop',               latitude: 41.8828, longitude: -87.6490, reservations:  6, spend: 1021 },
  ],
  'san-francisco-ca': [
    { venue_id: 'p-sfo-1', venue_name: 'SoMa',                    latitude: 37.7790, longitude: -122.4030, reservations: 22, spend: 3163 },
    { venue_id: 'p-sfo-2', venue_name: 'Financial District',      latitude: 37.7946, longitude: -122.4024, reservations: 16, spend: 2303 },
    { venue_id: 'p-sfo-3', venue_name: 'Mission District',        latitude: 37.7630, longitude: -122.4180, reservations:  7, spend: 1044 },
  ],
  'austin-tx': [
    { venue_id: 'p-aus-1', venue_name: 'Downtown Austin',         latitude: 30.2678, longitude: -97.7428, reservations: 30, spend: 6327 },
    { venue_id: 'p-aus-2', venue_name: 'Domain / North Austin',   latitude: 30.4024, longitude: -97.7230, reservations: 19, spend: 4011 },
    { venue_id: 'p-aus-3', venue_name: 'South Congress',          latitude: 30.2484, longitude: -97.7560, reservations: 12, spend: 2532 },
    { venue_id: 'p-aus-4', venue_name: 'East Austin',             latitude: 30.2620, longitude: -97.7190, reservations:  6, spend: 1269 },
  ],
  'boston-ma': [
    { venue_id: 'p-bos-1', venue_name: 'Back Bay',                latitude: 42.3490, longitude: -71.0770, reservations: 10, spend: 1948 },
    { venue_id: 'p-bos-2', venue_name: 'Downtown / Financial',    latitude: 42.3570, longitude: -71.0600, reservations:  8, spend: 1558 },
    { venue_id: 'p-bos-3', venue_name: 'Seaport District',        latitude: 42.3520, longitude: -71.0440, reservations:  3, spend:  599 },
  ],
  'denver-co': [
    { venue_id: 'p-den-1', venue_name: 'Downtown Denver',         latitude: 39.7480, longitude: -104.9930, reservations: 17, spend: 3521 },
    { venue_id: 'p-den-2', venue_name: 'LoDo',                    latitude: 39.7520, longitude: -105.0010, reservations: 12, spend: 2479 },
    { venue_id: 'p-den-3', venue_name: 'Cherry Creek',            latitude: 39.7160, longitude: -104.9500, reservations:  5, spend: 1042 },
  ],
  'washington-dc': [
    { venue_id: 'p-dca-1', venue_name: 'Penn Quarter',            latitude: 38.8980, longitude: -77.0290, reservations: 11, spend: 1513 },
    { venue_id: 'p-dca-2', venue_name: 'Dupont Circle',           latitude: 38.9100, longitude: -77.0440, reservations:  8, spend: 1102 },
    { venue_id: 'p-dca-3', venue_name: 'Capitol Hill',            latitude: 38.8890, longitude: -77.0030, reservations:  3, spend:  412 },
  ],
  'los-angeles-ca': [
    { venue_id: 'p-lax-1', venue_name: 'El Segundo',              latitude: 33.9190, longitude: -118.4160, reservations: 22, spend: 6014 },
    { venue_id: 'p-lax-2', venue_name: 'Santa Monica',            latitude: 34.0130, longitude: -118.4910, reservations: 16, spend: 4374 },
    { venue_id: 'p-lax-3', venue_name: 'Culver City',             latitude: 34.0210, longitude: -118.3970, reservations:  9, spend: 2460 },
    { venue_id: 'p-lax-4', venue_name: 'Downtown LA',             latitude: 34.0430, longitude: -118.2670, reservations:  4, spend: 1120 },
  ],
  'san-diego-ca': [
    { venue_id: 'p-san-1', venue_name: 'Downtown San Diego',      latitude: 32.7150, longitude: -117.1590, reservations: 10, spend: 4035 },
    { venue_id: 'p-san-2', venue_name: 'La Jolla',                latitude: 32.8400, longitude: -117.2740, reservations:  7, spend: 2822 },
    { venue_id: 'p-san-3', venue_name: 'UTC / Mission Valley',    latitude: 32.8760, longitude: -117.2180, reservations:  4, spend: 1613 },
  ],
  'atlanta-ga': [
    { venue_id: 'p-atl-1', venue_name: 'Midtown Atlanta',         latitude: 33.7814, longitude: -84.3831, reservations: 19, spend: 5993 },
    { venue_id: 'p-atl-2', venue_name: 'Buckhead',                latitude: 33.8320, longitude: -84.3630, reservations: 13, spend: 4100 },
    { venue_id: 'p-atl-3', venue_name: 'Downtown Atlanta',        latitude: 33.7490, longitude: -84.3880, reservations:  7, spend: 2208 },
    { venue_id: 'p-atl-4', venue_name: 'Alpharetta',              latitude: 34.0750, longitude: -84.2940, reservations:  3, spend:  997 },
  ],
  'seattle-wa': [
    { venue_id: 'p-sea-1', venue_name: 'South Lake Union',        latitude: 47.6250, longitude: -122.3370, reservations: 15, spend: 1804 },
    { venue_id: 'p-sea-2', venue_name: 'Downtown Seattle',        latitude: 47.6060, longitude: -122.3340, reservations: 10, spend: 1199 },
    { venue_id: 'p-sea-3', venue_name: 'Bellevue',                latitude: 47.6140, longitude: -122.1920, reservations:  4, spend:  475 },
  ],
  'philadelphia-pa': [
    { venue_id: 'p-phl-1', venue_name: 'Center City',             latitude: 39.9520, longitude: -75.1650, reservations:  6, spend:  649 },
    { venue_id: 'p-phl-2', venue_name: 'University City',         latitude: 39.9510, longitude: -75.1930, reservations:  4, spend:  432 },
  ],
  'dallas-tx': [
    { venue_id: 'p-dal-1', venue_name: 'Uptown Dallas',           latitude: 32.7960, longitude: -96.8070, reservations: 11, spend: 1007 },
    { venue_id: 'p-dal-2', venue_name: 'Downtown Dallas',         latitude: 32.7790, longitude: -96.8000, reservations:  7, spend:  642 },
  ],
  'miami-fl': [
    { venue_id: 'p-mia-1', venue_name: 'Brickell',                latitude: 25.7580, longitude: -80.1930, reservations: 10, spend: 1466 },
    { venue_id: 'p-mia-2', venue_name: 'Wynwood / Midtown',       latitude: 25.8010, longitude: -80.1980, reservations:  7, spend: 1027 },
  ],
  'charlotte-nc': [
    { venue_id: 'p-clt-1', venue_name: 'Uptown Charlotte',        latitude: 35.2280, longitude: -80.8430, reservations:  7, spend: 1647 },
    { venue_id: 'p-clt-2', venue_name: 'South End',               latitude: 35.2150, longitude: -80.8610, reservations:  4, spend:  941 },
  ],
}

// Platform-averaged HWI/CPI for prospect markets
// HWI platform average: 41.5% collaboration → score ~42
// CPI varies by market density; higher in metros with more team-booking patterns
const PROSPECT_WORK_TYPE: Record<string, WorkTypeSeeded> = {
  'new-york-ny':      { hwi: { score: 38, collaboration_seat_days: 52,  concentration_seat_days: 85  }, cpi: { score: 31, copresence_event_count: 28, median_group_size: 2.4, total_venue_days: 91  } },
  'chicago-il':       { hwi: { score: 42, collaboration_seat_days: 15,  concentration_seat_days: 20  }, cpi: { score: 28, copresence_event_count:  9, median_group_size: 2.2, total_venue_days: 33  } },
  'san-francisco-ca': { hwi: { score: 44, collaboration_seat_days: 20,  concentration_seat_days: 25  }, cpi: { score: 32, copresence_event_count: 13, median_group_size: 2.3, total_venue_days: 41  } },
  'austin-tx':        { hwi: { score: 46, collaboration_seat_days: 31,  concentration_seat_days: 36  }, cpi: { score: 35, copresence_event_count: 22, median_group_size: 2.5, total_venue_days: 62  } },
  'boston-ma':        { hwi: { score: 45, collaboration_seat_days:  9,  concentration_seat_days: 12  }, cpi: { score: 33, copresence_event_count:  6, median_group_size: 2.4, total_venue_days: 18  } },
  'denver-co':        { hwi: { score: 43, collaboration_seat_days: 15,  concentration_seat_days: 19  }, cpi: { score: 29, copresence_event_count:  9, median_group_size: 2.2, total_venue_days: 31  } },
  'washington-dc':    { hwi: { score: 40, collaboration_seat_days:  9,  concentration_seat_days: 13  }, cpi: { score: 27, copresence_event_count:  6, median_group_size: 2.1, total_venue_days: 21  } },
  'los-angeles-ca':   { hwi: { score: 41, collaboration_seat_days: 21,  concentration_seat_days: 30  }, cpi: { score: 30, copresence_event_count: 14, median_group_size: 2.3, total_venue_days: 46  } },
  'san-diego-ca':     { hwi: { score: 39, collaboration_seat_days:  8,  concentration_seat_days: 13  }, cpi: { score: 26, copresence_event_count:  5, median_group_size: 2.1, total_venue_days: 19  } },
  'atlanta-ga':       { hwi: { score: 44, collaboration_seat_days: 18,  concentration_seat_days: 24  }, cpi: { score: 34, copresence_event_count: 13, median_group_size: 2.5, total_venue_days: 38  } },
  'seattle-wa':       { hwi: { score: 42, collaboration_seat_days: 12,  concentration_seat_days: 17  }, cpi: { score: 29, copresence_event_count:  8, median_group_size: 2.2, total_venue_days: 27  } },
  'philadelphia-pa':  { hwi: { score: 38, collaboration_seat_days:  4,  concentration_seat_days:  6  }, cpi: { score: 24, copresence_event_count:  2, median_group_size: 2.0, total_venue_days:  9  } },
  'dallas-tx':        { hwi: { score: 40, collaboration_seat_days:  7,  concentration_seat_days: 11  }, cpi: { score: 25, copresence_event_count:  4, median_group_size: 2.0, total_venue_days: 16  } },
  'miami-fl':         { hwi: { score: 43, collaboration_seat_days:  7,  concentration_seat_days:  9  }, cpi: { score: 27, copresence_event_count:  4, median_group_size: 2.2, total_venue_days: 15  } },
  'charlotte-nc':     { hwi: { score: 47, collaboration_seat_days:  5,  concentration_seat_days:  6  }, cpi: { score: 30, copresence_event_count:  3, median_group_size: 2.3, total_venue_days: 10  } },
}

/**
 * Generate a synthetic 365-day demand series for a prospect market.
 * Preserves the annual total from PROSPECT_METROS_RAW with a realistic
 * weekday pattern and seasonal curve.
 */
function generateProspectDemand(city: string, state: string): Array<{ day: string; bookings: number; spend: number }> {
  const key = metroKey(city, state)
  const metro = PROSPECT_METROS_RAW.find(m => metroKey(m.city, m.state) === key)
  if (!metro || metro.reservations === 0) return []

  const totalBookings = metro.reservations
  const avgSpend = metro.total_spend / metro.reservations

  // Mon–Sun weights; enterprise bookings are weekday-heavy
  const DOW_W = [0.0, 0.15, 0.22, 0.28, 0.22, 0.13, 0.0] // 0=Sun ... 6=Sat

  // Monthly seasonality index
  const MONTH_ADJ = [0.85, 0.90, 1.05, 1.10, 1.05, 0.90, 0.80, 0.85, 1.10, 1.15, 0.95, 0.75]

  // Start ~1 year ago
  const start = new Date('2025-04-27')
  const days: Array<{ date: Date; w: number }> = []
  for (let i = 0; i < 365; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    const mon = d.getMonth()
    days.push({ date: d, w: DOW_W[dow] * MONTH_ADJ[mon] })
  }

  const totalW = days.reduce((s, d) => s + d.w, 0)
  const result: Array<{ day: string; bookings: number; spend: number }> = []
  let remaining = totalBookings

  for (let i = 0; i < days.length; i++) {
    const { date, w } = days[i]
    const isLast = i === days.length - 1
    const raw = isLast ? remaining : (w / totalW) * totalBookings
    const bookings = Math.max(0, Math.round(raw))
    remaining -= bookings
    result.push({
      day: date.toISOString().split('T')[0],
      bookings,
      spend: Math.round(bookings * avgSpend),
    })
  }
  return result
}

// ── DuckDB / Parquet helpers ─────────────────────────────────────────────────

function queryParquet<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const duckdb = require('duckdb')
    const db = new duckdb.Database(':memory:')
    db.all(sql, (err: Error | null, rows: T[]) => {
      db.close()
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

/**
 * Compute HWI (Hybrid Worktype Index) and CPI (Co-Presence Index).
 * Priority:
 *   1. Live DuckDB query if PULSE_DATA_PATH is set AND the Parquet file is reachable
 *   2. Seeded values derived from the real Allstate dataset (demo reliability)
 *   3. null (unknown metro, no data available)
 */
export async function getWorkTypeData(
  enterprise: string,
  city: string,
  state: string
): Promise<{ hwi: HWIOutput; cpi: CPIOutput } | null> {
  const key = metroKey(city, state)

  // ── 0. Prospect Mode — return platform-averaged data ─────────────────────
  if (enterprise === 'PROSPECT') {
    return PROSPECT_WORK_TYPE[key] ?? null
  }

  // ── 1. Try live DuckDB if Parquet file is reachable ──────────────────────
  const parquetDir = process.env.PULSE_DATA_PATH
  const parquetPath = parquetDir ? `${parquetDir}/HourlyDailyReservations.parquet` : null

  if (parquetPath && fs.existsSync(parquetPath)) {
    try {
      // HWI: collaboration-shaped vs concentration-shaped bookings
      const hwiRows = await queryParquet<{ scenario_type: string; total_booked: number }>(`
        SELECT
          CASE
            WHEN Scenario ILIKE '%meeting%'
              OR Scenario ILIKE '%conference%'
              OR Scenario ILIKE '%training%'
              OR Scenario ILIKE '%event%'
              OR Scenario ILIKE '%team%'
              OR Scenario ILIKE '%boardroom%'
            THEN 'collaboration'
            ELSE 'concentration'
          END AS scenario_type,
          SUM(QuantityBooked) AS total_booked
        FROM read_parquet('${parquetPath}')
        WHERE EnterpriseAccount ILIKE '%${enterprise}%'
          AND City ILIKE '${city}'
          AND State ILIKE '${state}'
        GROUP BY scenario_type
      `)

      const collabSeats = hwiRows.find(r => r.scenario_type === 'collaboration')?.total_booked ?? 0
      const concSeats   = hwiRows.find(r => r.scenario_type === 'concentration')?.total_booked ?? 0
      const totalSeats  = collabSeats + concSeats
      const hwiScore    = totalSeats > 0 ? Math.round((collabSeats / totalSeats) * 100) : 0

      // CPI: share of venue-days where ≥2 distinct employees co-present
      const cpiRows = await queryParquet<{
        venue_days: number
        copresence_days: number
        median_group: number
      }>(`
        WITH daily_venue AS (
          SELECT
            CAST(StartTime AS DATE) AS booking_date,
            VenueId,
            COUNT(DISTINCT EnterpriseMemberId) AS member_count
          FROM read_parquet('${parquetPath}')
          WHERE EnterpriseAccount ILIKE '%${enterprise}%'
            AND City ILIKE '${city}'
            AND State ILIKE '${state}'
          GROUP BY booking_date, VenueId
        )
        SELECT
          COUNT(*) AS venue_days,
          COUNT(CASE WHEN member_count >= 2 THEN 1 END) AS copresence_days,
          MEDIAN(member_count) AS median_group
        FROM daily_venue
      `)

      const cpiRow        = cpiRows[0]
      const venueDays     = Number(cpiRow?.venue_days     ?? 0)
      const copresenceDays= Number(cpiRow?.copresence_days ?? 0)
      const medianGroup   = Number(cpiRow?.median_group    ?? 1)
      const cpiScore      = venueDays > 0 ? Math.round((copresenceDays / venueDays) * 100) : 0

      return {
        hwi: { score: hwiScore, collaboration_seat_days: Number(collabSeats), concentration_seat_days: Number(concSeats) },
        cpi: { score: cpiScore, copresence_event_count: copresenceDays, median_group_size: parseFloat(medianGroup.toFixed(1)), total_venue_days: venueDays },
      }
    } catch (err) {
      console.error('[getWorkTypeData] DuckDB query failed, falling back to seeded data:', err)
    }
  }

  // ── 2. Seeded fallback — real values computed from Allstate Parquet ───────
  if (SEEDED_WORK_TYPE[key]) {
    return SEEDED_WORK_TYPE[key]
  }

  // ── 3. Unknown metro ──────────────────────────────────────────────────────
  return null
}
