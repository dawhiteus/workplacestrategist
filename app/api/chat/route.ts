import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getMetroPortfolio, getMetroVenues, getDailyDemand, getPeerBenchmarks } from '@/lib/pulse'
import { buildHVSReasoning } from '@/lib/hvs'
import type { StressTestParams } from '@/lib/types'

export const dynamic = 'force-dynamic'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
})

const PULSE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_portfolio',
    description: 'Get the full metro portfolio for an enterprise account — all markets, spend, reservations, venue count, member count.',
    input_schema: {
      type: 'object',
      properties: {
        enterprise: { type: 'string', description: 'Enterprise account name', default: 'Allstate' },
      },
      required: [],
    },
  },
  {
    name: 'get_metro_analysis',
    description: 'Get the full Hub Viability Score analysis for a specific metro — HVS composite, DVI/DCI/ERI sub-scores, recommendation, venue locations, daily demand, economic ROI, peer benchmarks, and threshold alerts.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. "Atlanta"' },
        state: { type: 'string', description: 'State abbreviation, e.g. "GA"' },
        enterprise: { type: 'string', default: 'Allstate' },
        hub_cost_monthly: { type: 'number', description: 'Monthly hub cost to model, default 8000', default: 8000 },
        induced_demand_uplift_pct: { type: 'number', description: 'Induced demand uplift %, default 25', default: 25 },
        commute_radius_miles: { type: 'number', description: 'Commute radius in miles, default 30', default: 30 },
      },
      required: ['city', 'state'],
    },
  },
  {
    name: 'compare_metros',
    description: 'Compare HVS scores and economics across multiple metros side by side.',
    input_schema: {
      type: 'object',
      properties: {
        metros: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['city', 'state'],
          },
          description: 'List of metros to compare',
        },
        enterprise: { type: 'string', default: 'Allstate' },
      },
      required: ['metros'],
    },
  },
]

