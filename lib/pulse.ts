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
 * Compute HWI (Hybrid Worktype Index) and CPI (Co-Presence Index) from
 * HourlyDailyReservations Parquet for a given enterprise + metro.
 * Returns null if PULSE_DATA_PATH is not configured or the query fails.
 */
export async function getWorkTypeData(
  enterprise: string,
  city: string,
  state: string
): Promise<{ hwi: HWIOutput; cpi: CPIOutput } | null> {
  const parquetDir = process.env.PULSE_DATA_PATH
  if (!parquetDir) return null

  const parquetPath = `${parquetDir}/HourlyDailyReservations.parquet`

  try {
    // ── HWI: classify bookings as collaboration-shaped vs concentration-shaped ──
    // Collaboration: meeting rooms, conference rooms, training, event, team spaces
    // Concentration: private offices, hot desks, dedicated desks, focus rooms
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
    const concSeats = hwiRows.find(r => r.scenario_type === 'concentration')?.total_booked ?? 0
    const totalSeats = collabSeats + concSeats
    const hwiScore = totalSeats > 0 ? Math.round((collabSeats / totalSeats) * 100) : 0

    // ── CPI: share of venue-days with ≥2 distinct employees ──
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

    const cpiRow = cpiRows[0]
    const venueDays = Number(cpiRow?.venue_days ?? 0)
    const copresenceDays = Number(cpiRow?.copresence_days ?? 0)
    const medianGroup = Number(cpiRow?.median_group ?? 1)
    const cpiScore = venueDays > 0 ? Math.round((copresenceDays / venueDays) * 100) : 0

    return {
      hwi: {
        score: hwiScore,
        collaboration_seat_days: Number(collabSeats),
        concentration_seat_days: Number(concSeats),
      },
      cpi: {
        score: cpiScore,
        copresence_event_count: copresenceDays,
        median_group_size: parseFloat(medianGroup.toFixed(1)),
        total_venue_days: venueDays,
      },
    }
  } catch (err) {
    console.error('[getWorkTypeData]', err)
    return null
  }
}
