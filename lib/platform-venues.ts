// Server-safe module — used in intake API route only

export interface PlatformVenueCoord {
  venue_id: string
  venue_name: string
  latitude: number
  longitude: number
}

export interface MarketPlatformData {
  city: string
  /**
   * US state code for domestic markets (e.g. 'NY').
   * Country name for international markets (e.g. 'United Kingdom').
   */
  state: string
  /** Explicit country. 'US' for domestic; country name for international. */
  country: string
  avgRatePerBooking: number // platform avg $ per booking in this market (USD)
  venueCoords: PlatformVenueCoord[]
}

// Per-market rates derived from platform Parquet aggregates.
// Venue coordinates represent major coworking districts in each metro.
export const PLATFORM_MARKETS: MarketPlatformData[] = [
  // ── US markets ──────────────────────────────────────────────────────────────
  {
    city: 'New York', state: 'NY', country: 'US', avgRatePerBooking: 153,
    venueCoords: [
      { venue_id: 'ny-mid-1', venue_name: 'Midtown Workspace', latitude: 40.7549, longitude: -73.9840 },
      { venue_id: 'ny-fid-1', venue_name: 'FiDi Cowork', latitude: 40.7074, longitude: -74.0113 },
      { venue_id: 'ny-bkn-1', venue_name: 'Brooklyn Creative', latitude: 40.6892, longitude: -73.9442 },
      { venue_id: 'ny-som-1', venue_name: 'SoMa Hub', latitude: 40.7230, longitude: -74.0030 },
      { venue_id: 'ny-hud-1', venue_name: 'Hudson Yards Office', latitude: 40.7527, longitude: -74.0015 },
    ],
  },
  {
    city: 'Austin', state: 'TX', country: 'US', avgRatePerBooking: 210,
    venueCoords: [
      { venue_id: 'au-dt-1', venue_name: 'Downtown Austin Hub', latitude: 30.2672, longitude: -97.7431 },
      { venue_id: 'au-6th-1', venue_name: '6th Street Workspace', latitude: 30.2649, longitude: -97.7341 },
      { venue_id: 'au-dom-1', venue_name: 'Domain Cowork', latitude: 30.4015, longitude: -97.7227 },
      { venue_id: 'au-sl-1', venue_name: 'South Lamar Office', latitude: 30.2512, longitude: -97.7592 },
    ],
  },
  {
    city: 'Atlanta', state: 'GA', country: 'US', avgRatePerBooking: 313,
    venueCoords: [
      { venue_id: 'atl-mid-1', venue_name: 'Midtown Atlanta Hub', latitude: 33.7850, longitude: -84.3840 },
      { venue_id: 'atl-bkh-1', venue_name: 'Buckhead Office', latitude: 33.8370, longitude: -84.3640 },
      { venue_id: 'atl-dt-1', venue_name: 'Downtown Atlanta', latitude: 33.7490, longitude: -84.3880 },
      { venue_id: 'atl-vg-1', venue_name: 'Virginia-Highland Cowork', latitude: 33.7810, longitude: -84.3520 },
    ],
  },
  {
    city: 'Chicago', state: 'IL', country: 'US', avgRatePerBooking: 175,
    venueCoords: [
      { venue_id: 'chi-loop-1', venue_name: 'The Loop Workspace', latitude: 41.8827, longitude: -87.6338 },
      { venue_id: 'chi-riv-1', venue_name: 'Riverfront Hub', latitude: 41.8878, longitude: -87.6274 },
      { venue_id: 'chi-wl-1', venue_name: 'West Loop Office', latitude: 41.8820, longitude: -87.6467 },
      { venue_id: 'chi-mc-1', venue_name: 'Museum Campus Cowork', latitude: 41.8665, longitude: -87.6147 },
      { venue_id: 'chi-lp-1', venue_name: 'Lincoln Park Hub', latitude: 41.9244, longitude: -87.6477 },
    ],
  },
  {
    city: 'Dallas', state: 'TX', country: 'US', avgRatePerBooking: 195,
    venueCoords: [
      { venue_id: 'dal-dt-1', venue_name: 'Downtown Dallas Hub', latitude: 32.7767, longitude: -96.7970 },
      { venue_id: 'dal-up-1', venue_name: 'Uptown Workspace', latitude: 32.7986, longitude: -96.8050 },
      { venue_id: 'dal-fr-1', venue_name: 'Frisco Office Park', latitude: 33.1506, longitude: -96.8236 },
      { venue_id: 'dal-ad-1', venue_name: 'Addison Cowork', latitude: 32.9612, longitude: -96.8319 },
    ],
  },
  {
    city: 'San Francisco', state: 'CA', country: 'US', avgRatePerBooking: 280,
    venueCoords: [
      { venue_id: 'sf-soma-1', venue_name: 'SoMa Workspace', latitude: 37.7785, longitude: -122.3948 },
      { venue_id: 'sf-fin-1', venue_name: 'Financial District Hub', latitude: 37.7943, longitude: -122.3990 },
      { venue_id: 'sf-mis-1', venue_name: 'Mission Desk', latitude: 37.7599, longitude: -122.4148 },
      { venue_id: 'sf-dog-1', venue_name: 'Dogpatch Cowork', latitude: 37.7582, longitude: -122.3891 },
    ],
  },
  {
    city: 'Los Angeles', state: 'CA', country: 'US', avgRatePerBooking: 240,
    venueCoords: [
      { venue_id: 'la-dt-1', venue_name: 'DTLA Workspace', latitude: 34.0522, longitude: -118.2437 },
      { venue_id: 'la-sm-1', venue_name: 'Santa Monica Hub', latitude: 34.0195, longitude: -118.4912 },
      { venue_id: 'la-sl-1', venue_name: 'Silver Lake Desk', latitude: 34.0868, longitude: -118.2701 },
      { venue_id: 'la-cul-1', venue_name: 'Culver City Office', latitude: 34.0211, longitude: -118.3965 },
      { venue_id: 'la-pas-1', venue_name: 'Pasadena Cowork', latitude: 34.1478, longitude: -118.1445 },
    ],
  },
  {
    city: 'Boston', state: 'MA', country: 'US', avgRatePerBooking: 220,
    venueCoords: [
      { venue_id: 'bos-dx-1', venue_name: 'Downtown Crossing Hub', latitude: 42.3554, longitude: -71.0598 },
      { venue_id: 'bos-sea-1', venue_name: 'Seaport Workspace', latitude: 42.3519, longitude: -71.0449 },
      { venue_id: 'bos-ken-1', venue_name: 'Kendall Square Hub', latitude: 42.3626, longitude: -71.0844 },
      { venue_id: 'bos-bb-1', venue_name: 'Back Bay Office', latitude: 42.3482, longitude: -71.0788 },
    ],
  },
  {
    city: 'Seattle', state: 'WA', country: 'US', avgRatePerBooking: 230,
    venueCoords: [
      { venue_id: 'sea-slu-1', venue_name: 'South Lake Union Hub', latitude: 47.6261, longitude: -122.3401 },
      { venue_id: 'sea-cap-1', venue_name: 'Capitol Hill Workspace', latitude: 47.6253, longitude: -122.3140 },
      { venue_id: 'sea-bel-1', venue_name: 'Bellevue Office', latitude: 47.6101, longitude: -122.2015 },
      { venue_id: 'sea-fre-1', venue_name: 'Fremont Cowork', latitude: 47.6521, longitude: -122.3495 },
    ],
  },
  {
    city: 'Denver', state: 'CO', country: 'US', avgRatePerBooking: 185,
    venueCoords: [
      { venue_id: 'den-lo-1', venue_name: 'LoDo Workspace', latitude: 39.7546, longitude: -104.9988 },
      { venue_id: 'den-rino-1', venue_name: 'RiNo Hub', latitude: 39.7679, longitude: -104.9765 },
      { venue_id: 'den-cc-1', venue_name: 'Cherry Creek Office', latitude: 39.7178, longitude: -104.9628 },
      { venue_id: 'den-gv-1', venue_name: 'Greenwood Village Cowork', latitude: 39.6197, longitude: -104.8907 },
    ],
  },
  {
    city: 'Miami', state: 'FL', country: 'US', avgRatePerBooking: 200,
    venueCoords: [
      { venue_id: 'mia-bk-1', venue_name: 'Brickell Workspace', latitude: 25.7617, longitude: -80.1918 },
      { venue_id: 'mia-wyn-1', venue_name: 'Wynwood Hub', latitude: 25.8013, longitude: -80.1981 },
      { venue_id: 'mia-mb-1', venue_name: 'Miami Beach Office', latitude: 25.7907, longitude: -80.1300 },
      { venue_id: 'mia-cg-1', venue_name: 'Coral Gables Cowork', latitude: 25.7215, longitude: -80.2685 },
    ],
  },
  {
    city: 'Washington', state: 'DC', country: 'US', avgRatePerBooking: 245,
    venueCoords: [
      { venue_id: 'dc-pq-1', venue_name: 'Penn Quarter Hub', latitude: 38.8951, longitude: -77.0264 },
      { venue_id: 'dc-dup-1', venue_name: 'Dupont Circle Workspace', latitude: 38.9096, longitude: -77.0434 },
      { venue_id: 'dc-ros-1', venue_name: 'Rosslyn Office', latitude: 38.8942, longitude: -77.0743 },
      { venue_id: 'dc-ty-1', venue_name: 'Tysons Corner Cowork', latitude: 38.9209, longitude: -77.2274 },
    ],
  },
  {
    city: 'Minneapolis', state: 'MN', country: 'US', avgRatePerBooking: 160,
    venueCoords: [
      { venue_id: 'msp-dt-1', venue_name: 'Downtown Minneapolis Hub', latitude: 44.9778, longitude: -93.2650 },
      { venue_id: 'msp-nl-1', venue_name: 'North Loop Workspace', latitude: 44.9897, longitude: -93.2751 },
      { venue_id: 'msp-up-1', venue_name: 'Uptown Office', latitude: 44.9484, longitude: -93.2991 },
    ],
  },
  {
    city: 'Phoenix', state: 'AZ', country: 'US', avgRatePerBooking: 170,
    venueCoords: [
      { venue_id: 'phx-dt-1', venue_name: 'Downtown Phoenix Hub', latitude: 33.4484, longitude: -112.0740 },
      { venue_id: 'phx-tem-1', venue_name: 'Tempe Workspace', latitude: 33.4255, longitude: -111.9400 },
      { venue_id: 'phx-sco-1', venue_name: 'Scottsdale Office', latitude: 33.4942, longitude: -111.9261 },
    ],
  },
  {
    city: 'Charlotte', state: 'NC', country: 'US', avgRatePerBooking: 180,
    venueCoords: [
      { venue_id: 'clt-up-1', venue_name: 'Uptown Charlotte Hub', latitude: 35.2271, longitude: -80.8431 },
      { venue_id: 'clt-mt-1', venue_name: 'Midtown Workspace', latitude: 35.2154, longitude: -80.8357 },
      { venue_id: 'clt-bp-1', venue_name: 'Ballantyne Office', latitude: 35.0526, longitude: -80.8487 },
    ],
  },
  {
    city: 'Nashville', state: 'TN', country: 'US', avgRatePerBooking: 190,
    venueCoords: [
      { venue_id: 'bna-dt-1', venue_name: 'Downtown Nashville Hub', latitude: 36.1627, longitude: -86.7816 },
      { venue_id: 'bna-mid-1', venue_name: 'Midtown Workspace', latitude: 36.1563, longitude: -86.7942 },
      { venue_id: 'bna-ger-1', venue_name: 'Germantown Office', latitude: 36.1758, longitude: -86.7946 },
    ],
  },
  {
    city: 'Portland', state: 'OR', country: 'US', avgRatePerBooking: 205,
    venueCoords: [
      { venue_id: 'pdx-prl-1', venue_name: 'Pearl District Hub', latitude: 45.5232, longitude: -122.6819 },
      { venue_id: 'pdx-se-1', venue_name: 'SE Portland Workspace', latitude: 45.5122, longitude: -122.6528 },
      { venue_id: 'pdx-ll-1', venue_name: 'Lloyd District Office', latitude: 45.5302, longitude: -122.6513 },
    ],
  },
  {
    city: 'San Diego', state: 'CA', country: 'US', avgRatePerBooking: 225,
    venueCoords: [
      { venue_id: 'san-dt-1', venue_name: 'Downtown San Diego Hub', latitude: 32.7157, longitude: -117.1611 },
      { venue_id: 'san-sv-1', venue_name: 'Sorrento Valley Office', latitude: 32.8920, longitude: -117.1975 },
      { venue_id: 'san-utc-1', venue_name: 'UTC Workspace', latitude: 32.8700, longitude: -117.2121 },
    ],
  },
  {
    city: 'Raleigh', state: 'NC', country: 'US', avgRatePerBooking: 175,
    venueCoords: [
      { venue_id: 'rdu-dt-1', venue_name: 'Downtown Raleigh Hub', latitude: 35.7796, longitude: -78.6382 },
      { venue_id: 'rdu-rt-1', venue_name: 'Research Triangle Workspace', latitude: 35.9132, longitude: -79.0558 },
      { venue_id: 'rdu-cy-1', venue_name: 'Cary Office', latitude: 35.7915, longitude: -78.7811 },
    ],
  },
  {
    city: 'Salt Lake City', state: 'UT', country: 'US', avgRatePerBooking: 165,
    venueCoords: [
      { venue_id: 'slc-dt-1', venue_name: 'Downtown SLC Hub', latitude: 40.7608, longitude: -111.8910 },
      { venue_id: 'slc-ss-1', venue_name: 'Silicon Slopes Workspace', latitude: 40.5649, longitude: -111.8389 },
      { venue_id: 'slc-md-1', venue_name: 'Medical District Office', latitude: 40.7690, longitude: -111.8587 },
    ],
  },
  {
    city: 'Tampa', state: 'FL', country: 'US', avgRatePerBooking: 175,
    venueCoords: [
      { venue_id: 'tpa-dt-1', venue_name: 'Downtown Tampa Hub', latitude: 27.9506, longitude: -82.4572 },
      { venue_id: 'tpa-st-1', venue_name: 'South Tampa Workspace', latitude: 27.9208, longitude: -82.4794 },
      { venue_id: 'tpa-ws-1', venue_name: 'Westshore Office', latitude: 27.9584, longitude: -82.5095 },
    ],
  },
  {
    city: 'Kansas City', state: 'MO', country: 'US', avgRatePerBooking: 145,
    venueCoords: [
      { venue_id: 'kc-pl-1', venue_name: 'Power & Light Hub', latitude: 39.0997, longitude: -94.5786 },
      { venue_id: 'kc-op-1', venue_name: 'Overland Park Workspace', latitude: 38.9822, longitude: -94.6708 },
      { venue_id: 'kc-ccp-1', venue_name: 'Country Club Plaza Office', latitude: 39.0373, longitude: -94.5930 },
    ],
  },
  {
    city: 'Indianapolis', state: 'IN', country: 'US', avgRatePerBooking: 150,
    venueCoords: [
      { venue_id: 'ind-dt-1', venue_name: 'Downtown Indy Hub', latitude: 39.7684, longitude: -86.1581 },
      { venue_id: 'ind-mk-1', venue_name: 'Meridian-Kessler Workspace', latitude: 39.8238, longitude: -86.1566 },
      { venue_id: 'ind-car-1', venue_name: 'Carmel Office', latitude: 39.9784, longitude: -86.1180 },
    ],
  },
  {
    city: 'Columbus', state: 'OH', country: 'US', avgRatePerBooking: 155,
    venueCoords: [
      { venue_id: 'cmh-sn-1', venue_name: 'Short North Hub', latitude: 39.9832, longitude: -83.0043 },
      { venue_id: 'cmh-eas-1', venue_name: 'Easton Workspace', latitude: 40.0521, longitude: -82.9124 },
      { venue_id: 'cmh-per-1', venue_name: 'Perimeter Office', latitude: 40.0149, longitude: -82.9074 },
    ],
  },

  // ── International markets ────────────────────────────────────────────────────
  // avgRatePerBooking is in USD (DiscountedPriceUSD already normalized in Parquet).
  // Venue coordinates represent major coworking districts in each city.
  {
    city: 'London', state: 'United Kingdom', country: 'United Kingdom', avgRatePerBooking: 188,
    venueCoords: [
      { venue_id: 'lon-cw-1', venue_name: 'Canary Wharf Workspace', latitude: 51.5054, longitude: -0.0235 },
      { venue_id: 'lon-ec-1', venue_name: 'City of London Hub', latitude: 51.5155, longitude: -0.0922 },
      { venue_id: 'lon-ols-1', venue_name: 'Old Street Cowork', latitude: 51.5263, longitude: -0.0790 },
      { venue_id: 'lon-soh-1', venue_name: 'Soho Creative Office', latitude: 51.5135, longitude: -0.1341 },
      { venue_id: 'lon-vic-1', venue_name: 'Victoria Business Hub', latitude: 51.4963, longitude: -0.1437 },
    ],
  },
  {
    city: 'Toronto', state: 'Canada', country: 'Canada', avgRatePerBooking: 132,
    venueCoords: [
      { venue_id: 'tor-fin-1', venue_name: 'Financial District Hub', latitude: 43.6490, longitude: -79.3852 },
      { venue_id: 'tor-kw-1', venue_name: 'King West Workspace', latitude: 43.6445, longitude: -79.4018 },
      { venue_id: 'tor-yk-1', venue_name: 'Yorkville Office', latitude: 43.6688, longitude: -79.3945 },
      { venue_id: 'tor-lv-1', venue_name: 'Liberty Village Cowork', latitude: 43.6367, longitude: -79.4194 },
    ],
  },
  {
    city: 'Sydney', state: 'Australia', country: 'Australia', avgRatePerBooking: 141,
    venueCoords: [
      { venue_id: 'syd-cbd-1', venue_name: 'Sydney CBD Hub', latitude: -33.8688, longitude: 151.2093 },
      { venue_id: 'syd-pyr-1', venue_name: 'Pyrmont Workspace', latitude: -33.8701, longitude: 151.1967 },
      { venue_id: 'syd-sur-1', venue_name: 'Surry Hills Office', latitude: -33.8863, longitude: 151.2094 },
      { venue_id: 'syd-nth-1', venue_name: 'North Sydney Cowork', latitude: -33.8390, longitude: 151.2065 },
    ],
  },
  {
    city: 'Melbourne', state: 'Australia', country: 'Australia', avgRatePerBooking: 128,
    venueCoords: [
      { venue_id: 'mel-cbd-1', venue_name: 'Melbourne CBD Hub', latitude: -37.8136, longitude: 144.9631 },
      { venue_id: 'mel-soy-1', venue_name: 'South Yarra Workspace', latitude: -37.8355, longitude: 144.9869 },
      { venue_id: 'mel-fit-1', venue_name: 'Fitzroy Cowork', latitude: -37.8002, longitude: 144.9781 },
    ],
  },
  {
    city: 'Amsterdam', state: 'Netherlands', country: 'Netherlands', avgRatePerBooking: 162,
    venueCoords: [
      { venue_id: 'ams-cen-1', venue_name: 'Centrum Workspace', latitude: 52.3676, longitude: 4.9041 },
      { venue_id: 'ams-zui-1', venue_name: 'Zuidas Business Hub', latitude: 52.3354, longitude: 4.8772 },
      { venue_id: 'ams-wp-1', venue_name: 'Westerpark Office', latitude: 52.3841, longitude: 4.8777 },
    ],
  },
  {
    city: 'Berlin', state: 'Germany', country: 'Germany', avgRatePerBooking: 138,
    venueCoords: [
      { venue_id: 'ber-mit-1', venue_name: 'Mitte Cowork', latitude: 52.5200, longitude: 13.4050 },
      { venue_id: 'ber-kxb-1', venue_name: 'Kreuzberg Hub', latitude: 52.4990, longitude: 13.4069 },
      { venue_id: 'ber-prb-1', venue_name: 'Prenzlauer Berg Office', latitude: 52.5389, longitude: 13.4157 },
      { venue_id: 'ber-sch-1', venue_name: 'Schöneberg Workspace', latitude: 52.4878, longitude: 13.3650 },
    ],
  },
  {
    city: 'Paris', state: 'France', country: 'France', avgRatePerBooking: 178,
    venueCoords: [
      { venue_id: 'par-mar-1', venue_name: 'Le Marais Hub', latitude: 48.8641, longitude: 2.3488 },
      { venue_id: 'par-def-1', venue_name: 'La Défense Office', latitude: 48.8915, longitude: 2.2384 },
      { venue_id: 'par-8e-1', venue_name: '8ème Arrondissement Cowork', latitude: 48.8752, longitude: 2.2945 },
      { venue_id: 'par-11-1', venue_name: 'Oberkampf Workspace', latitude: 48.8641, longitude: 2.3677 },
    ],
  },
  {
    city: 'Singapore', state: 'Singapore', country: 'Singapore', avgRatePerBooking: 152,
    venueCoords: [
      { venue_id: 'sgp-cbd-1', venue_name: 'Raffles Place Hub', latitude: 1.2830, longitude: 103.8515 },
      { venue_id: 'sgp-mb-1', venue_name: 'Marina Bay Office', latitude: 1.2789, longitude: 103.8536 },
      { venue_id: 'sgp-on-1', venue_name: 'One-North Workspace', latitude: 1.2990, longitude: 103.7876 },
      { venue_id: 'sgp-orc-1', venue_name: 'Orchard Cowork', latitude: 1.3048, longitude: 103.8318 },
    ],
  },
  {
    city: 'Dublin', state: 'Ireland', country: 'Ireland', avgRatePerBooking: 165,
    venueCoords: [
      { venue_id: 'dub-dck-1', venue_name: 'Docklands Hub', latitude: 53.3498, longitude: -6.2441 },
      { venue_id: 'dub-d2-1', venue_name: 'City Centre Workspace', latitude: 53.3461, longitude: -6.2578 },
      { venue_id: 'dub-sil-1', venue_name: 'Silicon Docks Office', latitude: 53.3465, longitude: -6.2386 },
    ],
  },
  {
    city: 'Tokyo', state: 'Japan', country: 'Japan', avgRatePerBooking: 124,
    venueCoords: [
      { venue_id: 'tky-shn-1', venue_name: 'Shinjuku Hub', latitude: 35.6938, longitude: 139.7036 },
      { venue_id: 'tky-shb-1', venue_name: 'Shibuya Workspace', latitude: 35.6598, longitude: 139.7006 },
      { venue_id: 'tky-mrn-1', venue_name: 'Marunouchi Office', latitude: 35.6812, longitude: 139.7671 },
      { venue_id: 'tky-akb-1', venue_name: 'Akihabara Cowork', latitude: 35.7022, longitude: 139.7742 },
    ],
  },
  {
    city: 'Madrid', state: 'Spain', country: 'Spain', avgRatePerBooking: 148,
    venueCoords: [
      { venue_id: 'mad-col-1', venue_name: 'Castellana Hub', latitude: 40.4168, longitude: -3.6900 },
      { venue_id: 'mad-cen-1', venue_name: 'Centro Cowork', latitude: 40.4155, longitude: -3.7075 },
      { venue_id: 'mad-sla-1', venue_name: 'Salamanca Workspace', latitude: 40.4320, longitude: -3.6825 },
    ],
  },
  {
    city: 'Barcelona', state: 'Spain', country: 'Spain', avgRatePerBooking: 143,
    venueCoords: [
      { venue_id: 'bcn-22-1', venue_name: '22@ Innovation Hub', latitude: 41.4036, longitude: 2.1944 },
      { venue_id: 'bcn-exa-1', venue_name: 'Eixample Workspace', latitude: 41.3918, longitude: 2.1610 },
      { venue_id: 'bcn-gra-1', venue_name: 'Gràcia Cowork', latitude: 41.4019, longitude: 2.1569 },
    ],
  },
]

