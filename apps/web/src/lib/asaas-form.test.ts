// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AsaasConnection, AsaasSettings } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { approvalCheckedAtOf, approvalRecheckErrorOf, asaasCardOf, asaasConnectErrorOf, asaasUnapprovedOf, paymentErrorOf, paymentFormOf, paymentPayloadOf } from "./asaas-form"

const text = ptBR.integrations
const connection: AsaasConnection = { available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" }, webhook: "REGISTERED", approval: "APPROVED", approvalCheckedAt: "2026-10-06T21:40:00.000Z", connectedAt: "2026-10-05T12:00:00.000Z" }
const saved: AsaasSettings = { pix: true, card: false, maxInstallments: 6, offline: true, updatedAt: "2026-10-05T12:00:00.000Z" }

describe("asaasCardOf", () => {
  it("hands the card the connection as it stands, and says the sandbox by its environment", () => {
    expect(asaasCardOf(connection)).toEqual({
      available: true,
      status: "CONNECTED",
      sandbox: true,
      account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" },
      webhook: "REGISTERED",
      approval: "APPROVED",
      connectedAt: "2026-10-05T12:00:00.000Z",
      signUpHref: "https://sandbox.asaas.com",
    })
  })

  /** Asaas's documentation names the sandbox's own site for a test account, and no address for one in production. */
  it("sends whoever has no account to the site of the environment this installation talks to", () => {
    const never: AsaasConnection = { ...connection, status: "DISCONNECTED", account: null, webhook: null, approval: null, approvalCheckedAt: null, connectedAt: null }

    expect(asaasCardOf(never).signUpHref).toBe("https://sandbox.asaas.com")
    expect(asaasCardOf({ ...never, environment: "PRODUCTION" })).toMatchObject({ sandbox: false, signUpHref: "https://www.asaas.com" })
  })
})

describe("an account Asaas has not approved (BEELINK-278)", () => {
  it("is one read as anything but approved, of a key in good standing — never one not known", () => {
    for (const approval of ["PENDING", "AWAITING_APPROVAL", "REJECTED"] as const) expect(asaasUnapprovedOf({ status: "CONNECTED", approval })).toBe(approval)
    expect(asaasUnapprovedOf({ status: "CONNECTED", approval: "APPROVED" })).toBeNull()
    expect(asaasUnapprovedOf({ status: "CONNECTED", approval: null })).toBeNull()
    expect(asaasUnapprovedOf({ status: "NEEDS_RECONNECT", approval: "REJECTED" })).toBeNull()
    expect(asaasUnapprovedOf({ status: "DISCONNECTED", approval: null })).toBeNull()
  })

  it("says when Asaas was last asked by Brasília's clock, and nothing when it never was", () => {
    expect(approvalCheckedAtOf("2026-10-06T21:40:00.000Z")).toBe("06/10/2026, 18:40")
    expect(approvalCheckedAtOf(null)).toBeUndefined()
  })

  it("says in words why asking again did not go through, any unknown code as one sentence", () => {
    const errors = text.asaas.approval.recheckErrors
    expect(approvalRecheckErrorOf("INTEGRATION_UNREACHABLE", errors)).toBe(errors.INTEGRATION_UNREACHABLE)
    expect(approvalRecheckErrorOf("RATE_LIMITED", errors)).toBe(errors.RATE_LIMITED)
    expect(approvalRecheckErrorOf("toString", errors)).toBe(errors.UNKNOWN)
  })
})

describe("asaasConnectErrorOf", () => {
  it("says each refusal of a key in its own words", () => {
    expect(asaasConnectErrorOf("INTEGRATION_KEY_INVALID", "SANDBOX", text.asaas)).toBe(text.asaas.errors.INTEGRATION_KEY_INVALID)
    expect(asaasConnectErrorOf("INTEGRATION_UNREACHABLE", "SANDBOX", text.asaas)).toBe(text.asaas.errors.INTEGRATION_UNREACHABLE)
    expect(asaasConnectErrorOf("RATE_LIMITED", "PRODUCTION", text.asaas)).toBe(text.asaas.errors.RATE_LIMITED)
  })

  it("tells a key of the other environment which one this installation takes", () => {
    expect(asaasConnectErrorOf("INTEGRATION_KEY_WRONG_ENVIRONMENT", "SANDBOX", text.asaas)).toContain("$aact_hmlg_")
    expect(asaasConnectErrorOf("INTEGRATION_KEY_WRONG_ENVIRONMENT", "PRODUCTION", text.asaas)).toContain("$aact_prod_")
    expect(asaasConnectErrorOf("INTEGRATION_KEY_WRONG_ENVIRONMENT", "PRODUCTION", en.integrations.asaas)).toContain("production")
  })

  it("says something went wrong for an installation that cannot connect and for any other word, however it is spelled", () => {
    for (const code of ["UNKNOWN", "SOMETHING_NEW", "constructor", "toString", "__proto__", ""]) {
      expect(asaasConnectErrorOf(code, "SANDBOX", text.asaas)).toBe(text.asaas.errors.UNKNOWN)
    }
    expect(asaasConnectErrorOf("INTEGRATION_UNAVAILABLE", "SANDBOX", text.asaas)).toBe(text.asaas.unavailable)
  })
})

describe("paymentFormOf and paymentPayloadOf", () => {
  it("start the form from the settings, without when they were saved, and send them back as they are", () => {
    const form = paymentFormOf(saved)

    expect(form).toEqual({ pix: true, card: false, maxInstallments: 6, offline: true })
    expect(paymentPayloadOf(form, text.payments.issues)).toEqual({ payload: { pix: true, card: false, maxInstallments: 6, offline: true } })
  })

  /** The number is the shop's choice for when the card is on: off, it travels with the rest. */
  it("keeps the instalments of a card that is off", () => {
    expect(paymentPayloadOf({ pix: true, card: false, maxInstallments: 10, offline: false }, text.payments.issues)).toEqual({ payload: { pix: true, card: false, maxInstallments: 10, offline: false } })
  })

  it("takes each way as the only one left on", () => {
    for (const ways of [{ pix: true, card: false, offline: false }, { pix: false, card: true, offline: false }, { pix: false, card: false, offline: true }]) {
      expect(paymentPayloadOf({ ...ways, maxInstallments: 1 }, text.payments.issues)).toEqual({ payload: { ...ways, maxInstallments: 1 } })
    }
  })

  it("refuses every way switched off, before anything is sent", () => {
    expect(paymentPayloadOf({ pix: false, card: false, maxInstallments: 3, offline: false }, text.payments.issues)).toEqual({ issue: text.payments.issues.none })
  })
})

describe("paymentErrorOf", () => {
  it("says the API's refusal of a save in words, and the generic sentence for any other", () => {
    expect(paymentErrorOf("ASAAS_SETTINGS_INVALID", text.payments.errors)).toBe(text.payments.errors.ASAAS_SETTINGS_INVALID)
    expect(paymentErrorOf("INTERNAL_ERROR", text.payments.errors)).toBe(text.payments.errors.UNKNOWN)
  })
})
