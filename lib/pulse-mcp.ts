/**
 * MCP client for the LiquidSpace Pulse Data server.
 *
 * Set PULSE_MCP_URL=https://liquidspace-mcp.ngrok.dev/mcp in .env.local to activate.
 * When set, all pulse.ts data functions query the remote Parquet files via MCP
 * instead of requiring a local DuckDB / PULSE_DATA_PATH installation.
 *
 * File paths are resolved dynamically at connect-time via list_parquet_files,
 * so the app doesn't depend on where the MCP server stores its data.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// ── Resolved file paths (populated after first connect) ──────────────────────

export let MCP_RES_FILE = ''   // HourlyDailyReservations.parquet
export let MCP_VEN_FILE = ''   // Venues.parquet
export let MCP_ENT_FILE = ''   // EnterpriseEngagementSummary.parquet

// ── Singleton client ──────────────────────────────────────────────────────────

let mcpClient: Client | null = null
let connectPromise: Promise<void> | null = null

async function getMcpClient(): Promise<Client | null> {
  const mcpUrl = process.env.PULSE_MCP_URL
  if (!mcpUrl) return null

  // Already connected and paths resolved
  if (mcpClient) return mcpClient

  // Connection in progress — wait for it
  if (!connectPromise) {
    connectPromise = (async () => {
      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl))
      const c = new Client(
        { name: 'workplace-strategist', version: '1.0.0' },
        { capabilities: {} },
      )
      await c.connect(transport)

      // ── Resolve Parquet file paths from the server ──────────────────────────
      // list_parquet_files returns { debug: { data_directory: '/abs/path' }, files: [...] }
      // We build absolute paths so sql_query_parquet can find the files regardless
      // of what working directory the MCP server's DuckDB instance uses.
      try {
        const listResult = await c.callTool({ name: 'list_parquet_files', arguments: {} })
        const content = (listResult.content as Array<{ type: string; text: string }>)[0]
        if (content?.type === 'text') {
          const parsed = JSON.parse(content.text) as {
            debug?: { data_directory?: string }
            files?: Array<{ name: string; path: string }>
          }
          const dataDir = parsed?.debug?.data_directory
          const files   = parsed?.files ?? []

          if (dataDir) {
            const find = (name: string) => {
              const match = files.find(f => f.name === name)
              return match ? `${dataDir}/${match.path}` : `${dataDir}/${name}.parquet`
            }
            MCP_RES_FILE = find('HourlyDailyReservations')
            MCP_VEN_FILE = find('Venues')
            MCP_ENT_FILE = find('EnterpriseEngagementSummary')
            console.log(`[pulse-mcp] Connected. Data dir: ${dataDir}`)
          }
        }
      } catch (pathErr) {
        console.warn('[pulse-mcp] Could not resolve file paths via list_parquet_files:', pathErr)
      }

      mcpClient = c
    })().catch(err => {
      console.error('[pulse-mcp] Connection failed:', err)
      connectPromise = null
      throw err
    })
  }

  await connectPromise
  return mcpClient
}

// ── Query helper ──────────────────────────────────────────────────────────────

/**
 * Execute a DuckDB SQL query on the remote MCP Parquet server.
 *
 * Returns:
 *   - T[]   — query succeeded (may be empty array if no rows match)
 *   - null  — MCP not configured, paths not resolved, or query failed
 *
 * Callers should check `!== null` (not just truthiness) so empty results
 * are handled correctly and don't fall through to seed JSON.
 */
export async function mcpSqlQuery<T = Record<string, unknown>>(
  sql: string,
  limit = 10000,
): Promise<T[] | null> {
  try {
    const c = await getMcpClient()
    if (!c) return null

    // Guard: don't fire queries if paths haven't resolved (e.g. list_parquet_files failed)
    if (!MCP_RES_FILE) {
      console.warn('[pulse-mcp] File paths not resolved yet — skipping query')
      return null
    }

    const result = await c.callTool({ name: 'sql_query_parquet', arguments: { sql, limit } })

    const content = (result.content as Array<{ type: string; text: string }>)[0]
    if (!content || content.type !== 'text') return null

    const parsed: unknown = JSON.parse(content.text)

    // FastMCP returns { data: [...], rows_returned: N, ... } — extract the data array
    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      Array.isArray((parsed as { data: unknown }).data)
    ) {
      return (parsed as { data: T[] }).data
    }

    // Fallback: bare array (shouldn't happen with FastMCP, but be defensive)
    if (Array.isArray(parsed)) return parsed as T[]

    return null
  } catch (err) {
    console.error('[pulse-mcp] sql_query_parquet failed:', err)
    // Reset client on error so the next call attempts a fresh reconnect
    mcpClient = null
    connectPromise = null
    MCP_RES_FILE = ''
    MCP_VEN_FILE = ''
    MCP_ENT_FILE = ''
    return null
  }
}
