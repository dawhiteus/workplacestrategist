#!/usr/bin/env node
/**
 * Pulse Data Server
 *
 * Standalone HTTP server that exposes Parquet query results over REST.
 * Run on any machine that has access to the Parquet files.
 *
 * Usage:
 *   PULSE_DATA_PATH=/path/to/parquet/dir node scripts/data-server.js
 *   PORT=3099 PULSE_DATA_PATH=... node scripts/data-server.js
 *
 * Default port: 3099
 *
 * Endpoints:
 *   GET /health
 *   GET /enterprises
 *   GET /metros?enterprise=X
 *   GET /venues?enterprise=X&city=X&state=X&country=X
 *   GET /daily-demand?enterprise=X&city=X&state=X&country=X&lookback=365
 *   GET /peers?city=X&state=X&exclude=X&country=X
 *   GET /work-type?enterprise=X&city=X&state=X&country=X
 */

const http = require('http')
const url  = require('url')

const DATA_PATH = process.env.PULSE_DATA_PATH
const PORT      = parseInt(process.env.PORT || '3099', 10)

if (!DATA_PATH) {
  console.error('Error: PULSE_DATA_PATH env var is required')
  console.error('Example: PULSE_DATA_PATH=/Users/jswanson/PycharmProjects/IndependeskCrawler/data-output node scripts/data-server.js')
  process.exit(1)
}

const RES_FILE = `${DATA_PATH}/HourlyDailyReservations.parquet`
const VEN_FILE = `${DATA_PATH}/Venues.parquet`

// ── DuckDB helper ─────────────────────────────────────────────────────────────

