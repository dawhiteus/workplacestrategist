# Workplace Strategist — Architecture & Module Reference

**Last updated:** May 1, 2026  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · DuckDB (via Parquet) · Anthropic API

---

## How the app is structured

```
Browser
  └── Shell (layout wrapper, all global state)
        ├── Navigation (left sidebar)
        ├── ContextBar (enterprise + location selectors, top bar)
        ├── Main content area
        │     ├── Hub Locator index page (default)
        │     └── CanvasRenderer (replaces index when a market is opened)
        │           ├── MetroAnalysisCanvas (hub viability deep-dive)
        │           ├── CompareCanvas (side-by-side market comparison)
        │           ├── RankingCanvas (portfolio ranking table)
        │           └── BudgetSimulatorCanvas (multi-market economics)
        ├── ConversationPanel (AI chat, left rail)
        └── RightRail (insights, session history, saved scenarios)
```

Data flows in two directions:
- **Downward via props** from Shell to all child components
- **Sideways via `window` custom events** for cross-boundary communication (Shell ↔ pages, canvas triggers, etc.)

---

## Layout & Shell

### `components/layout/Shell.tsx`
The root client component that owns all application state. Every piece of global state lives here:

| State | Purpose |
|---|---|
| `enterprise` | Active customer (e.g. "Allstate"). Drives all data fetches. |
| `metros` | Portfolio locations for the active enterprise, loaded from API. |
| `selectedMetro` | Currently filtered location (null = all locations). |
| `canvasData` | When set, replaces the main content area with a canvas panel. |
| `messages` | AI chat history. |
| `insights` | Pinned findings from the AI, shown in the right rail. |
| `sessionHistory` | Last 8 canvas sessions — lets users jump back. |
| `savedScenarios` | Stress-test scenarios the user has saved. |
| `intakeOpen` | Controls the New Customer intake modal. |

**Key behaviors:**
- Fetches the enterprise list from `/api/pulse/enterprises` on mount
- Re-fetches metros whenever `enterprise` changes, then broadcasts `enterprise-changed` custom event so the index page updates
- Listens for `load-canvas`, `load-compare`, `load-ranking` custom events from child components to open canvases
- Uses `enterpriseRef` (a ref) so event listener callbacks always read the current enterprise without stale closures

### `components/layout/ContextBar.tsx`
The top bar with two dropdowns:

- **Enterprise selector** — lists all customers, has a search box, and a "New Customer" action that opens the intake modal
- **Location selector** — lists the active enterprise's markets sorted by spend. For portfolios with >50 locations, shows the top 50 by default with a note to search for others. Search always covers all locations.

### `components/layout/Navigation.tsx`
Left sidebar with tool links (Hub Locator, Portfolio Manager). Portfolio Manager is marked "Soon."

### `components/layout/RightRail.tsx`
Right panel with three sections:
1. **Insights** — findings pinned by the AI chat (automatically derived from canvas data or extracted from AI responses)
2. **Session History** — last 8 canvas sessions, click any to restore
3. **Saved Scenarios** — stress-test parameter sets saved by the user from the Stress Test panel

---

## Hub Locator — Index Page

### `app/hub-locator/page.tsx`
The landing page of the tool. Shows the portfolio overview for the currently selected enterprise.

**Listens for:** `enterprise-changed` window event to refresh when the user switches customers.

**Sections:**
- **KPI tiles (4 cards):** Portfolio Footprint (location count), Annual Portfolio Spend, Hub Candidates (locations ≥$25K spend), Members Served
- **Portfolio Insights:** Three auto-generated insight banners — Spend Concentration Risk, High Fragmentation Opportunity, Anomalous Spend-per-Booking
- **Quick Analyses:** Cards that open canvases — top hub candidate, portfolio ranking, market comparison, demand patterns
- **CompareCard:** Lets the user pick 2–3 locations and open the comparison canvas

**Stat derivation (`computeStats`):** Calculates all KPI values from the metros array. Hub candidates = locations with ≥$25K annual spend. Most fragmented = highest venue count among top-20 by bookings. Spend outlier = location with ≥100 reservations and spend/booking far below portfolio average.

---

## Hub Viability Analysis (Canvas)

### `components/hub-locator/MetroAnalysisCanvas.tsx`
The full deep-dive view for a single market. Orchestrates all the sub-panels and owns the stress-test state.

