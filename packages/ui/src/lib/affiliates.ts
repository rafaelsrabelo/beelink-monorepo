/**
 * The panel's affiliate programme as its blocks read it (IMPULSEIA-102). They mirror the wire's
 * shapes in `packages/contracts/src/affiliate.ts`; this package does not import them, so a screen
 * hands its data over and the blocks never learn where it came from.
 */

/** The programme's rules as the form edits them: what was typed, before it is read as numbers. */
export interface AffiliateSettingsFormValues {
  enabled: boolean
  /**
   * The stored attribution days, carried back as they are: a sale is the affiliate's by the address
   * it was made at — their sub-site (the user's call of 12/11) — so no field on the screen sets them.
   */
  attributionDays: number
  /** Whole days, as typed. */
  payoutDelayDays: string
  /** Blank is no terms. */
  termsText: string
}

/** What the form refuses, by field, in words. */
export type AffiliateSettingsIssues = Partial<Record<"payoutDelayDays" | "termsText", string>>

/** One payout period of the month, its days and its due day already in words. */
export interface AffiliatePayoutRowView {
  from: string
  to: string
  due: string
}

/** A commission table as the list shows it. Mirrors `CommissionTableSummary`. */
export interface CommissionTableView {
  id: string
  name: string
  defaultRateBps: number
  isDefault: boolean
  productRateCount: number
  categoryRateCount: number
  /** Affiliates on it who have not ended: a table with any is not deleted. */
  affiliateCount: number
  /** The affiliate whose own commission it is (12/11/2026); absent or null for a shared table. */
  ownerName?: string | null
}

/** A table's name and rate as the dialog edits them. */
export interface CommissionTableFormValues {
  name: string
  /** "10" or "12,5": a percentage. */
  rate: string
}

export type CommissionTableIssues = Partial<Record<"name" | "rate", string>>

/** A product as a table's rates list it: its own rate there, or null when it follows the table's. */
/**
 * One rate on a table's screen: a product's, or a category's (the user's review, 12/11/2026). Its own
 * rate here, or what it pays without one — its category's, or the table's.
 */
export interface CommissionRateRowView {
  /** The product's or the category's id. */
  id: string
  name: string
  /** A product's photo, or null when it has none; absent on a category, which shows none. */
  imageUrl?: string | null
  rateBps: number | null
  /** What it pays with no rate of its own: its category's, else the table's. */
  fallbackRateBps: number
  /** The category whose rate it follows; null when it follows the table's. */
  fallbackName: string | null
  /** What its field shows: what was typed, or its own rate as saved. */
  typed: string
  /** What was typed is not what is saved: its save is offered. */
  changed: boolean
}

/** Where an affiliate stands with the shop (IMPULSEIA-104). Mirrors `AffiliateStatus`. */
export type AffiliateStatusValue = "INVITED" | "ACTIVE" | "PAUSED" | "ENDED"

/** In the order a standing runs: the list's tabs read them so. */
export const AFFILIATE_STATUS_VALUES = ["INVITED", "ACTIVE", "PAUSED", "ENDED"] as const satisfies readonly AffiliateStatusValue[]

/** An affiliate as the shop's list shows them. Dates arrive in words. */
export interface AffiliateListItemView {
  id: string
  name: string
  email: string
  status: AffiliateStatusValue
  tableName: string
  /** "Convidado em 11 de nov." while invited, "Desde 12 de nov." after. */
  since: string
}

/** A table an affiliate can be put on, as a select lists it. */
export interface AffiliateTableOption {
  id: string
  name: string
  /** "10%". */
  rate: string
}

/** One affiliate, whole, its lines already in words. */
export interface AffiliateRecordView {
  name: string
  email: string
  /** As a person writes it; null when none was given. */
  phone: string | null
  /** `000.000.000-00`; null for one invited before it was asked. */
  cpf: string | null
  status: AffiliateStatusValue
  /** The whole link, `https://…/<loja>/<nome>`; null while invited. */
  link: string | null
  pixKey: string | null
  /** "Versão 2, aceita em 12 de nov."; null while invited. */
  terms: string | null
  /** Invited, accepted, ended — each a sentence, in the order they happened. */
  history: string[]
  /** While invited: when it went out and until when it works. */
  invite: string | null
  /** What the shop window shows of them, which the shop may take off. */
  photoUrl: string | null
  tagline: string | null
  /** The shop's own note; null when there is none. */
  note: string | null
}

/** Up to two initials, for an affiliate with no photo. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/** The record's sections (12/11/2026), each an address: `?aba=<tab>`. */
export type AffiliateRecordTab = "geral" | "comissao" | "documento" | "financeiro" | "pedidos"

export const AFFILIATE_RECORD_TABS = ["geral", "comissao", "documento", "financeiro", "pedidos"] as const satisfies readonly AffiliateRecordTab[]

/** The commission an affiliate is on, in words: what the table pays, and what has a rate of its own. */
export interface AffiliateCommissionView {
  /** "10%". */
  general: string
  categories: { name: string; rate: string }[]
  /** How many products have a rate of their own on the table. */
  productsOwn: number
}

/** The record's own form: the table, and the shop's note. */
export interface AffiliateRecordFormValues {
  tableId: string
  /** As typed; blank only for one invited before it was asked. */
  phone: string
  /** As typed, masked to `000.000.000-00`; blank only for one invited before it was asked. */
  cpf: string
  note: string
}

export type AffiliateRecordIssues = Partial<Record<"tableId" | "phone" | "cpf" | "note", string>>

/** The invite as the person invited reads it, before accepting. Rates and dates arrive in words. */
export interface AffiliateInvitationView {
  storeName: string
  storeLogoUrl: string | null
  email: string
  /** "10%". */
  generalRate: string
  /** Categories with a rate of their own on the invite's table: their products pay it, unless they have their own. */
  categories: { name: string; rate: string }[]
  /** Products with a rate of their own on the invite's table. */
  products: { name: string; rate: string }[]
  termsText: string | null
  /** "18 de nov.". */
  expires: string
}

/** Accepting, as the form edits it. `name` and `password` only when the account is made here. */
export interface AffiliateAcceptanceFormValues {
  slug: string
  pixKey: string
  name: string
  password: string
  agreed: boolean
}

export type AffiliateAcceptanceIssues = Partial<Record<"slug" | "pixKey" | "name" | "password" | "agreed", string>>

/** What the `/name` field says under it while the person types. */
export type AffiliateSlugHint =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available"; link: string }
  | { kind: "unavailable"; message: string }
