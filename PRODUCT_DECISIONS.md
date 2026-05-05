# Workplace Strategist — Product Decisions Log

**Purpose:** Record of decisions made, why they were made, and what would trigger revisiting them.  
This is a living document. Nothing here is permanent — the "Revisit if" field on each entry is the reopen condition.

**Last updated:** May 6, 2026

---

## Features

### Supply Risk Intelligence
**Status:** PARKED — not removed permanently  
**Decision:** Built and working (branch: `feature/supply-risk-intelligence`), but removed from the product. No direct commercial trigger identified — it showed operator concentration data but didn't lead to a LiquidSpace transaction. Unlike Hub Locator (→ hub booking) or the budget simulator (→ flex commitment), Supply Risk had no clear "and then you book something" outcome.  
**What was built:** Three-panel canvas (operator concentration, supply depth, pricing stability), composite Supply Risk Score (SRS), seed data for 14 major Allstate markets, AI chat tool integration.  
**Revisit if:** A booking CTA is identified — e.g. "diversify your Columbus exposure by booking these 3 alternative operators on LiquidSpace" routes through the marketplace. Or if the tool is repositioned as a sales/prospect tool with a separate commercial justification.

---

### Standalone Supply Risk Tool (separate nav item)
**Status:** REJECTED  
**Decision:** Briefly considered promoting Supply Risk to its own nav item alongside Hub Locator. Reversed when the underlying feature was parked. Even if Supply Risk is revived, the nav position question should be re-evaluated then based on usage patterns and audience.  
**Revisit if:** Supply Risk is revived and there is evidence it serves a different audience than Hub Locator (e.g. procurement teams vs. workplace strategists).

---

## UX / Terminology

### "Locations" not "Markets"
**Status:** DECIDED — implemented  
**Decision:** All user-facing strings use "location" / "locations" instead of "market" / "markets." "Market" is internal / analytical language; "location" is clearer for a workplace audience.  
**Applies to:** ContextBar dropdowns, Hub Locator index page, Shell ranking/comparison canvases, quick analysis cards.  
**Revisit if:** User research shows confusion, or if "market" becomes a meaningful product concept (e.g. a Market Analysis tool where the term is load-bearing).

### Location Selector: Top 50 Cap
**Status:** DECIDED — implemented  
**Decision:** For portfolios with more than 50 locations, the location dropdown shows the top 50 by spend with a note ("Showing top 50 · search to find others"). Search always covers all locations. For portfolios ≤50 locations, all are shown.  
**Revisit if:** User feedback shows the cap is causing friction, or if we add a "browse all" view elsewhere.

### "All Locations" Label in ContextBar
**Status:** DECIDED — no change  
**Decision:** The "All Locations" option resets the location filter (returns to full portfolio view). It's a filter action, not a description of the list contents, so the label is not misleading. No change needed.  
**Revisit if:** Persistent user confusion is reported.

---

## Architecture

### Cross-Boundary Communication via Window Events
**Status:** DECIDED — core pattern  
**Decision:** Shell.tsx owns all global state. Components communicate cross-boundary via `window.dispatchEvent` custom events rather than React Context or prop drilling. This is necessary because Next.js App Router Server Components break React Context across the server/client boundary.  
**Current events:** `enterprise-changed`, `load-canvas`, `load-compare`, `load-ranking`, `load-budget`, `load-intake-analysis`, `open-intake-modal`, `scenario-saved`, `ask-question`  
**Revisit if:** Next.js adds a cleaner solution for this pattern, or the event list becomes unmanageable.

### Dual-Mode Data Layer (Parquet + Seed JSON)
**Status:** DECIDED — both paths must always be maintained  
**Decision:** `lib/pulse.ts` functions always implement two paths: (1) live DuckDB query against Parquet files when `PULSE_DATA_PATH` is set, (2) seed JSON fallback from `/data/` when it isn't. This makes the app fully functional on Vercel (no database) while supporting live data in development.  
**Rule:** Any new data function must implement both paths. Never build Parquet-only.  
**Revisit if:** Vercel deployment is replaced with an environment that has direct database access.

### Enterprise as Prop, Never Hardcoded
**Status:** DECIDED — enforced  
**Decision:** The active enterprise must always be passed as a prop through the component tree. No component may hardcode 'Allstate' or any other enterprise name in API calls or data fetches. Shell.tsx owns enterprise state and passes it down.  
**Background:** A bug where MetroAnalysisCanvas hardcoded 'Allstate' in stress-test API calls was discovered and fixed. This rule prevents recurrence.  
**Revisit if:** Never — this is a correctness rule, not a preference.

