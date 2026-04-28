import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { CostDistribution } from '@/lib/types'

export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), 'data')

// Fallback national median when no metro-specific data is available
const NATIONAL_FALLBACK: CostDistribution = {
  city: '', state: '', listing_count: 0,
  min: 150, p10: 200, p25: 280, median: 420, p75: 650, p90: 900, max: 1200, avg: 450, std: 240,
}

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') || ''
  const state = req.nextUrl.searchParams.get('state') || ''

  try {
    const filePath = path.join(DATA_DIR, 'cost-per-seat-distribution.json')
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ distribution: NATIONAL_FALLBACK })
    }
    const all = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, CostDistribution>

    // Exact match first
    const key = `${city}, ${state}`
    if (all[key]) return NextResponse.json({ distribution: all[key] })

    // State fallback — aggregate listings in same state
    const stateRows = Object.values(all).filter(d => d.state === state)
    if (stateRows.length > 0) {
      const medians = stateRows.map(d => d.median).sort((a, b) => a - b)
      const mid = Math.floor(medians.length / 2)
      const stateMedian = medians[mid]
      return NextResponse.json({
        distribution: {
          city, state,
          listing_count: stateRows.reduce((s, d) => s + d.listing_count, 0),
          min: Math.min(...stateRows.map(d => d.min)),
          p10: stateRows.map(d => d.p10).sort((a, b) => a - b)[Math.floor(stateRows.length * 0.1)] ?? stateMedian * 0.55,
          p25: stateRows.map(d => d.p25).sort((a, b) => a - b)[Math.floor(stateRows.length * 0.25)] ?? stateMedian * 0.7,
          median: stateMedian,
          p75: stateRows.map(d => d.p75).sort((a, b) => a - b)[Math.floor(stateRows.length * 0.75)] ?? stateMedian * 1.5,
          p90: stateRows.map(d => d.p90).sort((a, b) => a - b)[Math.floor(stateRows.length * 0.9)] ?? stateMedian * 2,
          max: Math.max(...stateRows.map(d => d.max)),
          avg: Math.round(stateRows.reduce((s, d) => s + d.avg, 0) / stateRows.length),
          std: Math.round(stateRows.reduce((s, d) => s + d.std, 0) / stateRows.length),
        } as CostDistribution,
      })
    }

    return NextResponse.json({ distribution: NATIONAL_FALLBACK })
  } catch {
    return NextResponse.json({ distribution: NATIONAL_FALLBACK })
  }
}
