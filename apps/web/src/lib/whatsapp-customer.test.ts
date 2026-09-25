// Libs
import { describe, expect, it } from "vitest"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { customerMessageOf, customerWhatsappHref } from "./whatsapp-customer"

const base = { shopName: "Loja do Design", messages: ptBR }

describe("customerMessageOf", () => {
  it("invites a lead to the first order, greeting them by first name from the shop", () => {
    expect(customerMessageOf({ ...base, customer: { name: "Bia Souza", stage: "LEAD" } })).toBe(
      [
        "Olá, Bia! Aqui é da Loja do Design.",
        "",
        "Vi que você criou sua conta com a gente e ainda não fez o primeiro pedido. Posso te ajudar a escolher alguma coisa?",
      ].join("\n"),
    )
  })

  it("thanks a customer who buys", () => {
    const message = customerMessageOf({ ...base, customer: { name: "Caio", stage: "CUSTOMER" } })

    expect(message).toContain("Olá, Caio! Aqui é da Loja do Design.")
    expect(message).toContain("Obrigado por comprar com a gente!")
  })

  it("tells an inactive customer it has been a while", () => {
    const message = customerMessageOf({ ...base, customer: { name: "  Eva   Nunes ", stage: "INACTIVE" } })

    expect(message).toContain("Olá, Eva!")
    expect(message).toContain("Faz tempo que você não passa aqui!")
  })

  it("speaks the panel's language", () => {
    expect(customerMessageOf({ shopName: "Shop", messages: en, customer: { name: "Bia", stage: "INACTIVE" } })).toContain("It has been a while")
  })
})

describe("customerWhatsappHref", () => {
  it("opens the conversation on the phone as stored, with the message escaped whole", () => {
    const href = customerWhatsappHref({ ...base, customer: { name: "Bia", stage: "LEAD", phone: "5511977776666" } })

    expect(href).toMatch(/^https:\/\/wa\.me\/5511977776666\?text=/)
    expect(decodeURIComponent(href!.split("?text=")[1]!)).toBe(customerMessageOf({ ...base, customer: { name: "Bia", stage: "LEAD" } }))
  })

  it("has nothing to open without a phone", () => {
    expect(customerWhatsappHref({ ...base, customer: { name: "Bia", stage: "LEAD", phone: null } })).toBeNull()
  })
})
