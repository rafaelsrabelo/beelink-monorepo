// Libs
import { describe, expect, it } from "vitest"

// Types
import type { MetaPixelConnection } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { META_EVENTS_MANAGER, metaConversionsOf, metaPixelCardOf, metaPixelErrorOf, metaTestErrorOf, metaTestResultOf, metaTokenErrorOf } from "./meta-pixel-form"

const connected: MetaPixelConnection = { status: "CONNECTED", pixelId: "123456789012345", connectedAt: "2026-10-06T12:00:00.000Z", conversions: { available: true, token: "NONE", refusal: null, refusedAt: null } }
const errors = ptBR.integrations.metaPixel.errors

describe("metaPixelCardOf (BEELINK-270)", () => {
  it("is the ID saved and when, as the shop's country reads a date", () => {
    expect(metaPixelCardOf(connected)).toEqual({ pixelId: "123456789012345", connectedAt: "2026-10-06T12:00:00.000Z", savedAt: "06/10/2026" })
  })

  /** 01:30 UTC on the 7th is still the 6th in São Paulo, wherever the browser is. */
  it("reads the day in São Paulo's time", () => {
    expect(metaPixelCardOf({ ...connected, connectedAt: "2026-10-07T01:30:00.000Z" }).savedAt).toBe("06/10/2026")
  })

  it("is a shop with no pixel while nothing is saved, whatever else the wire carries", () => {
    const none = { pixelId: null, connectedAt: null, savedAt: null }
    expect(metaPixelCardOf({ ...connected, status: "DISCONNECTED", pixelId: null, connectedAt: null })).toEqual(none)
    expect(metaPixelCardOf({ ...connected, status: "NEEDS_RECONNECT" })).toEqual(none)
    expect(metaPixelCardOf({ ...connected, pixelId: null })).toEqual(none)
  })
})

describe("metaPixelErrorOf", () => {
  it("says the API's refusal of an ID as a sentence, in the language it is handed", () => {
    expect(metaPixelErrorOf("META_PIXEL_ID_INVALID", errors)).toBe("Esse não parece um ID de pixel. O ID tem só números, de 10 a 20 dígitos: copie de novo no Gerenciador de Eventos e cole aqui.")
    expect(metaPixelErrorOf("META_PIXEL_ID_INVALID", en.integrations.metaPixel.errors)).toMatch(/^That does not look like a pixel ID/)
  })

  it("says any other code as a save that did not go through — a member of Object included", () => {
    for (const code of ["UNKNOWN", "AUTH_UNAUTHENTICATED", "STORE_FORBIDDEN", "toString", "constructor"]) expect(metaPixelErrorOf(code, errors)).toBe("Não foi possível salvar o ID agora. Tente de novo.")
  })
})

describe("META_EVENTS_MANAGER", () => {
  it("is Meta's own address, over https", () => {
    expect(new URL(META_EVENTS_MANAGER).origin).toBe("https://business.facebook.com")
  })
})

describe("the token's card and its words (BEELINK-274)", () => {
  const words = ptBR.integrations.metaConversions

  it("draws the token as the wire says it stands, and never more than that", () => {
    expect(metaConversionsOf(connected)).toEqual({ available: true, token: "NONE", refusal: null })
    expect(metaConversionsOf({ ...connected, conversions: { available: true, token: "SET", refusal: null, refusedAt: null } })).toEqual({ available: true, token: "SET", refusal: null })
    expect(metaConversionsOf({ ...connected, conversions: { available: true, token: "REJECTED", refusal: "PIXEL_NOT_FOUND", refusedAt: "2026-10-06T13:00:00.000Z" } })).toEqual({ available: true, token: "REJECTED", refusal: "PIXEL_NOT_FOUND" })
    // A refusal named beside a token that is not refused is noise, and one refused with no name is the token's.
    expect(metaConversionsOf({ ...connected, conversions: { available: true, token: "SET", refusal: "TOKEN_REJECTED", refusedAt: null } }).refusal).toBeNull()
    expect(metaConversionsOf({ ...connected, conversions: { available: true, token: "REJECTED", refusal: null, refusedAt: null } }).refusal).toBe("TOKEN_REJECTED")
  })

  it("reads an answer with no word of the token as a deployment that keeps none", () => {
    const old = { status: connected.status, pixelId: connected.pixelId, connectedAt: connected.connectedAt }

    expect(metaConversionsOf(old as typeof connected)).toEqual({ available: false, token: "NONE", refusal: null })
  })

  it("turns the API's codes into sentences, and any other into the unknown one", () => {
    expect(metaTokenErrorOf("META_PIXEL_TOKEN_INVALID", words.errors)).toBe(words.errors.META_PIXEL_TOKEN_INVALID)
    expect(metaTokenErrorOf("toString", words.errors)).toBe(words.errors.UNKNOWN)
    expect(metaTestErrorOf("RATE_LIMITED", words.test.errors)).toBe(words.test.errors.RATE_LIMITED)
    expect(metaTestErrorOf("constructor", words.test.errors)).toBe(words.test.errors.UNKNOWN)
  })

  it("says what Meta answered to a test, with Meta's own words beside a refusal alone", () => {
    expect(metaTestResultOf({ outcome: "ACCEPTED", detail: "ignored" }, words.test.outcomes)).toEqual({ tone: "done", message: words.test.outcomes.ACCEPTED, detail: null })
    expect(metaTestResultOf({ outcome: "EVENT_REFUSED", detail: "Meta refused (400, code 100): Invalid parameter" }, words.test.outcomes)).toEqual({ tone: "error", message: words.test.outcomes.EVENT_REFUSED, detail: "Meta refused (400, code 100): Invalid parameter" })
    expect(metaTestResultOf({ outcome: "UNREACHABLE", detail: null }, words.test.outcomes)).toEqual({ tone: "error", message: words.test.outcomes.UNREACHABLE, detail: null })
    // An outcome a newer API adds is not a success.
    expect(metaTestResultOf({ outcome: "SOMETHING_NEW" as "UNREACHABLE", detail: null }, words.test.outcomes).tone).toBe("error")
  })
})
