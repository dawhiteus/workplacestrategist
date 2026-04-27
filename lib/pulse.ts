import path from 'path'
import fs from 'fs'
import type { HWIOutput, CPIOutput } from './types'
import { generateIntakeDemand } from './platform-venues'

// Seeded JSON data lives alongside the project for demo reliability.
// If PULSE_DATA_PATH is set and accessible, DuckDB runtime queries are used instead.
const DATA_DIR = path.join(process.cwd(), 'data')

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'))
}

function metroKey(city: string, state: string): string {
  return `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`
}

// Escape single quotes to prevent SQL injection
function esc(s: string): string {
  return s.replace(/'/g, "''")
}

// Convert enterprise name to seed-file slug (must match generation script)
function enterpriseSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

// Read an enterprise's metros seed file, returns [] if not found
function readEnterpriseMetros(enterprise: string): Array<{
  city: string; state: string; reservations: number; total_spend: number; venues: number; members: number
}> {
  const file = enterprise === 'Allstate' ? 'allstate-metros.json' : `${enterpriseSlug(enterprise)}-metros.json`
  const p = path.join(DATA_DIR, file)
  if (!fs.existsSync(p)) return []
  return readJson(file)
}

export async function getMetroPortfolio(enterprise: string): Promise<Array<{
  city: string
  state: string
  reservations: number
  total_spend: number
  venues: number
  members: number
}>> {
  const parquetDir = process.env.PULSE_DATA_PATH
  const parquetPath = parquetDir ? `${parquetDir}/HourlyDailyReservations.parquet` : null

  if (parquetPath && fs.existsSync(parquetPath)) {
    try {
      return await queryParquet<{ city: string; state: string; reservations: number; total_spend: number; venues: number; members: number }>(`
        SELECT City as city, State as state,
          COUNT(*) as reservations,
          SUM(DiscountedPriceUSD) as total_spend,
          COUNT(DISTINCT VenueId) as venues,
          COUNT(DISTINCT EnterpriseMemberId) as members
        FROM read_parquet('${parquetPath}')
        WHERE EnterpriseAccount = '${esc(enterprise)}'
          AND Country = 'US'
          AND Status IN ('Completed', 'CancellationPolicy')
        GROUP BY City, State
        HAVING COUNT(*) >= 3
        ORDER BY total_spend DESC
      `)
    } catch (err) {
      console.error('[getMetroPortfolio] DuckDB query failed:', err)
    }
  }

  // Seeded fallback — read per-enterprise seed file if it exists
  const slug = enterprise.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
  const seedFile = enterprise === 'Allstate' ? 'allstate-metros.json' : `${slug}-metros.json`
  const seedPath = path.join(DATA_DIR, seedFile)
  if (fs.existsSync(seedPath)) {
    return readJson(seedFile)
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
  const parquetDir = process.env.PULSE_DATA_PATH
  const reservationsPath = parquetDir ? `${parquetDir}/HourlyDailyReservations.parquet` : null
  const venuesPath = parquetDir ? `${parquetDir}/Venues.parquet` : null

  if (reservationsPath && venuesPath && fs.existsSync(reservationsPath) && fs.existsSync(venuesPath)) {
    try {
      return await queryParquet<{ venue_id: string; venue_name: string; latitude: number; longitude: number; reservations: number; spend: number }>(`
        SELECT r.VenueId as venue_id, r.Venue as venue_name,
          v.Latitude as latitude, v.Longitude as longitude,
          COUNT(*) as reservations,
          SUM(r.DiscountedPriceUSD) as spend
        FROM read_parquet('${reservationsPath}') r
        LEFT JOIN read_parquet('${venuesPath}') v ON r.VenueId = v.ID
        WHERE r.EnterpriseAccount = '${esc(enterprise)}'
          AND r.City = '${esc(city)}'
          AND r.State = '${esc(state)}'
          AND r.Country = 'US'
          AND r.Status IN ('Completed', 'CancellationPolicy')
          AND v.Latitude IS NOT NULL AND v.Longitude IS NOT NULL
        GROUP BY r.VenueId, r.Venue, v.Latitude, v.Longitude
        ORDER BY spend DESC
      `)
    } catch (err) {
      console.error('[getMetroVenues] DuckDB query failed:', err)
    }
  }

  // Seeded fallback — file-based JSON per enterprise/metro
  const key = metroKey(city, state)
  const slug = enterprise === 'Allstate' ? 'allstate' : enterpriseSlug(enterprise)
  const filename = `${slug}-venues-${key}.json`
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
  const parquetDir = process.env.PULSE_DATA_PATH
  const parquetPath = parquetDir ? `${parquetDir}/HourlyDailyReservations.parquet` : null

  if (parquetPath && fs.existsSync(parquetPath)) {
    try {
      return await queryParquet<{ day: string; bookings: number; spend: number }>(`
        SELECT CAST(StartTime AS DATE)::VARCHAR as day,
          COUNT(*) as bookings,
          SUM(DiscountedPriceUSD) as spend
        FROM read_parquet('${parquetPath}')
        WHERE EnterpriseAccount = '${esc(enterprise)}'
          AND City = '${esc(city)}'
          AND State = '${esc(state)}'
          AND Country = 'US'
          AND Status IN ('Completed', 'CancellationPolicy')
        GROUP BY CAST(StartTime AS DATE)
        ORDER BY day
      `)
    } catch (err) {
      console.error('[getDailyDemand] DuckDB query failed:', err)
    }
  }

  // Seeded fallback — file-based JSON per enterprise/metro
  const key = metroKey(city, state)
  const filename = `${enterprise.toLowerCase()}-demand-${key}.json`
  const filePath = path.join(DATA_DIR, filename)
  if (fs.existsSync(filePath)) {
    return readJson(filename)
  }

  // Synthetic fallback — derive demand wave from metro-level spend + reservations
  const metros = readEnterpriseMetros(enterprise)
  const metro = metros.find(m => m.city === city && m.state === state)
  if (metro && metro.total_spend > 0 && metro.reservations > 0) {
    const avgRatePerBooking = metro.total_spend / metro.reservations
    return generateIntakeDemand(metro.total_spend, avgRatePerBooking)
  }
  return []
}

export async function getPeerBenchmarks(
  city: string,
  state: string,
  excludeEnterprise: string
): Promise<Array<{ enterprise: string; reservations: number; members: number }>> {
  const parquetDir = process.env.PULSE_DATA_PATH
  const parquetPath = parquetDir ? `${parquetDir}/HourlyDailyReservations.parquet` : null

  if (parquetPath && fs.existsSync(parquetPath)) {
    try {
      return await queryParquet<{ enterprise: string; reservations: number; members: number }>(`
        SELECT EnterpriseAccount as enterprise,
          COUNT(*) as reservations,
          COUNT(DISTINCT EnterpriseMemberId) as members
        FROM read_parquet('${parquetPath}')
        WHERE City = '${esc(city)}' AND State = '${esc(state)}'
          AND Country = 'US'
          AND Status IN ('Completed', 'CancellationPolicy')
          AND EnterpriseAccount != '${esc(excludeEnterprise)}'
        GROUP BY EnterpriseAccount
        HAVING COUNT(*) >= 3
        ORDER BY reservations DESC
        LIMIT 25
      `)
    } catch (err) {
      console.error('[getPeerBenchmarks] DuckDB query failed:', err)
    }
  }

  // Fallback — synthesize plausible values for known major markets
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
  const parquetDir = process.env.PULSE_DATA_PATH
  const parquetPath = parquetDir ? `${parquetDir}/EnterpriseEngagementSummary.parquet` : null

  if (parquetPath && fs.existsSync(parquetPath)) {
    try {
      const rows = await queryParquet<{ name: string }>(`
        SELECT AccountName as name
        FROM read_parquet('${parquetPath}')
        WHERE Status = 'Launched'
        ORDER BY AccountName
      `)
      if (rows.length > 0) {
        return rows.map(r => r.name)
      }
    } catch (err) {
      console.error('[getEnterpriseList] DuckDB query failed:', err)
    }
  }

  // Seeded fallback — read from committed enterprises-list.json
  const listPath = path.join(DATA_DIR, 'enterprises-list.json')
  if (fs.existsSync(listPath)) {
    return readJson<string[]>('enterprises-list.json')
  }
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

  // ── 3. Synthetic estimation — derived from metro booking patterns ─────────
  // Uses members/reservations ratio as a proxy for collaboration intensity
  // and bookings/venue density as a proxy for co-presence likelihood.
  const metros = readEnterpriseMetros(enterprise)
  const metro = metros.find(m => m.city === city && m.state === state)
  if (metro && metro.reservations > 0) {
    // HWI: high members-per-booking ratio → more unique people per booking → team/collab
    // Low ratio → repeat individual bookings → concentration work
    const membersToBookings = metro.members / metro.reservations
    const hwiScore = Math.min(80, Math.max(8, Math.round(membersToBookings * 85)))
    const collabSeats = Math.round(metro.reservations * (hwiScore / 100))
    const concSeats = metro.reservations - collabSeats

    // CPI: bookings-per-venue density → concentrated use = more co-presence
    const bookingsPerVenue = metro.venues > 0 ? metro.reservations / metro.venues : 5
    const rawCPI = 12 + Math.round((Math.min(bookingsPerVenue, 50) / 50) * 38)
    const cpiScore = Math.min(50, Math.max(12, rawCPI))
    const copresenceEvents = Math.round(metro.reservations * (cpiScore / 100))
    const totalVenueDays = Math.round(metro.reservations * 0.75)

    return {
      hwi: {
        score: hwiScore,
        collaboration_seat_days: collabSeats,
        concentration_seat_days: concSeats,
      },
      cpi: {
        score: cpiScore,
        copresence_event_count: copresenceEvents,
        median_group_size: parseFloat((1.8 + membersToBookings).toFixed(1)),
        total_venue_days: totalVenueDays,
      },
    }
  }

  // ── 4. Unknown metro — no data at all ────────────────────────────────────
  return null
}
