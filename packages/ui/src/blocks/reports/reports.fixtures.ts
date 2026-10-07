// Block
import type { SalesByOriginRowView, SalesTotalsView } from "./report-types"

/** A shop's own address with the three labels on it, as the screen builds it. */
export const EXAMPLE_URL = "https://beelink.biz/doces-da-ana?utm_source=instagram&utm_medium=social&utm_campaign=minha-campanha"

/** A month of a shop that advertises: two campaigns, an ad with no labels, direct visits and the counter. */
export const sampleSalesByOrigin: SalesByOriginRowView[] = [
  { kind: "CAMPAIGN", source: "facebook", medium: "cpc", campaign: "Black Friday", orders: 12, metaAdOrders: 5, revenueCents: 250000 },
  { kind: "PANEL", source: null, medium: null, campaign: null, orders: 9, metaAdOrders: 0, revenueCents: 100000 },
  { kind: "DIRECT", source: null, medium: null, campaign: null, orders: 4, metaAdOrders: 0, revenueCents: 30000 },
  { kind: "CAMPAIGN", source: null, medium: null, campaign: null, orders: 2, metaAdOrders: 2, revenueCents: 15000 },
  { kind: "CAMPAIGN", source: "instagram", medium: "social", campaign: null, orders: 1, metaAdOrders: 0, revenueCents: 5000 },
]

export const sampleSalesTotals: SalesTotalsView = { orders: 28, revenueCents: 400000 }

/** A name as long as the API keeps one, with no space to break at, and one written to be markup. */
export const awkwardSalesByOrigin: SalesByOriginRowView[] = [
  { kind: "CAMPAIGN", source: "facebook", medium: "cpc", campaign: "x".repeat(80), orders: 1, metaAdOrders: 0, revenueCents: 5990 },
  { kind: "CAMPAIGN", source: "newsletter", medium: "email", campaign: "<img src=x onerror=alert(1)>", orders: 1, metaAdOrders: 0, revenueCents: 5990 },
]
