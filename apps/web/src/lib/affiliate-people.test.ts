// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ShopAffiliate } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/index"

// App
import { affiliateDateFormatter, affiliateLinkOf, affiliateListItemOf, affiliateRecordViewOf, identityMissingOf, invitePayloadOf, recordFormOf, recordPatchOf } from "./affiliate-people"

const text = ptBR.affiliates
const date = affiliateDateFormatter("pt-BR")

const joao: ShopAffiliate = {
  id: "a1",
  name: "João Silva",
  email: "joao@exemplo.com",
  phone: "5585999994321",
  cpf: "52998224725",
  slug: "joao",
  status: "ACTIVE",
  table: { id: "t2", name: "Influencers", personal: false },
  invitedAt: "2026-11-11T13:00:00.000Z",
  acceptedAt: "2026-11-12T02:30:00.000Z",
  note: "Indicou amigas",
  pixKey: "joao@exemplo.com",
  photoUrl: null,
  tagline: null,
  termsVersion: 2,
  termsAcceptedAt: "2026-11-12T02:30:00.000Z",
  endedAt: null,
  invite: null,
  document: null,
}

describe("the affiliates in words (IMPULSEIA-104)", () => {
  it("dates by Brasília's day: 23h30 there is still the 11th though UTC is the 12th", () => {
    expect(affiliateListItemOf(joao, text.list, date)).toEqual({ id: "a1", name: "João Silva", email: "joao@exemplo.com", status: "ACTIVE", tableName: "Influencers", since: "Desde 11/11/2026" })
    expect(affiliateListItemOf({ ...joao, status: "INVITED", acceptedAt: null }, text.list, date).since).toBe("Convidado em 11/11/2026")
  })

  it("reads the record: the phone as a person writes it, the terms accepted, what happened when", () => {
    const view = affiliateRecordViewOf({ ...joao, endedAt: "2026-11-20T15:00:00.000Z", status: "ENDED" }, { text: text.record, date, link: affiliateLinkOf("https://beelink.com.br", "lessari", "joao") })

    expect(view).toMatchObject({ phone: "(85) 99999-4321", cpf: "529.982.247-25", link: "https://beelink.com.br/lessari/joao", terms: "Versão 2, aceita em 11/11/2026" })
    expect(view.history).toEqual(["Convidado em 11/11/2026", "Aceitou em 11/11/2026", "Encerrado em 20/11/2026"])
    expect(affiliateLinkOf("https://beelink.com.br", "lessari", null)).toBeNull()
  })

  it("says, while invited, until when the invite works", () => {
    const view = affiliateRecordViewOf({ ...joao, status: "INVITED", slug: null, acceptedAt: null, termsVersion: null, termsAcceptedAt: null, invite: { sentAt: "2026-11-11T13:00:00.000Z", expiresAt: "2026-11-18T13:00:00.000Z" } }, { text: text.record, date, link: null })

    expect(view.invite).toBe("Convite enviado em 11/11/2026. O link vale até 18/11/2026.")
    expect(view.terms).toBeNull()
  })
})

describe("the invite form", () => {
  const typed = { name: " Maria Souza ", email: " Maria@Exemplo.com ", tableId: "t1", phone: " (85) 99999-4321 ", cpf: "529.982.247-25", note: "  " }

  it("trims, lowers the e-mail, sends the CPF as its digits and a blank note as none", () => {
    expect(invitePayloadOf(typed, text.affiliateIssues)).toEqual({ payload: { name: "Maria Souza", email: "maria@exemplo.com", tableId: "t1", phone: "(85) 99999-4321", cpf: "52998224725", note: null } })
  })

  it("says what to correct, field by field — the phone and the CPF are required", () => {
    expect(invitePayloadOf({ name: "M", email: "maria@", tableId: "", phone: "1234", cpf: "529.982.247-26", note: "x".repeat(501) }, text.affiliateIssues)).toEqual({
      issues: { name: text.affiliateIssues.name, email: text.affiliateIssues.email, tableId: text.affiliateIssues.table, phone: text.affiliateIssues.phone, cpf: text.affiliateIssues.cpf, note: text.affiliateIssues.note },
    })
    expect(invitePayloadOf({ ...typed, phone: "", cpf: "" }, text.affiliateIssues)).toEqual({ issues: { phone: text.affiliateIssues.phone, cpf: text.affiliateIssues.cpf } })
  })
})

describe("the record form", () => {
  const saved = recordFormOf(joao)

  it("sends only what changed, and nothing when nothing did", () => {
    expect(recordPatchOf(saved, saved, text.affiliateIssues)).toEqual({ pristine: true })
    expect(recordPatchOf({ ...saved, tableId: "t1" }, saved, text.affiliateIssues)).toEqual({ payload: { tableId: "t1" } })
    expect(recordPatchOf({ ...saved, note: "  " }, saved, text.affiliateIssues)).toEqual({ payload: { note: null } })
    expect(recordPatchOf({ ...saved, note: `${saved.note}  ` }, saved, text.affiliateIssues)).toEqual({ pristine: true })
  })

  it("corrects the phone and the CPF, and never blanks them", () => {
    expect(saved).toMatchObject({ phone: "(85) 99999-4321", cpf: "529.982.247-25" })
    expect(recordPatchOf({ ...saved, phone: "(31) 98888-1111", cpf: "111.444.777-35" }, saved, text.affiliateIssues)).toEqual({ payload: { phone: "(31) 98888-1111", cpf: "11144477735" } })
    expect(recordPatchOf({ ...saved, phone: "", cpf: "" }, saved, text.affiliateIssues)).toEqual({ issues: { phone: text.affiliateIssues.phone, cpf: text.affiliateIssues.cpf } })
  })

  it("leaves blank what one invited before never had, and asks to complete it", () => {
    const before = { ...joao, phone: null, cpf: null }
    const blank = recordFormOf(before)

    expect(identityMissingOf(before)).toBe(true)
    expect(identityMissingOf(joao)).toBe(false)
    expect(recordPatchOf({ ...blank, note: "Completar" }, blank, text.affiliateIssues)).toEqual({ payload: { note: "Completar" } })
    expect(recordPatchOf({ ...blank, cpf: "529.982.247-25" }, blank, text.affiliateIssues)).toEqual({ payload: { cpf: "52998224725" } })
  })

  it("refuses a note past 500 characters", () => {
    expect(recordPatchOf({ ...saved, note: "x".repeat(501) }, saved, text.affiliateIssues)).toEqual({ issues: { note: text.affiliateIssues.note } })
  })
})
