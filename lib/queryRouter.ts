import type { MetroSummary } from './types'
import { formatCurrency } from './utils'

export type RouterAction =
  | { type: 'answer'; text: string }
  | { type: 'none' }

// City aliases — matched with word boundaries to avoid substring false-positives
const ALIASES: Record<string, string> = {
  'nyc':           'New York',
  'new york city': 'New York',
  'ny':            'New York',
  'la':            'Los Angeles',
  'dc':            'Washington',
  'washington dc': 'Washington',
  'philly':        'Philadelphia',
  'atl':           'Atlanta',
  'hou':           'Houston',
  'col':           'Columbia',
  'chi':           'Chicago',
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function matchesAlias(text: string, alias: string): boolean {
  return new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`).test(text)
}

function findMetro(text: string, metros: MetroSummary[]): MetroSummary | null {
  const lower = normalize(text)

  for (const [alias, cityName] of Object.entries(ALIASES)) {
    if (matchesAlias(lower, alias)) {
      const found = metros.find(m => normalize(m.city) === normalize(cityName))
      if (found) return found
    }
  }

  const sorted = [...metros].sort((a, b) => b.city.length - a.city.length)
  for (const m of sorted) {
    if (matchesAlias(lower, normalize(m.city))) return m
  }

  return null
}

function findMultipleMetros(text: string, metros: MetroSummary[]): MetroSummary[] {
  const lower = normalize(text)
  const results: MetroSummary[] = []
  const used = new Set<string>()

  for (const [alias, cityName] of Object.entries(ALIASES)) {
    if (matchesAlias(lower, alias)) {
      const found = metros.find(m => normalize(m.city) === normalize(cityName))
      if (found && !used.has(found.city)) { results.push(found); used.add(found.city) }
    }
  }

  const sorted = [...metros].sort((a, b) => b.city.length - a.city.length)
  for (const m of sorted) {
    if (!used.has(m.city) && matchesAlias(lower, normalize(m.city))) {
      results.push(m); used.add(m.city)
    }
  }

  return results
}

function metroLine(m: MetroSummary): string {
  return `${m.city}, ${m.state} — ${formatCurrency(m.total_spend, true)}/yr · ${m.reservations} bookings · ${m.venues} venues`
}

export function routeQuery(query: string, metros: MetroSummary[], enterprise = 'Allstate'): RouterAction {
  const lower = normalize(query)

  // --- Guard: query mentions a different enterprise by name ---
  // Simple heuristic: if the query contains a recognisable company name that
  // doesn't match the active enterprise, decline rather than silently answer
  // with the wrong company's data.
  const knownEnterprises = [
    'at&t', 'att', 't-mobile', 'tmobile', 'verizon', 'airbnb', 'salesforce',
    'gitlab', 'spotify', 'allstate', 'amazon', 'comcast', 'gartner', 'etsy',
    'trinet', 'zscaler', 'cloudflare', 'ibotta', 'instacart', 'moderna',
    'roche', 'genentech', 'broadridge', 'cvs', 'smartsheet', 'wrike',
  ]
  const enterpriseLower = normalize(enterprise)
  const mentionedOther = knownEnterprises.find(e => {
    if (e === enterpriseLower || e === normalize(enterprise)) return false
    return new RegExp(`\\b${e.replace(/[^a-z0-9]/g, '.?')}\\b`).test(lower)
  })
  if (mentionedOther) {
    return {
      type: 'answer',
      text: `You're currently viewing **${enterprise}** data. I can only answer questions scoped to the active enterprise.\n\nTo look up ${mentionedOther.toUpperCase()} data, switch the enterprise using the dropdown in the context bar.`,
    }
  }

  // --- Compare ---
  if (/\b(compare|vs|versus|side by side|next to)\b/.test(lower)) {
    const found = findMultipleMetros(query, metros)
    if (found.length >= 2) {
      const lines = found.map(m => `• ${metroLine(m)}`).join('\n')
      return {
        type: 'answer',
        text: `**${enterprise}** — market comparison:\n\n${lines}\n\nFor the full side-by-side HVS analysis, use the Market Comparison card on the main page.`,
      }
    }
  }

  // --- Ranking / portfolio ---
  if (/\b(rank|top market|highest|best market|all market|portfolio|every market|which market)\b/.test(lower)) {
    const byConcentration = /\b(concentrat|density|cluster|pattern|per venue)\b/.test(lower)
    const sorted = byConcentration
      ? [...metros].filter(m => m.venues > 0).sort((a, b) => (b.reservations / b.venues) - (a.reservations / a.venues))
      : [...metros].sort((a, b) => b.total_spend - a.total_spend)
    const top5 = sorted.slice(0, 5)
    const label = byConcentration ? 'demand concentration (bookings/venue)' : 'total spend'
    const lines = top5.map((m, i) => {
      const val = byConcentration
        ? `${(m.reservations / m.venues).toFixed(1)} bkgs/venue`
        : formatCurrency(m.total_spend, true)
      return `${i + 1}. ${m.city}, ${m.state} — ${val}`
    }).join('\n')
    return {
      type: 'answer',
      text: `**${enterprise}** — top 5 markets by ${label}:\n\n${lines}\n\n${metros.length - 5} more markets in the portfolio. Use Portfolio Ranking for the full list.`,
    }
  }

  // --- Concentration patterns ---
  if (/\b(concentrat|clustering|where is demand|demand pattern)\b/.test(lower)) {
    const top3 = [...metros]
      .filter(m => m.venues > 0)
      .sort((a, b) => (b.reservations / b.venues) - (a.reservations / a.venues))
      .slice(0, 3)
    const lines = top3.map(m => `• ${m.city}, ${m.state} — ${(m.reservations / m.venues).toFixed(1)} bookings/venue`).join('\n')
    return {
      type: 'answer',
      text: `**${enterprise}** — most concentrated markets (bookings per venue):\n\n${lines}\n\nHigh concentration = demand clustered around a few locations = stronger hub signal.`,
    }
  }

  // --- Single market ---
  const metro = findMetro(query, metros)
  if (metro) {
    const spendPerBooking = metro.reservations > 0 ? Math.round(metro.total_spend / metro.reservations) : 0
    return {
      type: 'answer',
      text: `**${enterprise}** · ${metro.city}, ${metro.state}:\n\n• Reservations: ${metro.reservations}\n• Annual spend: ${formatCurrency(metro.total_spend, true)}\n• Avg per booking: $${spendPerBooking}\n• Active venues: ${metro.venues}\n• Members: ${metro.members}\n\nFor hub viability scoring, load the full analysis from the market dropdown.`,
    }
  }

  return { type: 'none' }
}
