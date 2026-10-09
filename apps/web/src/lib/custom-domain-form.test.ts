// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomDomain, CustomDomainCheck, CustomDomainErrorCode } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { customDomainErrorOf, customDomainPageOf, customDomainViewOf, platformAddressOf } from "./custom-domain-form"

/** Documentation addresses (RFC 5737): nobody's servers. */
const TARGET = "203.0.113.10"
const ELSEWHERE = "198.51.100.7"

const pending: CustomDomain = { host: "minhaloja.com.br", status: "PENDING", checkedAt: "2026-10-08T17:20:00.000Z", problem: "DNS_POINTS_ELSEWHERE" }
const active: CustomDomain = { host: "minhaloja.com.br", status: "ACTIVE", checkedAt: "2026-10-08T17:20:00.000Z", problem: null }
const right: CustomDomainCheck = { problem: null, addresses: [TARGET], www: { problem: null, addresses: [TARGET] } }

describe("customDomainPageOf and platformAddressOf (BEELINK-285)", () => {
  it("leads to the domain's own screen in the shop's panel", () => {
    expect(customDomainPageOf("minha-loja")).toBe("/admin/minha-loja/domain")
  })

  it("says the shop's address at the platform as a person reads it: the host and the slug, no scheme", () => {
    expect(platformAddressOf("https://beelink.biz", "minha-loja")).toBe("beelink.biz/minha-loja")
    // A developer's machine keeps its port, which is part of the address there.
    expect(platformAddressOf("http://localhost:3800", "minha-loja")).toBe("localhost:3800/minha-loja")
  })
})

describe("customDomainViewOf", () => {
  it("is nothing for a shop with no domain", () => {
    expect(customDomainViewOf({ domain: null, check: null }, "pt-BR")).toBeNull()
  })

  it("is the domain, where it stands and its problem, with when it was checked as the shop's country reads it", () => {
    expect(customDomainViewOf({ domain: pending, check: null }, "pt-BR")).toEqual({ host: "minhaloja.com.br", status: "PENDING", checkedAt: "08/10/2026, 14:20", problem: "DNS_POINTS_ELSEWHERE", addresses: [], wwwOff: false })
  })

  /** 01:30 UTC on the 9th is still the 8th in São Paulo, wherever the browser is. */
  it("reads the instant in São Paulo's time, and says none for a domain never checked", () => {
    expect(customDomainViewOf({ domain: { ...pending, checkedAt: "2026-10-09T01:30:00.000Z" }, check: null }, "pt-BR")?.checkedAt).toBe("08/10/2026, 22:30")
    expect(customDomainViewOf({ domain: { ...pending, checkedAt: null, problem: null }, check: null }, "pt-BR")?.checkedAt).toBeNull()
  })

  it("tells where the records were found to point only when a check did", () => {
    const check: CustomDomainCheck = { problem: "DNS_POINTS_ELSEWHERE", addresses: [ELSEWHERE], www: { problem: "DNS_NOT_FOUND", addresses: [] } }

    expect(customDomainViewOf({ domain: pending, check }, "pt-BR")?.addresses).toEqual([ELSEWHERE])
    expect(customDomainViewOf({ domain: pending, check: null }, "pt-BR")?.addresses).toEqual([])
  })

  /** An active domain may carry what its last check found: it is told as it came, and stays active. */
  it("keeps an active domain active with the problem its last check found", () => {
    expect(customDomainViewOf({ domain: { ...active, problem: "DNS_LOOKUP_FAILED" }, check: null }, "pt-BR")).toMatchObject({ status: "ACTIVE", problem: "DNS_LOOKUP_FAILED" })
  })

  it.each([
    ["has no record", "DNS_NOT_FOUND"],
    ["points elsewhere", "DNS_POINTS_ELSEWHERE"],
  ] as const)("notes that www %s once the domain itself points here", (_what, problem) => {
    const www = { problem, addresses: [] }

    expect(customDomainViewOf({ domain: active, check: { ...right, www } }, "pt-BR")?.wwwOff).toBe(true)
    // The certificate's wait is no fault of the domain's DNS: the note is still worth making.
    for (const waiting of ["HTTPS_UNREACHABLE", "HTTPS_CERTIFICATE_INVALID"] as const) expect(customDomainViewOf({ domain: pending, check: { ...right, problem: waiting, www } }, "pt-BR")?.wwwOff).toBe(true)
  })

  it("makes no note of www while the domain's own DNS is wrong, when DNS did not answer for it, or when no check told", () => {
    const off: CustomDomainCheck["www"] = { problem: "DNS_NOT_FOUND", addresses: [] }

    for (const problem of ["DNS_NOT_FOUND", "DNS_POINTS_ELSEWHERE", "DNS_LOOKUP_FAILED"] as const) expect(customDomainViewOf({ domain: pending, check: { problem, addresses: [], www: off } }, "pt-BR")?.wwwOff).toBe(false)
    expect(customDomainViewOf({ domain: active, check: { ...right, www: { problem: "DNS_LOOKUP_FAILED", addresses: [] } } }, "pt-BR")?.wwwOff).toBe(false)
    expect(customDomainViewOf({ domain: active, check: right }, "pt-BR")?.wwwOff).toBe(false)
    expect(customDomainViewOf({ domain: active, check: null }, "pt-BR")?.wwwOff).toBe(false)
  })
})

