// Libs
import { describe, expect, it } from "vitest"

// Types
import type { GoogleAnalyticsConnection } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { GOOGLE_ANALYTICS_HOME, googleAnalyticsCardOf, googleAnalyticsErrorOf } from "./google-analytics-form"

const connected: GoogleAnalyticsConnection = { status: "CONNECTED", measurementId: "G-AB12CD34EF", connectedAt: "2026-10-07T12:00:00.000Z" }
const errors = ptBR.integrations.googleAnalytics.errors

describe("googleAnalyticsCardOf (BEELINK-302)", () => {
  it("is the ID saved and when, as the shop's country reads a date", () => {
    expect(googleAnalyticsCardOf(connected)).toEqual({ measurementId: "G-AB12CD34EF", connectedAt: "2026-10-07T12:00:00.000Z", savedAt: "07/10/2026" })
  })

  /** 01:30 UTC on the 8th is still the 7th in São Paulo, wherever the browser is. */
  it("reads the day in São Paulo's time", () => {
    expect(googleAnalyticsCardOf({ ...connected, connectedAt: "2026-10-08T01:30:00.000Z" }).savedAt).toBe("07/10/2026")
  })

  it("is a shop with no ID while nothing is saved, whatever else the wire carries", () => {
    const none = { measurementId: null, connectedAt: null, savedAt: null }
    expect(googleAnalyticsCardOf({ status: "DISCONNECTED", measurementId: null, connectedAt: null })).toEqual(none)
    expect(googleAnalyticsCardOf({ ...connected, status: "NEEDS_RECONNECT" })).toEqual(none)
    expect(googleAnalyticsCardOf({ ...connected, measurementId: null })).toEqual(none)
  })
})

describe("googleAnalyticsErrorOf", () => {
  /** The ticket asks for a clear error: the sentence says the shape, and names what is not an ID. */
  it("says the API's refusal of an ID as a sentence that names what does not serve, in the language it is handed", () => {
    const said = googleAnalyticsErrorOf("GOOGLE_ANALYTICS_ID_INVALID", errors)
    expect(said).toMatch(/^Esse não parece um ID de medição\. Ele começa com G-/)
    for (const other of ["UA-", "GTM-", "AW-"]) expect(said).toContain(other)
    expect(googleAnalyticsErrorOf("GOOGLE_ANALYTICS_ID_INVALID", en.integrations.googleAnalytics.errors)).toMatch(/^That does not look like a measurement ID/)
  })

  it("says any other code as a save that did not go through — a member of Object included", () => {
    for (const code of ["UNKNOWN", "AUTH_UNAUTHENTICATED", "STORE_FORBIDDEN", "toString", "constructor"]) expect(googleAnalyticsErrorOf(code, errors)).toBe("Não foi possível salvar o ID agora. Tente de novo.")
  })
})

describe("GOOGLE_ANALYTICS_HOME", () => {
  it("is Google Analytics' own address, over https", () => {
    expect(new URL(GOOGLE_ANALYTICS_HOME).origin).toBe("https://analytics.google.com")
  })
})
