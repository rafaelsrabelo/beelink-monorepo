// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { StoreRequestError } from "@/services/stores/store-requests"
import { addressChangeErrorOf, availabilityOf, platformPrefixOf, storeAddressPageOf } from "./store-address"

const text = ptBR.store.addressChange
const settled = { isFetching: false, isError: false }

describe("the screen that changes a page's address (BEELINK-331)", () => {
  it("lives under the page's settings, and spells the platform's part as the panel was asked for", () => {
    expect(storeAddressPageOf("padaria-do-bairo")).toBe("/admin/padaria-do-bairo/store/address")
    expect(platformPrefixOf("https://beelink.biz")).toBe("beelink.biz/")
    expect(platformPrefixOf("http://localhost:3200")).toBe("localhost:3200/")
  })

  it("says nothing of nothing, that it is asking until the pause and the answer come, then the answer", () => {
    expect(availabilityOf("", "", settled)).toEqual({ state: "idle" })
    expect(availabilityOf("padaria-nova", "padaria-nov", settled)).toEqual({ state: "checking" })
    expect(availabilityOf("padaria-nova", "padaria-nova", { ...settled, isFetching: true })).toEqual({ state: "checking" })
    expect(availabilityOf("padaria-nova", "padaria-nova", { ...settled, data: { slug: "padaria-nova", available: true, reason: null } })).toEqual({ state: "available" })
    expect(availabilityOf("padaria", "padaria", { ...settled, data: { slug: "padaria", available: false, reason: "TAKEN" } })).toEqual({ state: "unavailable", reason: "TAKEN" })
    // A check that failed, or an answer about another address, says nothing: the button waits.
    expect(availabilityOf("padaria-nova", "padaria-nova", { ...settled, isError: true })).toEqual({ state: "idle" })
    expect(availabilityOf("padaria-nova", "padaria-nova", { ...settled, data: { slug: "outra", available: true, reason: null } })).toEqual({ state: "idle" })
  })

  it("says why a change was refused, with the day another is accepted where that is why", () => {
    const refused = (code: string, details?: unknown) => addressChangeErrorOf(new StoreRequestError(code, details), text, web.errors, "pt-BR")

    expect(refused("STORE_SLUG_TAKEN")).toBe(text.reasons.TAKEN)
    expect(refused("STORE_SLUG_RESERVED")).toBe(text.reasons.RESERVED)
    expect(refused("STORE_SLUG_CHANGE_TOO_SOON", { changeableOn: "2026-11-16" })).toBe("O endereço só pode ser trocado de novo a partir de 16/11/2026.")
    expect(refused("STORE_SLUG_CHANGE_TOO_SOON")).toBe(web.errors.STORE_SLUG_CHANGE_TOO_SOON)
    expect(refused("STORE_MOVED", { slug: "outra" })).toBe(web.errors.STORE_MOVED)
    expect(refused("ALGO_NOVO")).toBe(text.saveFailed)
    expect(addressChangeErrorOf(new Error("rede"), text, web.errors, "pt-BR")).toBe(text.saveFailed)
  })
})
