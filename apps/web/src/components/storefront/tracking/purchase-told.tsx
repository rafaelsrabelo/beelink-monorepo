"use client"

// App
import { usePurchaseTold } from "./use-purchase-told"
import type { Purchase } from "@/lib/purchase"

export interface PurchaseToldProps {
  slug: string
  /** What `purchaseOf` made of the order as the page read it; null for an order that is no purchase to tell. */
  purchase: Purchase | null
}

/** `usePurchaseTold` for a page drawn on the server: it draws nothing, and tells the order's purchase once. */
export function PurchaseTold({ slug, purchase }: PurchaseToldProps) {
  usePurchaseTold(slug, purchase)

  return null
}