---

## AI / Chat

### Real Claude API (SSE Streaming) — Not queryRouter
**Status:** DECIDED — implemented  
**Decision:** ConversationPanel connects to `/api/chat` and reads SSE events (tool_call, delta, canvas_data, insight, done, error). The earlier `queryRouter.ts` regex-based routing is deprecated and must not be reintroduced. Claude uses tool calls to fetch real data and streams responses word-by-word.  
**Background:** The queryRouter bypassed Claude entirely and returned canned responses, which failed on time-specific questions and enterprise-specific queries.  
**Revisit if:** API costs become prohibitive, in which case a hybrid (queryRouter for simple lookups, Claude for complex analysis) could be considered — but only after measuring actual usage.

### Auth: Personal API Key Takes Priority Over OAuth Token
**Status:** DECIDED — implemented  
**Decision:** When `ANTHROPIC_API_KEY` is set, always use `https://api.anthropic.com` as the base URL. When only `CLAUDE_CODE_OAUTH_TOKEN` is set, use `ANTHROPIC_BASE_URL`. Never mix a personal API key with the proxy endpoint — this causes 401 errors.  
**Revisit if:** Auth approach changes at the infrastructure level.

### Model: claude-sonnet-4-5
**Status:** DECIDED — current  
**Decision:** Chat route uses `claude-sonnet-4-5`. Previous model (`claude-3-5-sonnet-20241022`) was deprecated by April 2026 and returned 404.  
**Revisit if:** A newer model is released with meaningfully better tool-use performance or cost profile.

---

## Scoring / Analytics

### Commute Radius Behavior at Default (50 miles)
**Status:** DECIDED — working as intended  
**Decision:** At the 50-mile default, nearly all venues in urban markets fall within the radius (catchment ratio ≈ 1.0), so moving the slider has no visible effect on economics. This is correct behavior. The slider has meaningful impact when reduced below ~20 miles in dense cities. No change to the logic needed.  
**Revisit if:** Users consistently report the slider as broken, in which case a visual indicator of catchment ratio change (even when ratio stays at 1.0) might improve perceived responsiveness.

### Hub Candidate Threshold: $25K Annual Spend
**Status:** DECIDED — implemented  
**Decision:** Locations with ≥$25,000 annual flex spend are classified as hub candidates on the index page KPI tile and in ranking views.  
**Revisit if:** Sales feedback suggests the threshold is too high (excluding real candidates) or too low (surfacing noise).

### Booking Definition: Completed Only, Trailing 365 Days
**Status:** DECIDED — implemented  
**Decision:** All Parquet queries filter `Status = 'Completed'` only. `CancellationPolicy` bookings (cancelled but the vendor kept the fee) are excluded. All queries are windowed to the trailing 365 days — previously they returned all-time counts, which diverged from Pulse reporting dashboards. The `lookbackDays` parameter in `getDailyDemand` was dead code; it is now wired into the SQL.  
**Applies to:** `getMetroPortfolio`, `getMetroVenues`, `getDailyDemand`, `getPeerBenchmarks` in `lib/pulse.ts`.  
**Revisit if:** A use case emerges for all-time data (e.g. trend analysis), in which case a separate query path should be added rather than changing the default.

### Hub Stress Test Seat Default: Minimum Floor of 10
**Status:** DECIDED — implemented  
**Decision:** The stress test opens with `Math.max(breakeven_seats, 10)` seats. The demand-derived `breakeven_seats` formula (`max(2, ceil(avgDailyBookings × 1.3))`) produces 2–3 seats for low-volume markets, which isn't commercially meaningful as a starting point for hub sizing conversations. The floor ensures the tool always opens at a realistic minimum regardless of booking volume.  
**Note:** `breakeven_seats` is misnamed — it is demand-derived (recommended minimum hub size from booking patterns), not an economic breakeven calculation.  
**Revisit if:** Sales feedback suggests 10 is too high for micro-markets, or if a separate economic breakeven formula is introduced to replace the demand proxy.

---

## What's Next (Unresolved)

These are open questions without a decision yet — tracked here so they don't get lost.

- **Portfolio Manager** — marked "Soon" in nav. No spec written. What does it do that Hub Locator doesn't?
- **Originate Requirement flow** — the "Originate Requirement" button in RecommendationCard exists but the sourcing workflow behind it is not built.
- **Rate vs. Market analysis** — referenced in supply risk spec as an existing concept. Not yet surfaced in the UI.
- **Multi-enterprise admin view** — currently one enterprise at a time. Is there a portfolio-of-portfolios view for LiquidSpace internal users?