function queryParquet(sql) {
  return new Promise((resolve, reject) => {
    const duckdb = require('duckdb')
    const db = new duckdb.Database(':memory:')
    db.all(sql, (err, rows) => {
      db.close()
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s).replace(/'/g, "''")
}

const COUNTRY_CODE_MAP = {
  'Canada': 'CA', 'Netherlands': 'NL', 'Malaysia': 'MY', 'Switzerland': 'CH',
  'Germany': 'DE', 'United Kingdom': 'GB', 'Australia': 'AU', 'France': 'FR',
  'Singapore': 'SG', 'Japan': 'JP', 'Ireland': 'IE', 'Spain': 'ES',
  'Sweden': 'SE', 'Belgium': 'BE', 'Slovenia': 'SI', 'India': 'IN',
  'Mexico': 'MX', 'Brazil': 'BR', 'South Africa': 'ZA', 'Philippines': 'PH',
  'Indonesia': 'ID', 'Poland': 'PL', 'Czech Republic': 'CZ', 'Romania': 'RO',
  'Hungary': 'HU', 'Portugal': 'PT', 'Norway': 'NO', 'Denmark': 'DK',
  'Finland': 'FI', 'Austria': 'AT', 'New Zealand': 'NZ', 'Israel': 'IL',
  'UAE': 'AE', 'Hong Kong': 'HK', 'Taiwan': 'TW', 'South Korea': 'KR',
  'Thailand': 'TH', 'Vietnam': 'VN',
}

function countryNameToCode(name) {
  return COUNTRY_CODE_MAP[name] || name
}

// ── Query functions ───────────────────────────────────────────────────────────

async function getEnterprises() {
  const rows = await queryParquet(`
    SELECT DISTINCT EnterpriseAccount as name
    FROM read_parquet('${RES_FILE}')
    WHERE Status = 'Completed'
    ORDER BY name
  `)
  return rows.map(r => r.name)
}

async function getMetros(enterprise) {
  const COUNTRY_CASE = `CASE Country
    WHEN 'CA' THEN 'Canada'         WHEN 'NL' THEN 'Netherlands'
    WHEN 'MY' THEN 'Malaysia'        WHEN 'CH' THEN 'Switzerland'
    WHEN 'DE' THEN 'Germany'         WHEN 'GB' THEN 'United Kingdom'
    WHEN 'UK' THEN 'United Kingdom'  WHEN 'AU' THEN 'Australia'
    WHEN 'FR' THEN 'France'          WHEN 'SG' THEN 'Singapore'
    WHEN 'JP' THEN 'Japan'           WHEN 'IE' THEN 'Ireland'
    WHEN 'ES' THEN 'Spain'           WHEN 'SE' THEN 'Sweden'
    WHEN 'BE' THEN 'Belgium'         WHEN 'SI' THEN 'Slovenia'
    WHEN 'IN' THEN 'India'           WHEN 'MX' THEN 'Mexico'
    WHEN 'BR' THEN 'Brazil'          WHEN 'ZA' THEN 'South Africa'
    WHEN 'PH' THEN 'Philippines'     WHEN 'ID' THEN 'Indonesia'
    WHEN 'PL' THEN 'Poland'          WHEN 'CZ' THEN 'Czech Republic'
    WHEN 'RO' THEN 'Romania'         WHEN 'HU' THEN 'Hungary'
    WHEN 'PT' THEN 'Portugal'        WHEN 'NO' THEN 'Norway'
    WHEN 'DK' THEN 'Denmark'         WHEN 'FI' THEN 'Finland'
    WHEN 'AT' THEN 'Austria'         WHEN 'NZ' THEN 'New Zealand'
    WHEN 'IL' THEN 'Israel'          WHEN 'AE' THEN 'UAE'
    WHEN 'HK' THEN 'Hong Kong'       WHEN 'TW' THEN 'Taiwan'
    WHEN 'KR' THEN 'South Korea'     WHEN 'TH' THEN 'Thailand'
    WHEN 'VN' THEN 'Vietnam'
    ELSE Country
  END`

  return await queryParquet(`
    SELECT
      City as city,
      CASE WHEN Country = 'US' THEN State ELSE ${COUNTRY_CASE} END as state,
      Country as country,
      COUNT(*) as reservations,
      SUM(DiscountedPriceUSD) as total_spend,
      COUNT(DISTINCT VenueId) as venues,
      COUNT(DISTINCT EnterpriseMemberId) as members
    FROM read_parquet('${RES_FILE}')
    WHERE EnterpriseAccount = '${esc(enterprise)}'
      AND Status = 'Completed'
      AND CAST(StartTime AS DATE) >= CURRENT_DATE - INTERVAL 365 DAY
    GROUP BY City,
      CASE WHEN Country = 'US' THEN State ELSE ${COUNTRY_CASE} END,
      Country
    HAVING COUNT(*) >= 3
    ORDER BY total_spend DESC
  `)
}

async function getVenues(enterprise, city, state, country) {
  const countryCode = countryNameToCode(country)
  const locationFilter = country === 'US'
    ? `AND r.City = '${esc(city)}' AND r.State = '${esc(state)}' AND r.Country = 'US'`
    : `AND r.City = '${esc(city)}' AND r.Country = '${esc(countryCode)}'`
  return await queryParquet(`
    SELECT r.VenueId as venue_id, r.Venue as venue_name,
      v.Latitude as latitude, v.Longitude as longitude,
      COUNT(*) as reservations,
      SUM(r.DiscountedPriceUSD) as spend
    FROM read_parquet('${RES_FILE}') r
    LEFT JOIN read_parquet('${VEN_FILE}') v ON r.VenueId = v.ID
    WHERE r.EnterpriseAccount = '${esc(enterprise)}'
      ${locationFilter}
      AND r.Status = 'Completed'
      AND CAST(r.StartTime AS DATE) >= CURRENT_DATE - INTERVAL 365 DAY
      AND v.Latitude IS NOT NULL AND v.Longitude IS NOT NULL
    GROUP BY r.VenueId, r.Venue, v.Latitude, v.Longitude
    ORDER BY spend DESC
  `)
}

async function getDailyDemand(enterprise, city, state, country, lookback) {
  const countryCode = countryNameToCode(country)
  const locationFilter = country === 'US'
    ? `AND City = '${esc(city)}' AND State = '${esc(state)}' AND Country = 'US'`
    : `AND City = '${esc(city)}' AND Country = '${esc(countryCode)}'`
  return await queryParquet(`
    SELECT CAST(StartTime AS DATE)::VARCHAR as day,
      COUNT(*) as bookings,
      SUM(DiscountedPriceUSD) as spend
    FROM read_parquet('${RES_FILE}')
    WHERE EnterpriseAccount = '${esc(enterprise)}'
      ${locationFilter}
      AND Status = 'Completed'
      AND CAST(StartTime AS DATE) >= CURRENT_DATE - INTERVAL ${parseInt(lookback, 10)} DAY
    GROUP BY CAST(StartTime AS DATE)
    ORDER BY day
  `)
}

async function getPeers(city, state, country, exclude) {
  const countryCode = countryNameToCode(country)
  const locationFilter = country === 'US'
    ? `City = '${esc(city)}' AND State = '${esc(state)}' AND Country = 'US'`
    : `City = '${esc(city)}' AND Country = '${esc(countryCode)}'`
  return await queryParquet(`
    SELECT EnterpriseAccount as enterprise,
      COUNT(*) as reservations,
      COUNT(DISTINCT EnterpriseMemberId) as members
    FROM read_parquet('${RES_FILE}')
    WHERE ${locationFilter}
      AND Status = 'Completed'
      AND CAST(StartTime AS DATE) >= CURRENT_DATE - INTERVAL 365 DAY
      AND EnterpriseAccount != '${esc(exclude)}'
    GROUP BY EnterpriseAccount
    HAVING COUNT(*) >= 3
    ORDER BY reservations DESC
    LIMIT 25
  `)
}

async function getWorkType(enterprise, city, state, country) {
  const countryCode = countryNameToCode(country)
  const locationClause = country === 'US'
    ? `AND City ILIKE '${esc(city)}' AND State ILIKE '${esc(state)}' AND Country = 'US'`
    : `AND City ILIKE '${esc(city)}' AND Country = '${esc(countryCode)}'`

  const hwiRows = await queryParquet(`
    SELECT
      CASE
        WHEN Scenario ILIKE '%meeting%' OR Scenario ILIKE '%conference%'
          OR Scenario ILIKE '%training%' OR Scenario ILIKE '%event%'
          OR Scenario ILIKE '%team%' OR Scenario ILIKE '%boardroom%'
        THEN 'collaboration'
        ELSE 'concentration'
      END AS scenario_type,
      SUM(QuantityBooked) AS total_booked
    FROM read_parquet('${RES_FILE}')
    WHERE EnterpriseAccount ILIKE '%${esc(enterprise)}%'
      ${locationClause}
    GROUP BY scenario_type
  `)

  const collabSeats = Number(hwiRows.find(r => r.scenario_type === 'collaboration')?.total_booked ?? 0)
  const concSeats   = Number(hwiRows.find(r => r.scenario_type === 'concentration')?.total_booked ?? 0)
  const totalSeats  = collabSeats + concSeats
  const hwiScore    = totalSeats > 0 ? Math.round((collabSeats / totalSeats) * 100) : 0

  const cpiRows = await queryParquet(`
    WITH daily_venue AS (
      SELECT
        CAST(StartTime AS DATE) AS booking_date,
        VenueId,
        COUNT(DISTINCT EnterpriseMemberId) AS member_count
      FROM read_parquet('${RES_FILE}')
      WHERE EnterpriseAccount ILIKE '%${esc(enterprise)}%'
        ${locationClause}
      GROUP BY booking_date, VenueId
    )
    SELECT
      COUNT(*) AS venue_days,
      COUNT(CASE WHEN member_count >= 2 THEN 1 END) AS copresence_days,
      MEDIAN(member_count) AS median_group
    FROM daily_venue
  `)

  const cpiRow         = cpiRows[0] || {}
  const venueDays      = Number(cpiRow.venue_days      ?? 0)
  const copresenceDays = Number(cpiRow.copresence_days ?? 0)
  const medianGroup    = Number(cpiRow.median_group    ?? 1)
  const cpiScore       = venueDays > 0 ? Math.round((copresenceDays / venueDays) * 100) : 0

  return {
    hwi: { score: hwiScore, collaboration_seat_days: collabSeats, concentration_seat_days: concSeats },
    cpi: { score: cpiScore, copresence_event_count: copresenceDays, median_group_size: parseFloat(medianGroup.toFixed(1)), total_venue_days: venueDays },
  }
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS — allows any origin so the Next.js dev server can call in
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.method !== 'GET')     { res.writeHead(405); res.end('{"error":"Method not allowed"}'); return }

  const parsed = url.parse(req.url, true)
  const pathname = parsed.pathname
  const q = parsed.query

  try {
    if (pathname === '/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true, dataPath: DATA_PATH }))

    } else if (pathname === '/enterprises') {
      const data = await getEnterprises()
      res.writeHead(200)
      res.end(JSON.stringify(data))

    } else if (pathname === '/metros') {
      if (!q.enterprise) { res.writeHead(400); res.end('{"error":"enterprise required"}'); return }
      const data = await getMetros(q.enterprise)
      res.writeHead(200)
      res.end(JSON.stringify(data))

    } else if (pathname === '/venues') {
      if (!q.enterprise || !q.city || !q.state) { res.writeHead(400); res.end('{"error":"enterprise, city, state required"}'); return }
      const data = await getVenues(q.enterprise, q.city, q.state, q.country || 'US')
      res.writeHead(200)
      res.end(JSON.stringify(data))

    } else if (pathname === '/daily-demand') {
      if (!q.enterprise || !q.city || !q.state) { res.writeHead(400); res.end('{"error":"enterprise, city, state required"}'); return }
      const data = await getDailyDemand(q.enterprise, q.city, q.state, q.country || 'US', q.lookback || '365')
      res.writeHead(200)
      res.end(JSON.stringify(data))

    } else if (pathname === '/peers') {
      if (!q.city || !q.state || !q.exclude) { res.writeHead(400); res.end('{"error":"city, state, exclude required"}'); return }
      const data = await getPeers(q.city, q.state, q.country || 'US', q.exclude)
      res.writeHead(200)
      res.end(JSON.stringify(data))

    } else if (pathname === '/work-type') {
      if (!q.enterprise || !q.city || !q.state) { res.writeHead(400); res.end('{"error":"enterprise, city, state required"}'); return }
      const data = await getWorkType(q.enterprise, q.city, q.state, q.country || 'US')
      res.writeHead(200)
      res.end(JSON.stringify(data))

    } else {
      res.writeHead(404)
      res.end('{"error":"Not found"}')
    }
  } catch (err) {
    console.error(`[data-server] ${pathname} failed:`, err)
    res.writeHead(500)
    res.end(JSON.stringify({ error: String(err) }))
  }
})

server.listen(PORT, () => {
  console.log(`Pulse Data Server running on http://localhost:${PORT}`)
  console.log(`Data path: ${DATA_PATH}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
