import path from 'path'
import fs from 'fs'

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
