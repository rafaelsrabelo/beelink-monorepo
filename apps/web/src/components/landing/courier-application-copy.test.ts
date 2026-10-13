// Libs
import { describe, expect, it } from "vitest"

// App
import { courierApplicationCopyOf, courierProblemOf, isCourierAlreadyListed } from "./courier-application-copy"
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
    ["COURIER_WHATSAPP_INVALID", "whatsapp", "Informe um celular com DDD."],
    ["COURIER_VEHICLE_INVALID", "vehicle", "Escolha como vai fazer suas entregas."],
    ["COURIER_TERMS_REQUIRED", "acceptedTerms", "Marque o aceite para continuar."],
    // BEELINK-325: a number already on the list, under another CPF, is the form's to fix.
    ["COURIER_WHATSAPP_TAKEN", "whatsapp", "Este WhatsApp já está cadastrado."],
  ])("puts %s on the %s, in that field's sentence, with nothing to send again at once", (code, field, message) => {
    expect(refused(code)).toEqual({ field, message })
  })

  // BEELINK-329: the first step asks for no e-mail and no city, so a refusal of either has no field to stand on.
  it.each([
    ["COURIER_EMAIL_INVALID", "Informe um e-mail válido."],
    ["COURIER_EMAIL_TAKEN", "Este e-mail já está cadastrado."],
    ["COURIER_CITY_NOT_OPEN", "O cadastro ainda não está aberto para essa cidade."],
  ])("says %s on no field, in its own sentence, with nothing to send again at once", (code, message) => {
    expect(refused(code)).toEqual({ field: null, message })
  })

  // BEELINK-329: a CPF on the list already is said where the confirmation stands, and is no problem of the form's.
  it("is nothing for a CPF already on the list, which is told apart from every other answer", () => {
    expect(refused("COURIER_DOCUMENT_TAKEN")).toBeNull()
    expect(isCourierAlreadyListed(new CourierApplicationRequestError("COURIER_DOCUMENT_TAKEN"))).toBe(true)
    for (const code of ["COURIER_WHATSAPP_TAKEN", "COURIER_EMAIL_TAKEN", "COURIER_DOCUMENT_INVALID", "UNKNOWN"]) expect(isCourierAlreadyListed(new CourierApplicationRequestError(code))).toBe(false)
    for (const other of [null, undefined, new Error("COURIER_DOCUMENT_TAKEN"), { errorCode: "COURIER_DOCUMENT_TAKEN" }]) expect(isCourierAlreadyListed(other)).toBe(false)
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
  it("picks the twelve sentences, and only them, in the language it is handed", () => {
    const english = courierApplicationCopyOf(en)

    expect(Object.keys(english.refusals)).toHaveLength(10)
    expect(english.refusals.COURIER_EMAIL_TAKEN).toBe("This e-mail is already registered.")
    expect(english.refusals.COURIER_DOCUMENT_INVALID).toBe("This CPF does not check out. Check the numbers.")
    expect(english.limited).toBe("Too many sends in a short time. Wait a few minutes and try again.")
    expect(english.failed).toBe("The sign-up could not be sent right now. What you filled in is still here: try again.")
    expect(Object.keys(english).sort()).toEqual(["failed", "limited", "refusals"])
  })

  it("is plain data, which is what lets it cross into a Client Component", () => {
    expect(structuredClone(copy)).toEqual(copy)
  })
})
