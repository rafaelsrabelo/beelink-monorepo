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

/* ── the shop's funnel: anonymous daily counters, and the orders at its end ── */

/**
 * The steps of a shop's funnel (BEELINK-276), in order. The first four are counted as they happen
 * on the shop window — events, never people: one visitor opening five products is five. The last
 * is never told by a browser: it is the shop's own orders.
 */
export type FunnelStep = "PAGE_VIEW" | "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_START" | "PURCHASE";

/** The steps a shop window counts. */
export type CountedFunnelStep = Exclude<FunnelStep, "PURCHASE">;

/**
 * All a shop window says to have a step counted: its name. Nothing of who did it, of the page or of
 * the product — what is kept is a number per shop, day and step.
 */
export interface FunnelEventInput {
  step: CountedFunnelStep;
}

export interface FunnelStepCount {
  step: FunnelStep;
  count: number;
}

/**
 * A shop's funnel in a period. The counted steps are sums of the days' counters; `PURCHASE` is the
 * sales (the rule of `SalesByOriginReport`) the customers placed on the shop window, from the first
 * day anything was counted at this shop — before it there are no visits to set them against.
 */
export interface StoreFunnelReport {
  /** The period used, as days on the shop's clock (Brasília), both counted: `YYYY-MM-DD`. */
  from: string;
  to: string;
  /** The five steps, in the funnel's order. */
  steps: FunnelStepCount[];
  /** Sales the shopkeeper registered in the panel over the same days: they never came through the shop window, and are no step. */
  panelSales: number;
  /** The first day this shop has a counter of, `YYYY-MM-DD`; null while nothing was ever counted. */
  countingSince: string | null;
  /** For how many months a day's counters are kept before they are deleted. */
  retentionMonths: number;
}

/** A report's period: the same two days as `SalesByOriginQuery`. */
export type StoreFunnelQuery = SalesByOriginQuery;