**Stress test flow:**
1. User moves a slider → `handleStressChange` fires
2. Params update immediately (sliders feel responsive)
3. After 350ms debounce → API call to `/api/pulse/metro/[city]/[state]` with new params
4. Response updates all panels: HVS scores, economics, recommendation

**Important:** Uses `enterprise` prop (fixed earlier) to scope API calls to the correct customer.

### `components/hub-locator/HVSScorecard.tsx`
Displays the Hub Viability Score composite and three sub-scores (DVI, DCI, ERI) with color-coded bars (green ≥70, amber ≥40, red <40) and the recommendation badge (STRONG BUY → DO NOT PROCEED).

### `components/hub-locator/DemandSignaturePanel.tsx`
12-month bar chart of daily bookings. Shows average weekly bookings, spike weeks (days >2× average), and active days. Helps visualize demand consistency.

### `components/hub-locator/HubPurposePanel.tsx`
The 2×2 classification matrix. Places the market in one of four quadrants based on:
- **HWI (Hybrid Worktype Index):** Collaboration-shaped vs. concentration-shaped bookings
- **CPI (Co-Presence Index):** Share of venue-days where ≥2 employees were present simultaneously

Quadrants: Full Collaboration · Latent Collaboration · Cultural Anchor · Distributed Workforce. The quadrant drives the recommended hub configuration (seat mix, meeting room ratio, etc.).

### `components/hub-locator/StressTestPanel.tsx`
Interactive economics modeler with sliders:

| Slider | Effect |
|---|---|
| Hub Capacity (seats) | Changes hub monthly cost (seats × cost/seat) |
| Commute Radius (miles) | Gates the catchment ratio — only venues within radius count toward demand and spend |
| Cost per Seat/Month | Adjustable via a distribution curve sourced from Pulse listing data for that market |
| Induced Demand Uplift % | Models how much additional demand a hub generates vs. current flex |

Shows a cost distribution bell curve with real market data (or national median as fallback). Net Saving = (catchment-adjusted spend × uplift factor) − hub annual cost.

### `components/hub-locator/HubLocationMap.tsx` / `MapInner.tsx`
Leaflet map showing venue pins sized by spend. The hub centroid (weighted center of gravity) is marked. The commute radius circle is rendered around the centroid. Split into two files to handle Leaflet's SSR incompatibility (MapInner is the actual Leaflet component, HubLocationMap is the SSR-safe wrapper).

### `components/hub-locator/RecommendationCard.tsx`
Final recommendation panel at the bottom of the canvas. Shows the narrative, what would change the recommendation, critical unknowns, and an "Originate Requirement" button that kicks off a sourcing request workflow.

### `components/hub-locator/PeerBenchmarkPanel.tsx`
Anonymized comparison of the market's HVS score against other enterprises active in the same city. Requires ≥5 peer accounts to show (privacy threshold).

### `components/hub-locator/ThresholdAlertBadge.tsx`
Red/amber alert banners that appear at the top of the canvas when a sub-score falls below 40 (e.g., "ERI: Hub economics unfavorable at current cost parameters").

### `components/hub-locator/ExportDialog.tsx`
Print/export dialog. Uses `@media print` CSS to hide navigation and render a clean single-column layout for PDF export.

---

## Scoring Engine

### `lib/hvs.ts`
Pure TypeScript scoring functions — no API calls, no side effects.

**DVI — Demand Viability Index (weight: 40%)**  
Is there enough consistent demand to fill a hub?
- Volume score (0–50 pts): 200 reservations/yr = full score
- Consistency score (0–35 pts): penalizes high coefficient of variation
- Peak penalty (up to −15 pts): too many spike days = oversizing risk

**DCI — Demand Concentration Index (weight: 30%)**  
Is demand geographically concentrated enough for one hub?
- Top venue share, total venue count, and geographic bounding box vs. commute radius

**ERI — Economic Return Index (weight: 30%)**  
Does a hub create positive economics vs. current flex spend?
- (Catchment-adjusted spend × uplift) − hub annual cost, normalized to 0–100

**HVS Composite:** `DVI×0.4 + DCI×0.3 + ERI×0.3`

**Catchment ratio:** Fraction of venue spend within the commute radius of the hub centroid. Gates both DVI and ERI — a tight radius reduces effective demand.