/** US state codes — used to detect domestic vs. international markets */
export const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

/**
 * Maps ISO 3166-1 alpha-2 country codes (as stored in Parquet) → full country names.
 * Full names are used in URLs and MetroSummary.state for international markets
 * to avoid conflicts with US state codes (e.g. CA = California vs Canada).
 */
export const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  NL: 'Netherlands',
  CA: 'Canada',
  MY: 'Malaysia',
  CH: 'Switzerland',
  DE: 'Germany',
  GB: 'United Kingdom',
  UK: 'United Kingdom',   // some Parquet records use UK instead of GB
  AU: 'Australia',
  FR: 'France',
  SG: 'Singapore',
  JP: 'Japan',
  IE: 'Ireland',
  ES: 'Spain',
  SE: 'Sweden',
  BE: 'Belgium',
  SI: 'Slovenia',
  IN: 'India',
  MX: 'Mexico',
  BR: 'Brazil',
  ZA: 'South Africa',
  PH: 'Philippines',
  ID: 'Indonesia',
  PL: 'Poland',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
  PT: 'Portugal',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  AT: 'Austria',
  NZ: 'New Zealand',
  IL: 'Israel',
  AE: 'UAE',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  KR: 'South Korea',
  TH: 'Thailand',
  VN: 'Vietnam',
}

/** Reverse lookup: full country name → ISO code (for Parquet queries) */
export const COUNTRY_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODE_TO_NAME)
    .filter(([code]) => code !== 'UK')  // deduplicate — GB is canonical
    .map(([code, name]) => [name, code])
)

/**
 * Returns true when state param is a US state or DC postal code.
 * Country names ('Netherlands', 'Canada', etc.) are always false.
 * Note: even though 'CA' is both California and Canada's ISO code, we
 * never use ISO codes as URL params — we use full country names instead.
 */
export function isUSMarket(state: string): boolean {
  return US_STATE_CODES.has(state.toUpperCase())
}

/**
 * Given a country name as used in URLs/MetroSummary.state,
 * returns the ISO code needed for Parquet WHERE Country = '...' filters.
 * Returns 'US' for US markets.
 */
export function countryNameToCode(countryName: string): string {
  if (countryName === 'US') return 'US'
  return COUNTRY_NAME_TO_CODE[countryName] ?? countryName
}

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
