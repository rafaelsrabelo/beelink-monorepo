/**
 * The panel menu's counts (BEELINK-309): one key a shop. The menu and the bell both read it, so
 * the two share one request and one answer — and whatever moves a count invalidates this alone.
 */
export const panelCountsKeys = {
  all: ["panel-counts"] as const,
  shop: (slug: string) => [...panelCountsKeys.all, slug] as const,
}
