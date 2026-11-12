"use client"

// React
import { useState } from "react"

// Types
import type { CommissionTable, Product } from "@harness-monorepo/contracts"
import type { CommissionRateRowView } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { affiliateErrorOf, commissionRateOf } from "@/lib/affiliate-form"
import { percentFrom } from "@/lib/discount-form"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useSaveProductCommission } from "@/services/affiliates/affiliate-hooks"

/** A record less one key. */
function without(record: Record<string, string>, key: string): Record<string, string> {
  const rest = { ...record }
  delete rest[key]
  return rest
}

/**
 * What is typed on a table's rates screen (IMPULSEIA-102), product by product: each row's draft, its
 * refusal, and the save that sends one row — a rate, or none to follow the table's again.
 */
export function useRateDrafts(slug: string, table: CommissionTable | undefined, messages: UiMessages) {
  const text = messages.affiliates
  const save = useSaveProductCommission(slug)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [issues, setIssues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<string | undefined>(undefined)
  const saved = new Map((table?.rates ?? []).map((rate) => [rate.productId, rate.rateBps]))

  const forget = (productId: string) => {
    setDrafts((current) => without(current, productId))
    setIssues((current) => without(current, productId))
  }

  function rowsOf(products: readonly Product[]): CommissionRateRowView[] {
    return products.map((product) => {
      const rateBps = saved.get(product.id) ?? null
      const shown = percentFrom(rateBps)
      const typed = drafts[product.id] ?? shown
      return { productId: product.id, name: product.name, imageUrl: product.images[0]?.url ?? null, rateBps, typed, changed: typed.trim() !== shown }
    })
  }

  function type(productId: string, typed: string) {
    setIssues((current) => without(current, productId))
    setStatus(undefined)
    setDrafts((current) => ({ ...current, [productId]: typed }))
  }

  function send(productId: string, name: string, rateBps: number | null) {
    if (!table) return
    save.mutate(
      { tableId: table.id, productId, rateBps },
      {
        onSuccess: () => {
          forget(productId)
          setStatus(format(text.table.saved, { name }))
        },
        onError: (error) => setIssues((current) => ({ ...current, [productId]: affiliateErrorOf(error instanceof AffiliateError ? error.errorCode : "UNKNOWN", text.errors) })),
      },
    )
  }

  /** The row's draft as the wire takes it: empty follows the table, so it drops the product's own rate. */
  function saveRow(product: Pick<Product, "id" | "name">) {
    const rateBps = commissionRateOf(drafts[product.id] ?? percentFrom(saved.get(product.id) ?? null))
    if (rateBps === undefined) return setIssues((current) => ({ ...current, [product.id]: text.issues.rate }))
    send(product.id, product.name, rateBps)
  }

  return { rowsOf, type, saveRow, resetRow: (product: Pick<Product, "id" | "name">) => send(product.id, product.name, null), issues, status, busyId: save.isPending ? save.variables.productId : null }
}
