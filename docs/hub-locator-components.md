# Hub Locator — Metro Analysis Page: Component Reference

**Page route:** `/hub-locator/[city]/[state]`  
**Canvas component:** `MetroAnalysisCanvas.tsx`  
**Last updated:** April 24, 2026

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Breadcrumb + Export button]                               │
│  [ThresholdAlertBadge]                   ← conditional      │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │   HVSScorecard      │  │   DemandSignaturePanel      │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              HubPurposePanel  (full width)          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────┐    │
│  │    HubLocationMap       │  │   StressTestPanel     │    │
│  │                         │  ├───────────────────────┤    │
│  │                         │  │   PeerBenchmarkPanel  │    │
│  └─────────────────────────┘  └───────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              RecommendationCard (full width)        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

Right rail (fixed sidebar): RightRail
```

---

## Components

### 1. ThresholdAlertBadge
**File:** `components/hub-locator/ThresholdAlertBadge.tsx`  
**Position:** Top of page, above the scorecard row. Conditional — only renders when alerts exist.

**What it does:**  
Displays one banner per threshold breach. Each alert has a severity (red / amber / green), a metric name, a plain-English message, and the raw score vs. threshold. If no alerts exist, renders a green "All metrics within threshold" confirmation instead.

**Data source:** `data.alerts[]` — computed server-side in the API route. Currently only ERI below 40 triggers a red alert.

**Key fields per alert:** `metric`, `message`, `severity`, `value`, `threshold`

---

### 2. HVSScorecard
**File:** `components/hub-locator/HVSScorecard.tsx`  
**Position:** Row 1, left column (360px fixed width).

**What it does:**  
Primary scoring summary for the market. Shows the Hub Viability Score composite and its three sub-indices.

**Sections:**
- **Composite score** — large number (0–100), RAG colored (green ≥70, amber 40–69, red <40)
- **Recommendation badge** — STRONG_BUY / BUY / MONITOR / DO_NOT_PROCEED / INSUFFICIENT_DATA / ALTERNATIVE_INTERVENTION
- **Three sub-scores** (each with a progress bar and RAG color):
  - **DVI — Demand Viability Index** (weight: 40%): measures booking volume and consistency
  - **DCI — Demand Concentration Index** (weight: 30%): measures geographic clustering of venues
  - **ERI — Economic Return Index** (weight: 30%): measures net economics vs. hub cost
- **Composite bar** — weighted rollup with scale markers at 0 / 40 / 70 / 100

**Formula:** `HVS = DVI × 0.4 + DCI × 0.3 + ERI × 0.3`

---

### 3. DemandSignaturePanel
**File:** `components/hub-locator/DemandSignaturePanel.tsx`  
**Position:** Row 1, right column (fills remaining width).

**What it does:**  
Shows 12 months of weekly booking activity as a bar chart, with summary statistics below.

**Sections:**
- **Header stats** — total bookings (12mo) and peak week booking count
- **Bar chart** — weekly aggregated bookings. Two reference lines:
  - Gray dashed: weekly average
  - Orange dashed: 2× weekly average (spike threshold)
- **Three summary stats** (hover tooltips explain methodology):
  - **Avg Weekly** — total bookings ÷ active weeks (weeks with ≥1 booking). Tooltip also shows true 52-week annual rate.
  - **Spike Weeks** — number of weeks that exceeded the 2× average line. Matches the orange line on the chart exactly.
  - **Active Days** — count of calendar days that had at least one booking

**Data source:** `data.dailyDemand[]` — array of `{day, bookings, spend}` records, aggregated to weekly internally.

---

### 4. HubPurposePanel
**File:** `components/hub-locator/HubPurposePanel.tsx`  
**Position:** Full-width row between the scorecard/demand row and the map row.

**What it does:**  
Classifies the market's workforce behavior into one of four hub purpose archetypes using two behavioral indices computed from individual booking records. Renders an empty state if behavioral data is unavailable.

**Left side — 2×2 quadrant chart (168×168px):**  
- X-axis: HWI score (collaboration ↔ concentration)
- Y-axis: CPI score (convergent ↔ individual)
- Active quadrant is highlighted; customer dot is plotted at (HWI%, 100−CPI%)
- Threshold: 40 on both axes

**Four archetypes:**
| Quadrant | HWI | CPI | Meaning |
|---|---|---|---|
| Full Collaboration | ≥40 | ≥40 | Teams co-locate and book collaborative space |
| Latent Collaboration | ≥40 | <40 | Collaborative bookings but no consistent co-presence |
| Cultural Anchor | <40 | ≥40 | Employees co-locate but book focus/individual space |
| Distributed Workforce | <40 | <40 | Individual work, rarely co-located |

**Right side — three metric tiles:**

- **HWI tile (Hybrid Worktype Index):**  
  Score 0–100. Proportion of bookings that are collaboration-type vs. concentration-type. Bar with threshold tick at 40. Label: "Threshold: 40".

- **CPI tile (Co-Presence Index):**  
  Score 0–100. Share of venue-days where ≥2 distinct employees were present. Bar with threshold tick at 40. Shows "1 in N venue-days had 2+ employees" (where N = total venue-days ÷ co-presence event count). Label: "Threshold: 40".

- **Booking Mix tile:**  
  Split bar showing collaboration % vs. concentration % of total seat-days. Seat-days differ from booking count — each booking is weighted by party size (e.g. a 4-person meeting room = 4 seat-days). Hovering the total shows this explanation.

**Footer note:** Confirms that both indices must exceed 40 for hub-positive classification.

**Data source:** `data.hvs.hwi`, `data.hvs.cpi`, `data.hvs.hub_purpose` — computed via `getWorkTypeData()` in `lib/pulse.ts`, with seeded fallback data for all 50 portfolio markets.

---

### 5. HubLocationMap
**File:** `components/hub-locator/HubLocationMap.tsx` + `MapInner.tsx`  
**Position:** Row 3, left column (fills remaining width).

**What it does:**  
Interactive Leaflet map showing where Allstate employees currently book flex space in the market, and (conditionally) where a hub would be recommended.

**Sections:**
- **Map (280px tall):** CARTO light tile layer. Venue circles are sized by spend (larger = higher spend). Clicking a circle shows a popup with venue name, spend, and bookings.
- **Recommended hub circle:** Green dashed circle, only shown when recommendation is BUY or STRONG_BUY. Hidden for MONITOR, DO_NOT_PROCEED, ALTERNATIVE_INTERVENTION. The hub centroid is the weighted centroid of venue locations by spend.
- **Legend:** "● Venues" always shown. "● Rec. Hub" only shown when hub circle is active.
- **Venue list:** First 4 venues listed below the map by spend rank, with spend and booking count. All venues shown in print.

**Print behavior:** Map tiles don't render in print. Replaced by a plain-text hub coordinate and description block.

**Data source:** `data.venues[]` (VenueLocation array with lat/lng, spend, reservations) and `data.hvs.recommended_hub_location`.

---

### 6. StressTestPanel
**File:** `components/hub-locator/StressTestPanel.tsx`  
**Position:** Row 3, right column, upper card.

**What it does:**  
Lets the analyst adjust three assumptions and see how they affect hub economics in near-real time. Every slider change triggers a server-side recalculation via the API.

**Three sliders:**

- **Hub Cost / Month ($2K–$25K):** Monthly all-in cost of the hub. Affects ERI directly — higher cost reduces net saving and ERI score.

- **Induced Demand Uplift (0–100%):** Assumed percentage increase in bookings that a hub would generate (employees who currently work from home would book the hub instead). Affects ERI and net saving. Default 25%.

- **Commute Radius (5–60mi):** Defines which existing venue locations fall within reach of the proposed hub centroid. Only venues within this radius contribute to demand and economics. Affects DVI (volume), DCI (coverage fit), and ERI (baseline spend). Does NOT model employee home addresses — it models which current venue spend the hub would replace.
  - **Venue coverage indicator** (live, no API needed): Shows "X of Y venues within radius · Z% of spend" updating instantly as you drag. Amber when some venues are excluded. If all venues are already within range, shows "All venues in range — pull left to see radius sensitivity."

**Net Economics section:**
- **Hub Annual Cost** — monthly cost × 12, updates instantly
- **Net Saving** — server-computed (catchment-adjusted baseline × uplift factor − hub annual cost). Shows "Recalculating…" during API round-trip. Color is ERI-aware:
  - Green: baseline spend ≥ hub cost AND ERI ≥ 40 (genuinely positive)
  - Amber + "uplift" badge: positive only because of the uplift assumption, or ERI < 40
  - Red: negative even with uplift

**Data source:** Sliders send params to `/api/pulse/metro/[city]/[state]`. Response updates HVS scorecard, Hub Purpose Panel, Peer Benchmark, Recommendation Card, and right rail simultaneously (via `onDataUpdate` callback to Shell).

---

### 7. PeerBenchmarkPanel
**File:** `components/hub-locator/PeerBenchmarkPanel.tsx`  
**Position:** Row 3, right column, lower card (below StressTestPanel).

**What it does:**  
Compares this market's HVS score against anonymized peer enterprises in the same market.

**Sections:**
- **Hub Purpose badge** — shows the market's behavioral archetype (Full Collaboration / Latent Collaboration / Cultural Anchor / Distributed Workforce)
- **Percentile rank** — large number showing where this enterprise falls vs. peers (e.g. "42nd")
- **Distribution bar** — shows three markers: Median (gray), P75 (amber), You (RAG colored). "You" marker is full opacity; others are dimmed.
- **Stat row** — Your HVS / Median HVS / Top 25% HVS as plain numbers

**Empty state:** If fewer than 5 enterprises are in the market, shows "Insufficient peer data" with the reason.

**Data source:** `data.peers` — `PeerBenchmark` object with `median_hvs`, `top_quartile_hvs`, `percentile`, `sample_size`. Requires ≥5 peer enterprises in the market.

---

### 8. RecommendationCard
**File:** `components/hub-locator/RecommendationCard.tsx`  
**Position:** Row 4, full width. Bottom of page.

**What it does:**  
The decision-output layer. Translates the HVS score into an actionable recommendation with supporting evidence, configuration guidance, and a workflow action.

**Sections (in order):**

1. **Recommendation badge + narrative** — plain-English explanation of the recommendation and why.

2. **Alternative Intervention panel** — only shown when recommendation is ALTERNATIVE_INTERVENTION (DISTRIBUTED_WORKFORCE behavioral profile + positive economics). Describes the recommended alternative (Governed On-Demand or Preferred Operator Program), rationale, and suggested next step. Purple styling.

3. **Hub Location + Size** — two tiles:
   - Location: lat/lng of the demand centroid with description
   - Size: recommended seat range (min–max), derived from average daily bookings × 1.3 headroom

4. **Programmatic Hub Configuration** — only shown for BUY / STRONG_BUY recommendations. Purpose-aware breakdown of:
   - Private offices / Dedicated desks / Hot desks
   - Meeting rooms (by capacity × count)
   - Phone booths
   - Anchor-day capacity factor
   - Configuration rationale (text)

5. **Originate Sourcing Requirement** — only shown for BUY / STRONG_BUY:
   - **Before:** Blue "Originate Sourcing Requirement" button. Clicking generates a REQ-XXXX ID, timestamps it, broadcasts a `hub-originated` CustomEvent (picked up by the right rail), and transitions to the confirmed state.
   - **After:** Green confirmed badge with the REQ ID, timestamp, and "View in Transaction Manager →" link to `localhost:5175`.

6. **Economic ROI grid** — four rows: Baseline Spend / Hub Annual Cost / Net Saving / Payback period. Baseline is catchment-adjusted (radius-gated spend, not raw total spend).

7. **Workforce ROI grid** — three rows: Commute Reduction / Employees Benefited / Retention Lift Estimate. These are model estimates, not measured values.

8. **What Would Change This** — bulleted list of specific conditions that would shift the recommendation (e.g. demand volume threshold, hub cost break-even point).

9. **Critical Unknowns** — bulleted list of data gaps that the model cannot account for (e.g. employee home address distribution, headcount growth projections).

---

### 9. ExportDialog
**File:** `components/hub-locator/ExportDialog.tsx`  
**Position:** Top-right of page, "Export" button in the breadcrumb bar.

**What it does:**  
Modal dialog for exporting the analysis in three formats.

**Formats:**
- **Executive PDF** — triggers `window.print()` which renders the print-optimized layout. Chrome users shown instructions for Save as PDF with clean output settings. (Fully functional)
- **Data Export (CSV)** — raw demand + HVS scoring inputs. (Stubbed — shows loading, no download)
- **GeoJSON Map Data** — venue locations + hub polygon. (Stubbed — shows loading, no download)

**Preview panel:** Shows what will be included: HVS composite, net saving, seat recommendation, and count of critical unknowns.

---

### 10. RightRail (Analysis Panel)
**File:** `components/layout/RightRail.tsx`  
**Position:** Fixed right sidebar, 280px wide. Persists across all canvas views.

**What it does:**  
Derives and displays contextual insights from whichever canvas is currently active. Updates whenever the canvas data changes — including after stress test slider adjustments.

**Sections:**

**Key Insights** — auto-derived cards, each typed as Finding / Action / Alert / Originated:

For metro analysis view, up to four insights:
- **Finding:** HVS composite score + recommendation label + one-line narrative
- **Action:** Lowest sub-score flagged as the primary drag on the composite (if score < 50)
- **ROI insight** (ERI-aware, four variants):
  - Finding: baseline spend ≥ hub cost AND ERI ≥ 40 → "Hub saves $XK/yr"
  - Action: net positive only due to uplift, ERI ≥ 40 → "ROI depends on induced demand uplift"
  - Alert: net positive only due to uplift, ERI < 40 → "Economics rely on unconfirmed uplift (ERI X)"
  - Alert: net negative → "Hub costs $XK more than flex"
- **Alert:** Critical threshold breaches (red severity alerts only)

For compare and portfolio ranking views, different insight logic applies (top market, best economics, gap analysis, concentration leaders).

**Originated events:** Listens for the `hub-originated` CustomEvent dispatched by RecommendationCard. Adds an "Originated" card at the top of insights showing the REQ ID, market, and timestamp. Persists for the session even if the user navigates to another market.

**Downloads section:** Context-aware export buttons matching the current canvas (PDF and CSV). PDF triggers `window.print()`; CSV is marked "Soon."

**This Session:** Chronological history of markets and views analyzed in the current session (last 8 entries), with relative timestamps.

---

## Data Flow

```
URL params (city, state) + enterprise query param
        ↓
