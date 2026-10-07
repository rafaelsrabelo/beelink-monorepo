// Node
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Libs
import { describe, expect, it } from "vitest"

// App
import { metaEventOf } from "./meta-pixel-event"
import { purchaseCountsWhen, purchasedAtOf, purchaseOf, type PurchaseOrder } from "./purchase"

interface Case {
  name: string
  order: PurchaseOrder
  expected: { moment: "PLACED" | "PAID"; countedAt: string; eventId: string; customData: object }
}

/**
 * The cases the API's `meta-purchase-event.spec.ts` reads too (BEELINK-274). The server tells Meta
 * the purchase this browser tells, and the two cannot share code: they share these answers. A change
 * to `purchaseOf` or `metaEventOf` that moves one fails here, and says the server must move with it.
 */
const { now, cases } = JSON.parse(readFileSync(resolve(process.cwd(), "../../packages/contracts/fixtures/meta-purchase.json"), "utf8")) as { now: string; cases: Case[] }

describe("the purchase told from the browser is the one the server tells (BEELINK-274)", () => {
  it("reads cases enough to mean something", () => {
    expect(cases.length).toBeGreaterThanOrEqual(5)
  })

  it.each(cases)("$name", ({ order, expected }) => {
    const purchase = purchaseOf(order, new Date(now))

    expect(purchaseCountsWhen(order)).toBe(expected.moment)
    expect(purchasedAtOf(order)).toBe(expected.countedAt)
    expect(purchase?.eventId).toBe(expected.eventId)
    expect(metaEventOf(purchase!.event)).toEqual({ name: "Purchase", params: expected.customData })
  })
})
