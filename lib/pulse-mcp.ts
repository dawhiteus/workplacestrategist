/**
 * MCP client for the LiquidSpace Pulse Data server.
 *
 * Uses raw HTTP fetch (JSON-RPC 2.0) to call MCP tools directly —
 * no SDK transport dependency, works in any Next.js environment.
 *
 * Set PULSE_MCP_URL=https://liquidspace-mcp.ngrok.dev/mcp in .env.local.
 */

// ── Resolved file paths (populated on first call) ────────────────────────────

export let MCP_RES_FILE = ''
export let MCP_VEN_FILE = ''
export let MCP_ENT_FILE = ''

let resolvedDataDir: string | null = null
let resolvingPromise: Promise<string | null> | null = null

// ── Low-level HTTP tool call ──────────────────────────────────────────────────

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string | null> {
  const mcpUrl = process.env.PULSE_MCP_URL
  if (!mcpUrl) return null

  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    console.error(`[pulse-mcp] ${name} HTTP ${res.status}`)
    return null
  }

  const ct = res.headers.get('content-type') ?? ''
  let resultContent: Array<{ type: string; text: string }> | undefined

  if (ct.includes('text/event-stream')) {
    // Streamable HTTP with SSE response — scan for data events with a result
    const body = await res.text()
    for (const line of body.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const msg = JSON.parse(line.slice(6))
          if (msg?.result?.content) { resultContent = msg.result.content; break }
        } catch { /* skip */ }
      }
    }
  } else {
    // Plain JSON response
    const json = await res.json() as {
      result?: { content?: Array<{ type: string; text: string }> }
      error?: unknown
    }
    if (json.error) {
      console.error(`[pulse-mcp] MCP error from ${name}:`, json.error)
      return null
    }
    resultContent = json.result?.content
  }

  return resultContent?.[0]?.text ?? null
}

// ── Path resolution ───────────────────────────────────────────────────────────

async function getDataDir(): Promise<string | null> {
  if (resolvedDataDir) return resolvedDataDir
  if (resolvingPromise) return resolvingPromise

  resolvingPromise = (async (): Promise<string | null> => {
    try {
      const text = await callTool('list_parquet_files', {})
      if (!text) { resolvingPromise = null; return null }

      const parsed = JSON.parse(text) as {
        debug?: { data_directory?: string }
        files?: Array<{ name: string; path: string }>
      }
      const dir = parsed?.debug?.data_directory
      if (!dir) { resolvingPromise = null; return null }

      const files = parsed?.files ?? []
      const find = (name: string) => {
        const match = files.find(f => f.name === name)
        return match ? `${dir}/${match.path}` : `${dir}/${name}.parquet`
      }

      MCP_RES_FILE = find('HourlyDailyReservations')
      MCP_VEN_FILE = find('Venues')
      MCP_ENT_FILE = find('EnterpriseEngagementSummary')
      resolvedDataDir = dir
      console.log(`[pulse-mcp] Connected. Data dir: ${dir}`)
      return dir
    } catch (err) {
      console.error('[pulse-mcp] Path resolution failed:', err)
      resolvingPromise = null
      return null
    }
  })()

  return resolvingPromise
}

// ── Public query helper ───────────────────────────────────────────────────────

/**
 * Execute a DuckDB SQL query on the remote MCP Parquet server.
 *
 * Returns:
 *   - T[]   — query succeeded (may be an empty array)
 *   - null  — MCP not configured, or the call failed
 *
 * Callers must check `!== null` (not just truthiness) so empty results
 * don't fall through to seed JSON.
 */
export async function mcpSqlQuery<T = Record<string, unknown>>(
  sql: string,
  limit = 10000,
): Promise<T[] | null> {
  try {
    const dir = await getDataDir()
    if (!dir) return null

    const text = await callTool('sql_query_parquet', { sql, limit })
    if (!text) return null

    const parsed = JSON.parse(text) as unknown

    // FastMCP returns { data: [...], rows_returned: N, ... }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      Array.isArray((parsed as { data: unknown }).data)
    ) {
      return (parsed as { data: T[] }).data
    }

    // Bare array fallback
    if (Array.isArray(parsed)) return parsed as T[]

    return null
  } catch (err) {
    console.error('[pulse-mcp] sql_query_parquet failed:', err)
    return null
  }
}
