/* ── reports: what a shop sold, read back in groups ───────────────────────── */

/**
 * What a line of "sales by origin" (BEELINK-275) groups:
 * - `CAMPAIGN`: orders placed from the cart whose buyer arrived by a link with campaign labels, or
 *   by a click on a Meta ad that was kept — grouped by source, medium and campaign as stored;
 * - `DIRECT`: orders placed from the cart with neither — a direct visit, and every order placed
 *   before origins were kept, which nothing tells apart;
 * - `PANEL`: sales the shopkeeper registered in the panel, which never came through the site.
 */
export type SalesOriginKind = "CAMPAIGN" | "DIRECT" | "PANEL";

/** One origin's sales in the period. */
export interface SalesByOriginRow {
  kind: SalesOriginKind;
  /** `utm_source`, lower case. Null on `DIRECT` and `PANEL`, and on a `CAMPAIGN` line whose links carried none. */
  source: string | null;
  /** `utm_medium`, lower case. */
  medium: string | null;
  /** `utm_campaign`, as it was written in the link: a label anyone may write, to be drawn as text. */
  campaign: string | null;
  /** How many sales. */
  orders: number;
  /**
   * How many of them came by a click on a Meta ad. A click is kept only with the buyer's yes to the
   * shop's pixel, so this is a floor, never the whole of it. A `CAMPAIGN` line with no labels at all
   * is made of these alone.
   */
  metaAdOrders: number;
  /**
   * The sum of the orders' totals, in whole cents: what each customer pays, delivery included, after
   * every discount and credit — the number a purchase carries to Meta as its `value`.
   */
  revenueCents: number;
}

/**
 * A shop's sales in a period, by where their buyers came from. A sale is an order not cancelled —
 * and one charged online only while its charge holds the customer's money — counted on the day it
 * was placed. The lines add up to the totals, which are the shop's sales in the period.
 */
export interface SalesByOriginReport {
  /** The period used, as days on the shop's clock (Brasília), both counted: `YYYY-MM-DD`. */
  from: string;
  to: string;
  /** Highest revenue first. */
  rows: SalesByOriginRow[];
  totals: { orders: number; revenueCents: number };
}

/** Both or neither; with neither, the thirty days ending today on the shop's clock. */
export interface SalesByOriginQuery {
  /** `YYYY-MM-DD`. */
  from?: string;
  to?: string;
}

export type ReportErrorCode =
  /** Not two days in `YYYY-MM-DD`, the first after the second, only one of them, or more than 366 days. */
  "REPORT_PERIOD_INVALID";