/api/pulse/metro/[city]/[state]
        ↓
  getMetroVenues()        → VenueLocation[]
  getDailyDemand()        → DailyDemand[]
  getMetroPortfolio()     → MetroSummary
  getPeerBenchmarks()     → PeerBenchmark | null
  getWorkTypeData()       → { hwi, cpi } | null   ← seeded fallback if no Parquet
        ↓
  buildHVSReasoning()     → HVSReasoningOutput
    ├─ computeDVI()
    ├─ computeDCI()
    ├─ computeERI()       ← uses catchmentRatio (radius-adjusted spend)
    ├─ classifyHubPurpose()
    ├─ buildHubConfiguration()   ← purpose-aware, BUY/STRONG_BUY only
    └─ buildAlternativeIntervention()   ← DISTRIBUTED_WORKFORCE only
        ↓
  MetroHubAnalysis response
        ↓
  MetroAnalysisCanvas (client state)
        ↓
  → all child components
  → onDataUpdate() → Shell canvasData → RightRail
```

---

## Stress Test Update Flow

```
StressTestPanel slider change
        ↓
handleStressChange(params) in MetroAnalysisCanvas
        ↓
fetch /api/pulse/metro with new hubCost + uplift + radius
        ↓
new MetroHubAnalysis
        ↓
setData(newData)          → all canvas components re-render
onDataUpdate(newData)     → Shell.canvasData updates → RightRail re-derives insights
```

---

## Recommendation Enum

| Value | Trigger | Hub marker shown | Originate button | Alt intervention panel |
|---|---|---|---|---|
| STRONG_BUY | HVS ≥ 70 | ✓ | ✓ | — |
| BUY | HVS 55–69 | ✓ | ✓ | — |
| MONITOR | HVS 40–54 | — | — | — |
| DO_NOT_PROCEED | HVS < 40 | — | — | — |
| INSUFFICIENT_DATA | < 10 reservations | — | — | — |
| ALTERNATIVE_INTERVENTION | DISTRIBUTED_WORKFORCE + BUY/STRONG_BUY economics | — | — | ✓ |
