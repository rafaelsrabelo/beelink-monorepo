// Libs
import { describe, expect, it } from "vitest"

// Types
import type { MelhorEnvioConnection, MelhorEnvioSettings } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { integrationResultOf, melhorEnvioCardOf, shippingFormOf, shippingPayloadOf } from "./melhor-envio-form"

const text = ptBR.integrations
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`
const connection: MelhorEnvioConnection = { available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Loja Lessari", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }
const saved: MelhorEnvioSettings = { handlingDays: 2, serviceIds: [1, 3], defaultPackage: { weightGrams: 500, lengthMm: 200, widthMm: 155, heightMm: 100 }, senderDocument: "11222333000181", senderStateRegister: null, updatedAt: "2026-10-02T12:00:00.000Z" }
const form = { serviceIds: [1, 3], handlingDays: "2", weight: "500", length: "20", width: "15,5", height: "10", senderDocument: "11222333000181", senderStateRegister: "" }

describe("melhorEnvioCardOf", () => {
  it("says the wallet read, still being read, or not readable — never a zero for one it could not read", () => {
    expect(melhorEnvioCardOf(connection, { data: { balanceCents: 162490, services: [] }, isPending: false, isError: false }, money).wallet).toEqual({ state: "ready", balance: "R$ 1624.90" })
    expect(melhorEnvioCardOf(connection, { isPending: true, isError: false }, money).wallet).toEqual({ state: "loading" })
    expect(melhorEnvioCardOf(connection, { isPending: false, isError: true }, money).wallet).toEqual({ state: "failed" })
    expect(melhorEnvioCardOf({ ...connection, environment: "PRODUCTION" }, { isPending: true, isError: false }, money).sandbox).toBe(false)
  })
})

describe("shippingFormOf", () => {
  it("starts from the settings as saved, the parcel in centimetres", () => {
    expect(shippingFormOf(saved, [1, 2, 3])).toEqual(form)
  })

  /** BEELINK-183: a shop that never chose offers every service, and the form shows exactly that. */
  it("starts a shop that never chose with every service on, once their list is in hand", () => {
    const never: MelhorEnvioSettings = { handlingDays: 1, serviceIds: null, defaultPackage: null, senderDocument: null, senderStateRegister: null, updatedAt: null }

    expect(shippingFormOf(never, [1, 2, 3])).toMatchObject({ serviceIds: [1, 2, 3], handlingDays: "1", weight: "", length: "" })
    expect(shippingFormOf(never, null).serviceIds).toEqual([])
  })
})

describe("shippingPayloadOf", () => {
  it("reads the form as the API takes it: grams, millimetres, whole days", () => {
    expect(shippingPayloadOf(form, text.shipping.issues)).toEqual({ payload: { handlingDays: 2, serviceIds: [1, 3], defaultPackage: { weightGrams: 500, lengthMm: 200, widthMm: 155, heightMm: 100 }, senderDocument: "11222333000181", senderStateRegister: null } })
  })

  it("sends no parcel when all four are empty, and no service when none is on", () => {
    expect(shippingPayloadOf({ ...form, serviceIds: [], weight: "", length: " ", width: "", height: "" }, text.shipping.issues)).toEqual({ payload: { handlingDays: 2, serviceIds: [], defaultPackage: null, senderDocument: "11222333000181", senderStateRegister: null } })
  })

  it.each([
    ["days past a month", { handlingDays: "31" }, { handlingDays: text.shipping.issues.handlingDays }],
    ["days that are not a number", { handlingDays: "um" }, { handlingDays: text.shipping.issues.handlingDays }],
    ["half a parcel", { height: "" }, { package: text.shipping.issues.package }],
    ["a parcel with a zero", { weight: "0" }, { package: text.shipping.issues.package }],
    ["a parcel past the carriers", { length: "201" }, { package: text.shipping.issues.packageRange }],
    // BEELINK-187: the length is said here; the check digits are the API's.
    ["a sender document that is neither a CPF nor a CNPJ long", { senderDocument: "123.456" }, { senderDocument: text.shipping.issues.senderDocument }],
  ])("refuses %s, by its field", (_, patch, issues) => {
    expect(shippingPayloadOf({ ...form, ...patch }, text.shipping.issues)).toEqual({ issues })
  })
})

describe("the labels' sender (BEELINK-187)", () => {
  it("sends the document as digits, a state registration as typed, and blanks as none", () => {
    expect(shippingPayloadOf({ ...form, senderDocument: "11.222.333/0001-81", senderStateRegister: " ISENTO " }, text.shipping.issues)).toMatchObject({ payload: { senderDocument: "11222333000181", senderStateRegister: "ISENTO" } })
    expect(shippingPayloadOf({ ...form, senderDocument: " ", senderStateRegister: "" }, text.shipping.issues)).toMatchObject({ payload: { senderDocument: null, senderStateRegister: null } })
  })
})

describe("integrationResultOf", () => {
  it("says what the way back from Melhor Envio carries, and nothing on an ordinary visit", () => {
    expect(integrationResultOf({ conectado: "melhor-envio" }, text.result)).toEqual({ tone: "done", message: text.result.connected })
    expect(integrationResultOf({ erro: "INTEGRATION_CANCELLED" }, text.result)).toEqual({ tone: "failed", message: text.result.errors.INTEGRATION_CANCELLED })
    expect(integrationResultOf({ erro: "SOMETHING_NEW" }, text.result)).toEqual({ tone: "failed", message: text.result.errors.UNKNOWN })
    expect(integrationResultOf({}, text.result)).toBeNull()
  })
})
