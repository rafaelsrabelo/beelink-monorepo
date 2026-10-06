// Libs
import { describe, expect, it } from "vitest"

// Types
import type { MetaPixelConnection } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { META_EVENTS_MANAGER, metaPixelCardOf, metaPixelErrorOf } from "./meta-pixel-form"

const connected: MetaPixelConnection = { status: "CONNECTED", pixelId: "123456789012345", connectedAt: "2026-10-06T12:00:00.000Z" }
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
    expect(metaPixelCardOf({ status: "DISCONNECTED", pixelId: null, connectedAt: null })).toEqual(none)
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
