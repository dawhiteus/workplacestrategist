/**
 * MCP client for the LiquidSpace Pulse Data server.
 *
 * Set PULSE_MCP_URL=https://liquidspace-mcp.ngrok.dev/mcp in .env.local to activate.
 * When set, all pulse.ts data functions query the remote Parquet files via MCP
 * instead of requiring a local DuckDB / PULSE_DATA_PATH installation.
 *
 * The MCP server runs on jswanson's machine and exposes a DuckDB-backed
 * sql_query_parquet tool. Parquet file paths are absolute on that machine.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// ── Parquet file paths on the MCP server's machine ───────────────────────────
// These are the server's own filesystem paths — fixed relative to where the
// MCP server runs. Update if jswanson moves the data directory.

const MCP_DATA_PATH = '/Users/jswanson/PycharmProjects/IndependeskCrawler/data-output'
export const MCP_RES_FILE = `${MCP_DATA_PATH}/HourlyDailyReservations.parquet`
export const MCP_VEN_FILE = `${MCP_DATA_PATH}/Venues.parquet`
export const MCP_ENT_FILE = `${MCP_DATA_PATH}/EnterpriseEngagementSummary.parquet`

// ── Singleton client ──────────────────────────────────────────────────────────

let mcpClient: Client | null = null
let connectPromise: Promise<void> | null = null

async function getMcpClient(): Promise<Client | null> {
  const mcpUrl = process.env.PULSE_MCP_URL
  if (!mcpUrl) return null

  // Already connected
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
 *   - null  — MCP not configured, or connection/query failed
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
    return null
  }
}