async function getMetroAnalysis(enterprise: string, city: string, state: string, hubCost: number, uplift: number, radius: number) {
  const [venues, dailyDemand, portfolio] = await Promise.all([
    getMetroVenues(enterprise, city, state),
    getDailyDemand(enterprise, city, state, 365),
    getMetroPortfolio(enterprise),
  ])
  const metro = portfolio.find(m => m.city === city && m.state === state)
  if (!metro) return { error: `Metro not found: ${city}, ${state}` }
  const stressParams: StressTestParams = { hubCostMonthly: hubCost, inducedDemandUpliftPct: uplift, commuteRadiusMiles: radius }
  const hvs = buildHVSReasoning(metro, venues, dailyDemand, stressParams)

  // Build monthly demand buckets so Claude can answer time-specific questions
  const monthlyDemand: Record<string, { bookings: number; spend: number }> = {}
  for (const d of dailyDemand) {
    const month = d.day.slice(0, 7) // "YYYY-MM"
    if (!monthlyDemand[month]) monthlyDemand[month] = { bookings: 0, spend: 0 }
    monthlyDemand[month].bookings += d.bookings
    monthlyDemand[month].spend += d.spend
  }
  const monthlyBreakdown = Object.entries(monthlyDemand)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, bookings: v.bookings, spend: Math.round(v.spend) }))

  const totalBookings = dailyDemand.reduce((s, d) => s + d.bookings, 0)

  return { metro, hvs, venue_count: venues.length, total_bookings: totalBookings, monthly_breakdown: monthlyBreakdown }
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'get_portfolio') {
    const enterprise = (input.enterprise as string) || 'Allstate'
    const metros = await getMetroPortfolio(enterprise)
    return JSON.stringify({ enterprise, metros, total_markets: metros.length })
  }

  if (name === 'get_metro_analysis') {
    const { city, state, enterprise = 'Allstate', hub_cost_monthly = 8000, induced_demand_uplift_pct = 25, commute_radius_miles = 30 } = input as {
      city: string; state: string; enterprise?: string
      hub_cost_monthly?: number; induced_demand_uplift_pct?: number; commute_radius_miles?: number
    }
    const result = await getMetroAnalysis(String(enterprise), city, state, Number(hub_cost_monthly), Number(induced_demand_uplift_pct), Number(commute_radius_miles))
    return JSON.stringify(result)
  }

  if (name === 'compare_metros') {
    const metros = input.metros as Array<{ city: string; state: string }>
    const enterprise = (input.enterprise as string) || 'Allstate'
    const results = await Promise.all(
      metros.map(async ({ city, state }) => {
        const result = await getMetroAnalysis(enterprise, city, state, 8000, 25, 30)
        if ('error' in result) return { city, state, error: result.error }
        return {
          city, state,
          hvs: result.hvs?.hvs_composite,
          recommendation: result.hvs?.recommendation,
          spend: result.metro?.total_spend,
          reservations: result.metro?.reservations,
          net_saving: result.hvs?.economic_roi?.net_saving,
        }
      })
    )
    return JSON.stringify({ comparison: results })
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

function buildSystemPrompt(portfolioContext: string): string {
  return `You are the LiquidSpace Workplace Strategist AI — an expert workplace analyst embedded in the Hub Locator tool. You help enterprise real estate and HR leaders make data-driven decisions about where to open dedicated office hubs.

You have access to live LiquidSpace booking data for Allstate via tool calls. Always use tools to fetch real data before answering quantitative questions.

Current portfolio context (pre-loaded):
${portfolioContext}

Data notes:
- All booking data comes from LiquidSpace reservation records. The \`reservations\` field in portfolio data is the lifetime total — NOT scoped to any specific time window.
- For time-specific questions ("last month", "Q3", "this year"), always call \`get_metro_analysis\` and use the \`monthly_breakdown\` array it returns to find the relevant period. Never report the lifetime total as if it were a monthly or annual figure.
- The most recent month in \`monthly_breakdown\` represents the latest available data. Clearly state which month you are referencing.

Guidelines:
- Be concise and direct. Lead with the key finding, then support with data.
- When answering hub viability questions, always cite the HVS score, DVI, DCI, and ERI sub-scores.
- When comparing markets, use the compare_metros tool.
- Format responses for a business audience — no technical jargon about scoring models.
- Whenever you surface a key finding or recommendation, end your response with a JSON block like:
  <insight>{"type":"finding","title":"Short title","body":"1-2 sentence summary"}</insight>
  This gets pinned to the insights panel.
- Keep responses focused and scannable. Use short paragraphs or bullet points.
- The user is a senior workplace strategist. They want clarity and actionability, not hedging.`
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  // Pre-load portfolio context
  let portfolioContext = ''
  try {
    const metros = await getMetroPortfolio('Allstate')
    const top5 = metros.slice(0, 5).map(m => `${m.city}, ${m.state}: $${Math.round(m.total_spend / 1000)}K spend, ${m.reservations} reservations, ${m.venues} venues`).join('\n')
    portfolioContext = `Allstate has ${metros.length} active markets. Top 5 by spend:\n${top5}`
  } catch {}

  const systemPrompt = buildSystemPrompt(portfolioContext)

  // Convert messages to Anthropic format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let currentMessages = [...anthropicMessages]
        let iterating = true

        while (iterating) {
          // Retry up to 3x on rate limit with backoff
          let response
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              response = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 2048,
                system: systemPrompt,
                tools: PULSE_TOOLS,
                messages: currentMessages,
              })
              break
            } catch (err: unknown) {
              const apiErr = err as { status?: number }
              if (apiErr?.status === 429 && attempt < 2) {
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
                continue
              }
              throw err
            }
          }
          if (!response) throw new Error('No response from API')

          if (response.stop_reason === 'tool_use') {
            // Process tool calls
            const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const toolUse of toolUseBlocks) {
              send({ type: 'tool_call', tool: toolUse.name })
              const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result })

              // Emit structured data events so the middle pane can render visuals
              if (toolUse.name === 'get_metro_analysis' || toolUse.name === 'compare_metros') {
                try {
                  const parsed = JSON.parse(result)
                  if (!parsed.error) {
                    send({ type: 'canvas_data', tool: toolUse.name, data: parsed })
                  }
                } catch {}
              }
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResults },
            ]
          } else {
            // Final text response — stream it
            const textBlock = response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined
            const fullText = textBlock?.text || ''

            // Stream word by word for effect
            const words = fullText.split(' ')
            let accumulated = ''
            for (const word of words) {
              accumulated += (accumulated ? ' ' : '') + word
              send({ type: 'delta', text: accumulated })
              await new Promise(r => setTimeout(r, 12))
            }

            // Extract insight tags
            const insightMatches = fullText.matchAll(/<insight>([\s\S]*?)<\/insight>/g)
            for (const match of insightMatches) {
              try {
                const insight = JSON.parse(match[1])
                send({ type: 'insight', insight })
              } catch {}
            }

            // Strip insight tags from displayed text
            const cleanText = fullText.replace(/<insight>.*?<\/insight>/gs, '').trim()
            send({ type: 'done', text: cleanText })
            iterating = false
          }
        }
      } catch (err) {
        send({ type: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
