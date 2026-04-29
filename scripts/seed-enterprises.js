#!/usr/bin/env node
/**
 * seed-enterprises.js
 *
 * Regenerates all enterprise seed data (metros + venues) from the Parquet data
 * source. Fully international — no Country = 'US' filter. Writes files to
 * ./data/ in the same format the app reads.
 *
 * Usage:
 *   PULSE_DATA_PATH=/path/to/parquet-dir node scripts/seed-enterprises.js
 *
 * Or if PULSE_DATA_PATH is already in .env.local:
 *   node -e "require('dotenv').config({ path: '.env.local' })" scripts/seed-enterprises.js
 *   # or simply:
 *   node scripts/seed-enterprises.js   (reads .env.local automatically)
 *
 * Options (set as env vars):
 *   DRY_RUN=1              Print what would be written without touching disk
 *   ENTERPRISE=Cloudflare  Seed only one enterprise (for testing)
 *   MIN_RESERVATIONS=3     Minimum reservations per metro (default: 3)
 *   SKIP_VENUES=1          Skip venue file generation (metros only)
 */

'use strict'

const path = require('path')
const fs   = require('fs')

// ── Load .env.local automatically ────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  })
}

const PULSE_DIR     = process.env.PULSE_DATA_PATH
const DATA_DIR      = path.join(process.cwd(), 'data')
const DRY_RUN       = process.env.DRY_RUN === '1'
const ONLY_ENT      = process.env.ENTERPRISE || null
const MIN_RSVP      = parseInt(process.env.MIN_RESERVATIONS || '3', 10)
const SKIP_VENUES   = process.env.SKIP_VENUES === '1'

// ── Validate ──────────────────────────────────────────────────────────────────
if (!PULSE_DIR) {
  console.error('\n❌  PULSE_DATA_PATH is not set.')
  console.error('    Set it in .env.local or pass it as an environment variable.\n')
  process.exit(1)
}

const HDR_PATH    = path.join(PULSE_DIR, 'HourlyDailyReservations.parquet')
const VENUES_PATH = path.join(PULSE_DIR, 'Venues.parquet')
const EES_PATH    = path.join(PULSE_DIR, 'EnterpriseEngagementSummary.parquet')

