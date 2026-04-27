// Server-safe module — used in intake API route only

export interface PlatformVenueCoord {
  venue_id: string
  venue_name: string
  latitude: number
  longitude: number
}

export interface MarketPlatformData {
  city: string
  state: string
  avgRatePerBooking: number // platform avg $ per booking in this market
  venueCoords: PlatformVenueCoord[]
}

// Per-market rates derived from platform Parquet aggregates.
// Venue coordinates represent major coworking districts in each metro.
export const PLATFORM_MARKETS: MarketPlatformData[] = [
  {
    city: 'New York', state: 'NY', avgRatePerBooking: 153,
    venueCoords: [
      { venue_id: 'ny-mid-1', venue_name: 'Midtown Workspace', latitude: 40.7549, longitude: -73.9840 },
      { venue_id: 'ny-fid-1', venue_name: 'FiDi Cowork', latitude: 40.7074, longitude: -74.0113 },
      { venue_id: 'ny-bkn-1', venue_name: 'Brooklyn Creative', latitude: 40.6892, longitude: -73.9442 },
      { venue_id: 'ny-som-1', venue_name: 'SoMa Hub', latitude: 40.7230, longitude: -74.0030 },
      { venue_id: 'ny-hud-1', venue_name: 'Hudson Yards Office', latitude: 40.7527, longitude: -74.0015 },
    ],
  },
  {
    city: 'Austin', state: 'TX', avgRatePerBooking: 210,
    venueCoords: [
      { venue_id: 'au-dt-1', venue_name: 'Downtown Austin Hub', latitude: 30.2672, longitude: -97.7431 },
      { venue_id: 'au-6th-1', venue_name: '6th Street Workspace', latitude: 30.2649, longitude: -97.7341 },
      { venue_id: 'au-dom-1', venue_name: 'Domain Cowork', latitude: 30.4015, longitude: -97.7227 },
      { venue_id: 'au-sl-1', venue_name: 'South Lamar Office', latitude: 30.2512, longitude: -97.7592 },
    ],
  },
  {
    city: 'Atlanta', state: 'GA', avgRatePerBooking: 313,
    venueCoords: [
      { venue_id: 'atl-mid-1', venue_name: 'Midtown Atlanta Hub', latitude: 33.7850, longitude: -84.3840 },
      { venue_id: 'atl-bkh-1', venue_name: 'Buckhead Office', latitude: 33.8370, longitude: -84.3640 },
      { venue_id: 'atl-dt-1', venue_name: 'Downtown Atlanta', latitude: 33.7490, longitude: -84.3880 },
      { venue_id: 'atl-vg-1', venue_name: 'Virginia-Highland Cowork', latitude: 33.7810, longitude: -84.3520 },
    ],
  },
  {
    city: 'Chicago', state: 'IL', avgRatePerBooking: 175,
    venueCoords: [
      { venue_id: 'chi-loop-1', venue_name: 'The Loop Workspace', latitude: 41.8827, longitude: -87.6338 },
      { venue_id: 'chi-riv-1', venue_name: 'Riverfront Hub', latitude: 41.8878, longitude: -87.6274 },
      { venue_id: 'chi-wl-1', venue_name: 'West Loop Office', latitude: 41.8820, longitude: -87.6467 },
      { venue_id: 'chi-mc-1', venue_name: 'Museum Campus Cowork', latitude: 41.8665, longitude: -87.6147 },
      { venue_id: 'chi-lp-1', venue_name: 'Lincoln Park Hub', latitude: 41.9244, longitude: -87.6477 },
    ],
  },
  {
    city: 'Dallas', state: 'TX', avgRatePerBooking: 195,
    venueCoords: [
      { venue_id: 'dal-dt-1', venue_name: 'Downtown Dallas Hub', latitude: 32.7767, longitude: -96.7970 },
      { venue_id: 'dal-up-1', venue_name: 'Uptown Workspace', latitude: 32.7986, longitude: -96.8050 },
      { venue_id: 'dal-fr-1', venue_name: 'Frisco Office Park', latitude: 33.1506, longitude: -96.8236 },
      { venue_id: 'dal-ad-1', venue_name: 'Addison Cowork', latitude: 32.9612, longitude: -96.8319 },
    ],
  },
  {
    city: 'San Francisco', state: 'CA', avgRatePerBooking: 280,
    venueCoords: [
      { venue_id: 'sf-soma-1', venue_name: 'SoMa Workspace', latitude: 37.7785, longitude: -122.3948 },
      { venue_id: 'sf-fin-1', venue_name: 'Financial District Hub', latitude: 37.7943, longitude: -122.3990 },
      { venue_id: 'sf-mis-1', venue_name: 'Mission Desk', latitude: 37.7599, longitude: -122.4148 },
      { venue_id: 'sf-dog-1', venue_name: 'Dogpatch Cowork', latitude: 37.7582, longitude: -122.3891 },
    ],
  },
  {
    city: 'Los Angeles', state: 'CA', avgRatePerBooking: 240,
    venueCoords: [
      { venue_id: 'la-dt-1', venue_name: 'DTLA Workspace', latitude: 34.0522, longitude: -118.2437 },
      { venue_id: 'la-sm-1', venue_name: 'Santa Monica Hub', latitude: 34.0195, longitude: -118.4912 },
      { venue_id: 'la-sl-1', venue_name: 'Silver Lake Desk', latitude: 34.0868, longitude: -118.2701 },
      { venue_id: 'la-cul-1', venue_name: 'Culver City Office', latitude: 34.0211, longitude: -118.3965 },
      { venue_id: 'la-pas-1', venue_name: 'Pasadena Cowork', latitude: 34.1478, longitude: -118.1445 },
    ],
  },
  {
    city: 'Boston', state: 'MA', avgRatePerBooking: 220,
    venueCoords: [
      { venue_id: 'bos-dx-1', venue_name: 'Downtown Crossing Hub', latitude: 42.3554, longitude: -71.0598 },
      { venue_id: 'bos-sea-1', venue_name: 'Seaport Workspace', latitude: 42.3519, longitude: -71.0449 },
      { venue_id: 'bos-ken-1', venue_name: 'Kendall Square Hub', latitude: 42.3626, longitude: -71.0844 },
      { venue_id: 'bos-bb-1', venue_name: 'Back Bay Office', latitude: 42.3482, longitude: -71.0788 },
    ],
  },
  {
    city: 'Seattle', state: 'WA', avgRatePerBooking: 230,
    venueCoords: [
      { venue_id: 'sea-slu-1', venue_name: 'South Lake Union Hub', latitude: 47.6261, longitude: -122.3401 },
      { venue_id: 'sea-cap-1', venue_name: 'Capitol Hill Workspace', latitude: 47.6253, longitude: -122.3140 },
      { venue_id: 'sea-bel-1', venue_name: 'Bellevue Office', latitude: 47.6101, longitude: -122.2015 },
      { venue_id: 'sea-fre-1', venue_name: 'Fremont Cowork', latitude: 47.6521, longitude: -122.3495 },
    ],
  },
  {
    city: 'Denver', state: 'CO', avgRatePerBooking: 185,
    venueCoords: [
      { venue_id: 'den-lo-1', venue_name: 'LoDo Workspace', latitude: 39.7546, longitude: -104.9988 },
      { venue_id: 'den-rino-1', venue_name: 'RiNo Hub', latitude: 39.7679, longitude: -104.9765 },
      { venue_id: 'den-cc-1', venue_name: 'Cherry Creek Office', latitude: 39.7178, longitude: -104.9628 },
      { venue_id: 'den-gv-1', venue_name: 'Greenwood Village Cowork', latitude: 39.6197, longitude: -104.8907 },
    ],
  },
  {
    city: 'Miami', state: 'FL', avgRatePerBooking: 200,
    venueCoords: [
      { venue_id: 'mia-bk-1', venue_name: 'Brickell Workspace', latitude: 25.7617, longitude: -80.1918 },
      { venue_id: 'mia-wyn-1', venue_name: 'Wynwood Hub', latitude: 25.8013, longitude: -80.1981 },
      { venue_id: 'mia-mb-1', venue_name: 'Miami Beach Office', latitude: 25.7907, longitude: -80.1300 },
      { venue_id: 'mia-cg-1', venue_name: 'Coral Gables Cowork', latitude: 25.7215, longitude: -80.2685 },
    ],
  },
  {
    city: 'Washington', state: 'DC', avgRatePerBooking: 245,
    venueCoords: [
      { venue_id: 'dc-pq-1', venue_name: 'Penn Quarter Hub', latitude: 38.8951, longitude: -77.0264 },
      { venue_id: 'dc-dup-1', venue_name: 'Dupont Circle Workspace', latitude: 38.9096, longitude: -77.0434 },
      { venue_id: 'dc-ros-1', venue_name: 'Rosslyn Office', latitude: 38.8942, longitude: -77.0743 },
      { venue_id: 'dc-ty-1', venue_name: 'Tysons Corner Cowork', latitude: 38.9209, longitude: -77.2274 },
    ],
  },
  {
    city: 'Minneapolis', state: 'MN', avgRatePerBooking: 160,
    venueCoords: [
      { venue_id: 'msp-dt-1', venue_name: 'Downtown Minneapolis Hub', latitude: 44.9778, longitude: -93.2650 },
      { venue_id: 'msp-nl-1', venue_name: 'North Loop Workspace', latitude: 44.9897, longitude: -93.2751 },
      { venue_id: 'msp-up-1', venue_name: 'Uptown Office', latitude: 44.9484, longitude: -93.2991 },
    ],
  },
  {
    city: 'Phoenix', state: 'AZ', avgRatePerBooking: 170,
    venueCoords: [
      { venue_id: 'phx-dt-1', venue_name: 'Downtown Phoenix Hub', latitude: 33.4484, longitude: -112.0740 },
      { venue_id: 'phx-tem-1', venue_name: 'Tempe Workspace', latitude: 33.4255, longitude: -111.9400 },
      { venue_id: 'phx-sco-1', venue_name: 'Scottsdale Office', latitude: 33.4942, longitude: -111.9261 },
    ],
  },
  {
    city: 'Charlotte', state: 'NC', avgRatePerBooking: 180,
    venueCoords: [
      { venue_id: 'clt-up-1', venue_name: 'Uptown Charlotte Hub', latitude: 35.2271, longitude: -80.8431 },
      { venue_id: 'clt-mt-1', venue_name: 'Midtown Workspace', latitude: 35.2154, longitude: -80.8357 },
      { venue_id: 'clt-bp-1', venue_name: 'Ballantyne Office', latitude: 35.0526, longitude: -80.8487 },
    ],
  },
  {
    city: 'Nashville', state: 'TN', avgRatePerBooking: 190,
    venueCoords: [
      { venue_id: 'bna-dt-1', venue_name: 'Downtown Nashville Hub', latitude: 36.1627, longitude: -86.7816 },
      { venue_id: 'bna-mid-1', venue_name: 'Midtown Workspace', latitude: 36.1563, longitude: -86.7942 },
      { venue_id: 'bna-ger-1', venue_name: 'Germantown Office', latitude: 36.1758, longitude: -86.7946 },
    ],
  },
  {
    city: 'Portland', state: 'OR', avgRatePerBooking: 205,
    venueCoords: [
      { venue_id: 'pdx-prl-1', venue_name: 'Pearl District Hub', latitude: 45.5232, longitude: -122.6819 },
      { venue_id: 'pdx-se-1', venue_name: 'SE Portland Workspace', latitude: 45.5122, longitude: -122.6528 },
      { venue_id: 'pdx-ll-1', venue_name: 'Lloyd District Office', latitude: 45.5302, longitude: -122.6513 },
    ],
  },
  {
    city: 'San Diego', state: 'CA', avgRatePerBooking: 225,
    venueCoords: [
      { venue_id: 'san-dt-1', venue_name: 'Downtown San Diego Hub', latitude: 32.7157, longitude: -117.1611 },
      { venue_id: 'san-sv-1', venue_name: 'Sorrento Valley Office', latitude: 32.8920, longitude: -117.1975 },
      { venue_id: 'san-utc-1', venue_name: 'UTC Workspace', latitude: 32.8700, longitude: -117.2121 },
    ],
  },
  {
    city: 'Raleigh', state: 'NC', avgRatePerBooking: 175,
    venueCoords: [
      { venue_id: 'rdu-dt-1', venue_name: 'Downtown Raleigh Hub', latitude: 35.7796, longitude: -78.6382 },
      { venue_id: 'rdu-rt-1', venue_name: 'Research Triangle Workspace', latitude: 35.9132, longitude: -79.0558 },
      { venue_id: 'rdu-cy-1', venue_name: 'Cary Office', latitude: 35.7915, longitude: -78.7811 },
    ],
  },
  {
    city: 'Salt Lake City', state: 'UT', avgRatePerBooking: 165,
    venueCoords: [
      { venue_id: 'slc-dt-1', venue_name: 'Downtown SLC Hub', latitude: 40.7608, longitude: -111.8910 },
      { venue_id: 'slc-ss-1', venue_name: 'Silicon Slopes Workspace', latitude: 40.5649, longitude: -111.8389 },
      { venue_id: 'slc-md-1', venue_name: 'Medical District Office', latitude: 40.7690, longitude: -111.8587 },
    ],
  },
  {
    city: 'Tampa', state: 'FL', avgRatePerBooking: 175,
    venueCoords: [
      { venue_id: 'tpa-dt-1', venue_name: 'Downtown Tampa Hub', latitude: 27.9506, longitude: -82.4572 },
      { venue_id: 'tpa-st-1', venue_name: 'South Tampa Workspace', latitude: 27.9208, longitude: -82.4794 },
      { venue_id: 'tpa-ws-1', venue_name: 'Westshore Office', latitude: 27.9584, longitude: -82.5095 },
    ],
  },
  {
    city: 'Kansas City', state: 'MO', avgRatePerBooking: 145,
    venueCoords: [
      { venue_id: 'kc-pl-1', venue_name: 'Power & Light Hub', latitude: 39.0997, longitude: -94.5786 },
      { venue_id: 'kc-op-1', venue_name: 'Overland Park Workspace', latitude: 38.9822, longitude: -94.6708 },
      { venue_id: 'kc-ccp-1', venue_name: 'Country Club Plaza Office', latitude: 39.0373, longitude: -94.5930 },
    ],
  },
  {
    city: 'Indianapolis', state: 'IN', avgRatePerBooking: 150,
    venueCoords: [
      { venue_id: 'ind-dt-1', venue_name: 'Downtown Indy Hub', latitude: 39.7684, longitude: -86.1581 },
      { venue_id: 'ind-mk-1', venue_name: 'Meridian-Kessler Workspace', latitude: 39.8238, longitude: -86.1566 },
      { venue_id: 'ind-car-1', venue_name: 'Carmel Office', latitude: 39.9784, longitude: -86.1180 },
    ],
  },
  {
    city: 'Columbus', state: 'OH', avgRatePerBooking: 155,
    venueCoords: [
      { venue_id: 'cmh-sn-1', venue_name: 'Short North Hub', latitude: 39.9832, longitude: -83.0043 },
      { venue_id: 'cmh-eas-1', venue_name: 'Easton Workspace', latitude: 40.0521, longitude: -82.9124 },
      { venue_id: 'cmh-per-1', venue_name: 'Perimeter Office', latitude: 40.0149, longitude: -82.9074 },
    ],
  },
]

