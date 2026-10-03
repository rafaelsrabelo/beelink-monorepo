/**
 * An order's shipping label as the panel's blocks read it (BEELINK-187). It mirrors the wire's shapes
 * in `packages/contracts/src/label.ts`; this package does not import them, so a screen hands its data
 * over already in words where it says amounts and dates.
 */

/** Mirrors `OrderLabelStatus`. */
export type OrderLabelStatusValue = "IN_CART" | "PAID" | "GENERATED" | "CANCELLED"

/** The box and the invoice key as the form edits them: the numbers as typed, before they are read. */
export interface OrderLabelFormValues {
  /** Grams. */
  weight: string
  /** Centimetres. */
  length: string
  width: string
  height: string
  invoiceKey: string
}

/** What the form refuses, by field, in words. */
export type OrderLabelIssues = Partial<Record<"volume" | "invoiceKey", string>>

/** A sentence with, when there is one, the way to act on it. */
export interface OrderLabelNote {
  text: string
  href?: string
  linkLabel?: string
  /** Leaves the panel — Melhor Envio's site — rather than moving within it. */
  external?: boolean
}

/** The label card in words. */
export interface OrderLabelCardView {
  /** "Correios · SEDEX". */
  carrier: string
  /** What stands in the way of buying one; empty when nothing does. */
  blockers: readonly OrderLabelNote[]
  /** "R$ 72,55"; null when the wallet could not be read. */
  balance: string | null
  label: {
    status: OrderLabelStatusValue
    /** The sentence its status reads as, with the price and the date in it. */
    statusText: string
    protocol: string | null
    trackingCode: string | null
  } | null
}

export const EMPTY_LABEL_FORM: OrderLabelFormValues = { weight: "", length: "", width: "", height: "", invoiceKey: "" }