if (!fs.existsSync(HDR_PATH)) {
  console.error(`\n❌  Cannot find HourlyDailyReservations.parquet at:\n    ${HDR_PATH}\n`)
  process.exit(1)
}
if (!fs.existsSync(VENUES_PATH)) {
  console.error(`\n❌  Cannot find Venues.parquet at:\n    ${VENUES_PATH}\n`)
  process.exit(1)
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ── Country ISO code → display name mapping ──────────────────────────────────
// Full names are used as the `state` field for international metros in URLs.
// This avoids the CA (Canada) vs CA (California) collision.
const COUNTRY_NAMES = {
  NL: 'Netherlands',   CA: 'Canada',         MY: 'Malaysia',
  CH: 'Switzerland',   DE: 'Germany',        GB: 'United Kingdom',
  UK: 'United Kingdom',AU: 'Australia',      FR: 'France',
  SG: 'Singapore',     JP: 'Japan',          IE: 'Ireland',
  ES: 'Spain',         SE: 'Sweden',         BE: 'Belgium',
  SI: 'Slovenia',      IN: 'India',          MX: 'Mexico',
  BR: 'Brazil',        ZA: 'South Africa',   PH: 'Philippines',
  ID: 'Indonesia',     PL: 'Poland',         CZ: 'Czech Republic',
  RO: 'Romania',       HU: 'Hungary',        PT: 'Portugal',
  NO: 'Norway',        DK: 'Denmark',        FI: 'Finland',
  AT: 'Austria',       NZ: 'New Zealand',    IL: 'Israel',
  AE: 'UAE',           HK: 'Hong Kong',      TW: 'Taiwan',
  KR: 'South Korea',   TH: 'Thailand',       VN: 'Vietnam',
  CN: 'China',         MO: 'Macau',          PK: 'Pakistan',
  BD: 'Bangladesh',    LK: 'Sri Lanka',      NG: 'Nigeria',
  KE: 'Kenya',         GH: 'Ghana',          EG: 'Egypt',
  AR: 'Argentina',     CL: 'Chile',          CO: 'Colombia',
  PE: 'Peru',          UY: 'Uruguay',        EC: 'Ecuador',
  CR: 'Costa Rica',    PA: 'Panama',         GT: 'Guatemala',
  CY: 'Cyprus',        MT: 'Malta',          HR: 'Croatia',
  RS: 'Serbia',        SK: 'Slovakia',       LT: 'Lithuania',
  LV: 'Latvia',        EE: 'Estonia',        BG: 'Bulgaria',
  GR: 'Greece',        TR: 'Turkey',         UA: 'Ukraine',
  RU: 'Russia',        SA: 'Saudi Arabia',   QA: 'Qatar',
  KW: 'Kuwait',        BH: 'Bahrain',        OM: 'Oman',
}

function countryName(code) {
  return COUNTRY_NAMES[code] || code
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip special chars
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse double hyphens
    .trim()
}

function metroKey(city, stateOrCountry) {
  return `${city.toLowerCase().replace(/\s+/g, '-')}-${stateOrCountry.toLowerCase().replace(/\s+/g, '-')}`
}

function esc(s) {
  return String(s).replace(/'/g, "''")
}

function writeJson(filePath, data) {
  if (DRY_RUN) {
    console.log(`   [DRY] Would write ${filePath}`)
    return
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// ── DuckDB ────────────────────────────────────────────────────────────────────
// Re-use a single in-memory DB for the entire run (significant perf gain).
let _db = null
function getDb() {
  if (!_db) {
    const duckdb = require('duckdb')
    _db = new duckdb.Database(':memory:')
  }
  return _db
}

function query(sql) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

// ── SQL building ──────────────────────────────────────────────────────────────
// Inline CASE that converts any ISO country code → full name.
// Used in SELECT to populate the `state` column for international records.
function countryNameCase(col = 'Country') {
  const branches = Object.entries(COUNTRY_NAMES)
    .filter(([code]) => code !== 'UK')  // GB is canonical
    .map(([code, name]) => `WHEN '${code}' THEN '${name}'`)
    .join('\n              ')
  return `CASE ${col}\n              ${branches}\n              ELSE ${col}\n            END`
}

// ── Core queries ──────────────────────────────────────────────────────────────

async function getAllEnterprises() {
  // Prefer EnterpriseEngagementSummary if available (has Status field)
  if (fs.existsSync(EES_PATH)) {
    try {
      const rows = await query(`
        SELECT AccountName as enterprise
        FROM read_parquet('${esc(EES_PATH)}')
        WHERE Status IN ('Launched', 'Active', 'Limited')
        ORDER BY AccountName
      `)
      if (rows.length > 0) return rows.map(r => r.enterprise)
    } catch (e) {
      console.warn('  ⚠  EnterpriseEngagementSummary query failed, falling back to reservations data')
    }
  }

  // Fallback: derive from reservations (any enterprise with ≥ 10 reservations)
  const rows = await query(`
    SELECT EnterpriseAccount as enterprise
    FROM read_parquet('${esc(HDR_PATH)}')
    WHERE Status IN ('Completed', 'CancellationPolicy')
    GROUP BY EnterpriseAccount
    HAVING COUNT(*) >= 10
    ORDER BY COUNT(*) DESC
  `)
  return rows.map(r => r.enterprise)
}

async function getEnterpriseMetos(enterprise) {
  // Returns all metros globally for this enterprise, mapped to display-safe state values.
  return query(`
    SELECT
      City as city,
      CASE WHEN Country = 'US'
        THEN State
        ELSE ${countryNameCase()}
      END as state,
      Country as country_code,
      COUNT(*) as reservations,
      ROUND(SUM(DiscountedPriceUSD), 2) as total_spend,
      COUNT(DISTINCT VenueId) as venues,
      COUNT(DISTINCT EnterpriseMemberId) as members
    FROM read_parquet('${esc(HDR_PATH)}')
    WHERE EnterpriseAccount = '${esc(enterprise)}'
      AND Status IN ('Completed', 'CancellationPolicy')
      AND City IS NOT NULL AND City != ''
    GROUP BY City,
      CASE WHEN Country = 'US' THEN State ELSE ${countryNameCase()} END,
      Country
    HAVING COUNT(*) >= ${MIN_RSVP}
    ORDER BY total_spend DESC
  `)
}

async function getEnterpriseVenues(enterprise) {
  // Single query for ALL venues across ALL metros for this enterprise.
  // Joined with Venues.parquet for lat/lng. Returns null lat/lng rows are excluded.
  return query(`
    SELECT
      r.City as city,
      CASE WHEN r.Country = 'US'
        THEN r.State
        ELSE ${countryNameCase('r.Country')}
      END as state,
      r.Country as country_code,
      r.VenueId as venue_id,
      r.Venue as venue_name,
      v.Latitude as latitude,
      v.Longitude as longitude,
      COUNT(*) as reservations,
      ROUND(SUM(r.DiscountedPriceUSD), 2) as spend
    FROM read_parquet('${esc(HDR_PATH)}') r
    LEFT JOIN read_parquet('${esc(VENUES_PATH)}') v ON r.VenueId = v.ID
    WHERE r.EnterpriseAccount = '${esc(enterprise)}'
      AND r.Status IN ('Completed', 'CancellationPolicy')
      AND r.City IS NOT NULL AND r.City != ''
      AND v.Latitude IS NOT NULL AND v.Longitude IS NOT NULL
    GROUP BY r.City, CASE WHEN r.Country = 'US' THEN r.State ELSE ${countryNameCase('r.Country')} END,
      r.Country, r.VenueId, r.Venue, v.Latitude, v.Longitude
    ORDER BY spend DESC
  `)
}

// ── Per-enterprise seeding ────────────────────────────────────────────────────

async function seedEnterprise(enterprise) {
  const entSlug = slug(enterprise)

  // ── 1. Metros ──────────────────────────────────────────────────────────────
  let metros
  try {
    metros = await getEnterpriseMetos(enterprise)
  } catch (err) {
    console.error(`   ❌  metros query failed: ${err.message}`)
    return { enterprise, metros: 0, venues: 0, error: true }
  }

  if (metros.length === 0) {
    console.log(`   ⚪  no qualifying metros — skipping`)
    return { enterprise, metros: 0, venues: 0 }
  }

  // Normalise: add friendly country field, strip raw country_code
  const metroRecords = metros.map(m => {
    const isUS = m.country_code === 'US'
    return {
      city: m.city,
      state: m.state,
      country: isUS ? 'US' : countryName(m.country_code),
      reservations: Number(m.reservations),
      total_spend: Number(m.total_spend),
      venues: Number(m.venues),
      members: Number(m.members),
    }
  })

  const metrosFile = path.join(DATA_DIR, `${entSlug}-metros.json`)
  writeJson(metrosFile, metroRecords)

  // ── 2. Venues (skip if flag set) ───────────────────────────────────────────
  let venueCount = 0
  if (!SKIP_VENUES) {
    let allVenues
    try {
      allVenues = await getEnterpriseVenues(enterprise)
    } catch (err) {
      console.error(`   ❌  venues query failed: ${err.message}`)
      // Metros were written — don't abort entirely
      return { enterprise, metros: metroRecords.length, venues: 0, venueError: true }
    }

    // Group by metro key
    const byMetro = {}
    for (const v of allVenues) {
      const key = metroKey(v.city, v.state)
      if (!byMetro[key]) byMetro[key] = { city: v.city, state: v.state, venues: [] }
      byMetro[key].venues.push({
        venue_id: String(v.venue_id),
        venue_name: v.venue_name,
        latitude:  Number(v.latitude),
        longitude: Number(v.longitude),
        reservations: Number(v.reservations),
        spend: Number(v.spend),
      })
    }

    // Write one file per metro
    for (const [key, { venues }] of Object.entries(byMetro)) {
      const venuePath = path.join(DATA_DIR, `${entSlug}-venues-${key}.json`)
      writeJson(venuePath, venues)
      venueCount++
    }
  }

  return { enterprise, metros: metroRecords.length, venues: venueCount }
}

// ── Enterprise list ───────────────────────────────────────────────────────────

async function updateEnterpriseList(enterprises) {
  const listPath = path.join(DATA_DIR, 'enterprises-list.json')
  const sorted = [...enterprises].sort((a, b) => a.localeCompare(b))
  writeJson(listPath, sorted)
  console.log(`\n📋  enterprises-list.json updated (${sorted.length} entries)`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Workplace Strategist — Enterprise Seed Data Generation')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Source : ${PULSE_DIR}`)
  console.log(`  Output : ${DATA_DIR}`)
  console.log(`  Mode   : ${DRY_RUN ? 'DRY RUN (no files written)' : 'LIVE'}`)
  if (ONLY_ENT) console.log(`  Filter : ${ONLY_ENT} only`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Discover enterprises
  process.stdout.write('🔍  Discovering enterprises…')
  let enterprises
  try {
    enterprises = await getAllEnterprises()
  } catch (err) {
    console.error(`\n❌  Failed to discover enterprises: ${err.message}`)
    process.exit(1)
  }

  if (ONLY_ENT) {
    enterprises = enterprises.filter(e => e.toLowerCase() === ONLY_ENT.toLowerCase())
    if (enterprises.length === 0) {
      console.error(`\n❌  Enterprise "${ONLY_ENT}" not found in Parquet data.\n`)
      process.exit(1)
    }
  }

  console.log(` found ${enterprises.length}\n`)

  // Seed each enterprise
  const results = []
  let doneCount = 0
  const pad = String(enterprises.length).length

  for (const enterprise of enterprises) {
    doneCount++
    const prefix = `[${String(doneCount).padStart(pad)}/${enterprises.length}]`
    process.stdout.write(`${prefix} ${enterprise.padEnd(45)} `)

    const result = await seedEnterprise(enterprise)
    results.push(result)

    if (result.error) {
      console.log('❌  error (see above)')
    } else if (result.metros === 0) {
      console.log('⚪  skipped (no data)')
    } else {
      const intl = results[results.length - 1]
      // Count how many metros are international
      const metrosFile = path.join(DATA_DIR, `${slug(enterprise)}-metros.json`)
      let intlCount = 0
      if (!DRY_RUN && fs.existsSync(metrosFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(metrosFile, 'utf-8'))
          intlCount = data.filter(m => m.country && m.country !== 'US').length
        } catch {}
      }
      const intlLabel = intlCount > 0 ? ` (🌍 ${intlCount} intl)` : ''
      console.log(`✅  ${result.metros} metros · ${result.venues} venue files${intlLabel}`)
    }
  }

  // Update enterprise list (unless filtering to one)
  if (!ONLY_ENT) {
    const activeEnterprises = results
      .filter(r => r.metros > 0)
      .map(r => r.enterprise)
    await updateEnterpriseList(activeEnterprises)
  }

  // Summary
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
  const ok      = results.filter(r => !r.error && r.metros > 0).length
  const skipped = results.filter(r => !r.error && r.metros === 0).length
  const errors  = results.filter(r => r.error).length
  const totalMetros  = results.reduce((s, r) => s + (r.metros  || 0), 0)
  const totalVenues  = results.reduce((s, r) => s + (r.venues  || 0), 0)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Done in ${elapsed}s`)
  console.log(`  ✅  ${ok} enterprises seeded`)
  console.log(`  ⚪  ${skipped} skipped (no qualifying data)`)
  if (errors) console.log(`  ❌  ${errors} errors`)
  console.log(`  📍  ${totalMetros} total metro records`)
  console.log(`  🏢  ${totalVenues} total venue files`)
  if (DRY_RUN) console.log('\n  ℹ️   DRY RUN — nothing was written to disk')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  getDb().close()
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err)
  process.exit(1)
})