export function getMarketData(city: string, state: string): MarketPlatformData | null {
  return (
    PLATFORM_MARKETS.find(
      m =>
        m.city.toLowerCase() === city.toLowerCase() &&
        m.state.toLowerCase() === state.toLowerCase()
    ) ?? null
  )
}

// DOW multipliers: Sun, Mon, Tue, Wed, Thu, Fri, Sat
const DOW_WEIGHTS = [0.04, 1.28, 1.38, 1.10, 1.20, 0.85, 0.04]

// Monthly seasonal index (Jan=0 through Dec=11)
const MONTH_FACTORS = [0.82, 0.88, 1.02, 1.08, 1.05, 0.98, 0.75, 0.88, 1.05, 1.10, 0.95, 0.72]

/**
 * Generate a synthetic 365-day demand series from annual spend + avg rate per booking.
 * Uses deterministic noise (sin-based) so the same inputs always produce the same output.
 */
export function generateIntakeDemand(
  annualSpend: number,
  avgRatePerBooking: number
): Array<{ day: string; bookings: number; spend: number }> {
  const annualBookings = annualSpend / avgRatePerBooking
  const start = new Date('2024-01-01')

  // Compute raw weights for all 365 days
  const rawWeights: number[] = []
  for (let i = 0; i < 365; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    rawWeights.push(DOW_WEIGHTS[d.getDay()] * MONTH_FACTORS[d.getMonth()])
  }
  const weightSum = rawWeights.reduce((a, b) => a + b, 0)
  const scale = annualBookings / weightSum

  return rawWeights.map((w, i) => {
    const d = new Date(start.getTime() + i * 86400000)
    // Deterministic ±15% noise via sine — avoids true randomness for reproducibility
    const noise = 0.85 + ((Math.sin(i * 2.3 + 7) + 1) / 2) * 0.30
    const bookings = Math.max(0, Math.round(w * scale * noise))
    return {
      day: d.toISOString().split('T')[0],
      bookings,
      spend: Math.round(bookings * avgRatePerBooking),
    }
  })
}
