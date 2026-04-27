/** Platform-wide stats for Prospect Mode UI.
 *  These are plain constants — safe to import in both server and client components. */
export const PLATFORM_STATS = {
  totalEnterprises: 123,
  totalBookings: 107555,
  totalSpend: 21667148,
  totalMembers: 9215,
  totalVenues: 4772,
  marketsWithData: 50,
}

/** Per-enterprise count for each prospect market (for the banner label). */
const PROSPECT_ENTERPRISE_COUNTS: Record<string, number> = {
  'New York-NY':      70,
  'Chicago-IL':       57,
  'San Francisco-CA': 52,
  'Austin-TX':        50,
  'Boston-MA':        48,
  'Denver-CO':        46,
  'Washington-DC':    45,
  'Los Angeles-CA':   43,
  'San Diego-CA':     42,
  'Atlanta-GA':       41,
  'Seattle-WA':       39,
  'Philadelphia-PA':  40,
  'Dallas-TX':        36,
  'Miami-FL':         35,
  'Charlotte-NC':     34,
}

export function getProspectEnterpriseCount(city: string, state: string): number {
  return PROSPECT_ENTERPRISE_COUNTS[`${city}-${state}`] ?? 0
}
