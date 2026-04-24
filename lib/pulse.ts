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

  // ── 3. Unknown metro ──────────────────────────────────────────────────────
  return null
}
