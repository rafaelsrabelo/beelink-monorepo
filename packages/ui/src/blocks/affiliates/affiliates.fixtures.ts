// Block
import type { AffiliatePayoutRowView, AffiliateSettingsFormValues, CommissionRateRowView, CommissionTableView } from "@harness-monorepo/ui/lib/affiliates"

export const settings: AffiliateSettingsFormValues = {
  enabled: true,
  attributionDays: 30,
  payoutDelayDays: "10",
  termsText: "A comissão é paga por Pix, no calendário do programa.",
}

export const calendar: AffiliatePayoutRowView[] = [
  { from: "1º de nov.", to: "10 de nov.", due: "20 de nov." },
  { from: "11 de nov.", to: "20 de nov.", due: "30 de nov." },
  { from: "21 de nov.", to: "30 de nov.", due: "10 de dez." },
]

export const tables: CommissionTableView[] = [
  { id: "t-padrao", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 2, categoryRateCount: 1, affiliateCount: 3 },
  { id: "t-influ", name: "Influencers", defaultRateBps: 1500, isDefault: false, productRateCount: 0, categoryRateCount: 0, affiliateCount: 1 },
]

export const rates: CommissionRateRowView[] = [
  { id: "p-whey", name: "Whey Concentrado", imageUrl: null, rateBps: 2500, fallbackRateBps: 1500, fallbackName: "Suplementos", typed: "25", changed: false },
  { id: "p-creatina", name: "Creatina", imageUrl: null, rateBps: null, fallbackRateBps: 1500, fallbackName: "Suplementos", typed: "", changed: false },
  { id: "p-camiseta", name: "Camiseta", imageUrl: null, rateBps: null, fallbackRateBps: 1000, fallbackName: null, typed: "", changed: false },
  { id: "p-bcaa", name: "BCAA", imageUrl: null, rateBps: 0, fallbackRateBps: 1500, fallbackName: "Suplementos", typed: "5", changed: true },
]

/** A shop's categories on a table: one with its own rate, one following the general rate. */
export const categoryRates: CommissionRateRowView[] = [
  { id: "c-suplementos", name: "Suplementos", rateBps: 1500, fallbackRateBps: 1000, fallbackName: null, typed: "15", changed: false },
  { id: "c-roupas", name: "Roupas", rateBps: null, fallbackRateBps: 1000, fallbackName: null, typed: "", changed: false },
]