**Hub Purpose classifier:** `classifyHubPurpose(hwi, cpi)` → one of four quadrant labels. Applied as an overlay on top of HVS — can change the recommendation (e.g., STRONG_BUY + DISTRIBUTED_WORKFORCE → ALTERNATIVE_INTERVENTION).

---

## Data Layer

### `lib/pulse.ts`
Data access layer with two modes:

**Mode 1 — Parquet (live):** When `PULSE_DATA_PATH` is set and the Parquet file exists, queries DuckDB directly via the MCP Parquet tool. Used in development on Jim's machine.

**Mode 2 — Seed JSON (demo):** Falls back to pre-generated JSON files in `/data/`. Files per enterprise:
- `{slug}-metros.json` — portfolio summary (all locations, spend, reservations, venues, members)
- `{slug}-venues-{metro-key}.json` — individual venue lat/lng and spend for one location

This fallback makes the app fully functional in demos and on Vercel without a database connection.

### `data/` directory
5,400+ JSON files covering 80 active enterprise customers. Generated from a Python script that queries the Parquet file, normalizes Unicode city names, maps ISO country codes, and deduplicates records.

### `lib/types.ts`
Shared TypeScript interfaces. Key types: `MetroSummary`, `VenueLocation`, `DailyDemand`, `HVSReasoningOutput`, `StressTestParams`, `MetroHubAnalysis`.

### `lib/utils.ts`
Shared helpers: `formatCurrency`, `ragStatus` (score → green/amber/red), `haversineKm` (geographic distance), `weightedCentroid` (spend-weighted center of venue cluster).

---

## API Routes

### `GET /api/pulse/metros`
Returns the metro portfolio for an enterprise. Queries Parquet or falls back to seed JSON.

### `GET /api/pulse/metro/[city]/[state]`
Returns full hub viability analysis for one market. Accepts stress-test params as query params (`hubCapacitySeats`, `costPerSeat`, `uplift`, `radius`). Runs HVS scoring, peer benchmarks, and threshold alerts. Returns `MetroHubAnalysis`.

### `GET /api/pulse/enterprises`
Returns the list of enterprise names from `enterprises-list.json`.

### `GET /api/pulse/cost-distribution`
Returns the statistical distribution of coworking seat costs for a market (P10, P25, median, P75, P90). Powers the bell curve in the Stress Test panel.

### `POST /api/chat`
The AI chat endpoint. Accepts `{ messages, enterprise }`. Pre-loads portfolio context for the active enterprise, builds a system prompt, then runs Claude with tool access. Tools available to Claude:
- `get_portfolio` — full metro list
- `get_metro_analysis` — single-market HVS analysis with monthly demand breakdown
- `compare_metros` — side-by-side comparison of 2–3 markets

Streams SSE events: `tool_call` (loading indicator), `delta` (streaming text), `canvas_data` (triggers canvas render), `insight` (pins to right rail), `done`, `error`.

### `POST /api/pulse/intake`
Handles new customer intake form submissions from the MarketIntakeModal.

---

## AI Chat

### `components/chat/ConversationPanel.tsx`
The conversation UI in the left rail. Sends messages to `/api/chat` and reads the SSE stream. Handles all event types:
- Shows a "Loading [tool]…" indicator while Claude is fetching data
- Streams Claude's text response word by word as it arrives
- Fires `onCanvasData` to render analysis results in the main pane
- Fires `onAddInsight` to pin findings to the right rail

Enterprise is passed through from Shell so every query is scoped to the active customer.

---

## Key Conventions

**Custom events (window):** Used as the cross-boundary communication pattern since Next.js App Router prevents React Context from flowing through Server Component parents.

| Event | Fired by | Consumed by |
|---|---|---|
| `enterprise-changed` | Shell (after metro fetch) | Hub Locator index page |
| `load-canvas` | Index page, quick analysis cards | Shell |
| `load-compare` | CompareCard | Shell |
| `load-ranking` | KPI tiles, insight banners | Shell |
| `open-intake-modal` | ContextBar "New Customer" | Shell |
| `scenario-saved` | StressTestPanel | Shell |
| `ask-question` | RecommendationCard | ConversationPanel |

**Scoring thresholds:**
- ≥70 = Green (viable)
- 40–69 = Amber (monitor)
- <40 = Red (not viable)

**Hub candidate threshold:** ≥$25,000 annual flex spend

**Commute radius default:** 50 miles (most urban markets have all venues captured within this radius; slider effect is most visible when reducing below 20 miles)
