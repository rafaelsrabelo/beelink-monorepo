// Libs
import { describe, expect, it } from "vitest"

// App
import { courierApplicationCopyOf, courierProblemOf } from "./courier-application-copy"
import { en } from "@/locales/en"
import { ptBR } from "@/locales/pt-BR"
import { CourierApplicationRequestError } from "@/services/couriers/courier-application-requests"

const copy = courierApplicationCopyOf(ptBR)
const refused = (code: string) => courierProblemOf(new CourierApplicationRequestError(code), copy)

describe("courierProblemOf (BEELINK-322)", () => {
  it("is nothing while no send failed", () => {
    expect(courierProblemOf(null, copy)).toBeNull()
    expect(courierProblemOf(undefined, copy)).toBeNull()
  })

  it.each([
    ["COURIER_NAME_INVALID", "name", "Informe o nome completo, com sobrenome."],
    ["COURIER_DOCUMENT_INVALID", "document", "Esse CPF não confere. Confira os números."],
    ["COURIER_EMAIL_INVALID", "email", "Informe um e-mail válido."],
    ["COURIER_WHATSAPP_INVALID", "whatsapp", "Informe um celular com DDD."],
    ["COURIER_CITY_NOT_OPEN", "city", "O cadastro ainda não está aberto para essa cidade."],
    ["COURIER_VEHICLE_INVALID", "vehicle", "Escolha como você entrega."],
    ["COURIER_TERMS_REQUIRED", "acceptedTerms", "Marque o aceite para enviar."],
  ])("puts %s on the %s, in that field's sentence, with nothing to send again at once", (code, field, message) => {
    expect(refused(code)).toEqual({ field, message })
  })

  /** The general sentence says to wait a minute, and this route's window is ten. */
  it.each(["RATE_LIMITED", "TOO_MANY_REQUESTS"])("says the limit in a sentence of its own for %s, on no field and with nothing to send again at once", (code) => {
    expect(refused(code)).toEqual({ field: null, message: "Muitos envios em pouco tempo. Espere alguns minutos e tente de novo." })
    expect(refused(code)?.message).not.toBe(ptBR.errors.RATE_LIMITED)
  })

  it.each(["UNKNOWN", "INTERNAL_SERVER_ERROR", "BAD_GATEWAY", "SERVICE_UNAVAILABLE", "BAD_REQUEST", "FORBIDDEN", "UNSUPPORTED_MEDIA_TYPE", "A_CODE_NOBODY_KNOWS"])(
    "takes %s for a failure: the form is kept and offered again",
    (code) => {
      expect(refused(code)).toEqual({ field: null, message: "Não foi possível enviar o cadastro agora. O que você preencheu continua aqui: tente de novo.", retry: true })
    },
  )

  it("takes an error that carries no code for a failure too", () => {
    expect(courierProblemOf(new TypeError("Failed to fetch"), copy)).toMatchObject({ field: null, retry: true })
  })

  /** A code read off the wire is looked up as a key: `constructor` must not reach `Object`'s own members. */
  it("never takes a member of every object for a refusal", () => {
    for (const code of ["constructor", "toString", "__proto__", "hasOwnProperty"]) expect(refused(code)).toMatchObject({ field: null, retry: true })
  })
})

describe("courierApplicationCopyOf", () => {
  it("picks the nine sentences, and only them, in the language it is handed", () => {
    const english = courierApplicationCopyOf(en)

    expect(Object.keys(english.refusals)).toHaveLength(7)
    expect(english.refusals.COURIER_DOCUMENT_INVALID).toBe("This CPF does not check out. Check the numbers.")
    expect(english.limited).toBe("Too many sends in a short time. Wait a few minutes and try again.")
    expect(english.failed).toBe("The sign-up could not be sent right now. What you filled in is still here: try again.")
    expect(Object.keys(english).sort()).toEqual(["failed", "limited", "refusals"])
  })

  it("is plain data, which is what lets it cross into a Client Component", () => {
    expect(structuredClone(copy)).toEqual(copy)
  })
})