describe("customDomainErrorOf", () => {
  const { errors, saveFailed, checkFailed } = ptBR.customDomain
  const CODES = ["CUSTOM_DOMAIN_INVALID", "CUSTOM_DOMAIN_IP_ADDRESS", "CUSTOM_DOMAIN_LOCAL", "CUSTOM_DOMAIN_NOT_ASCII", "CUSTOM_DOMAIN_PLATFORM", "CUSTOM_DOMAIN_TAKEN", "CUSTOM_DOMAIN_UNAVAILABLE", "CUSTOM_DOMAIN_NOT_SET"] as const satisfies readonly CustomDomainErrorCode[]

  /** Every refusal the API can answer is a sentence of its own, in both languages, and none is the catch-all. */
  it.each([["pt-BR", ptBR], ["en", en]] as const)("says each refusal of the API's as its own sentence, in %s", (_name, messages) => {
    const said = [...CODES, "RATE_LIMITED"].map((code) => customDomainErrorOf(code, messages.customDomain.errors, messages.customDomain.saveFailed))

    expect(new Set(said).size).toBe(said.length)
    expect(said).not.toContain(messages.customDomain.saveFailed)
  })

  it("says what each refusal is about", () => {
    expect(customDomainErrorOf("CUSTOM_DOMAIN_TAKEN", errors, saveFailed)).toMatch(/já está em uso por outra página/)
    expect(customDomainErrorOf("CUSTOM_DOMAIN_NOT_ASCII", errors, saveFailed)).toMatch(/xn--/)
    expect(customDomainErrorOf("CUSTOM_DOMAIN_IP_ADDRESS", errors, saveFailed)).toMatch(/endereço IP/)
    expect(customDomainErrorOf("CUSTOM_DOMAIN_UNAVAILABLE", errors, saveFailed)).toMatch(/não está disponível nesta instalação/)
    expect(customDomainErrorOf("RATE_LIMITED", errors, checkFailed)).toMatch(/Muitas tentativas/)
  })

  it("says any other code as what was being done not going through — a member of Object included", () => {
    for (const code of ["UNKNOWN", "AUTH_UNAUTHENTICATED", "STORE_FORBIDDEN", "toString", "constructor"]) {
      expect(customDomainErrorOf(code, errors, saveFailed)).toBe("Não foi possível salvar o domínio agora. Tente de novo.")
      expect(customDomainErrorOf(code, errors, checkFailed)).toBe("Não foi possível verificar o domínio agora. Tente de novo.")
    }
  })
})
