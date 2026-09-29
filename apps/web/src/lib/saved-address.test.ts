// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerSavedAddress } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { addressNoticeOf, cepDigitsOf, checkoutAddressesOf, savedAddressHeadingOf, savedAddressLinesOf } from "./saved-address"

const home: CustomerSavedAddress = {
  id: "a1",
  label: "Casa",
  recipientName: null,
  zipCode: "60160230",
  street: "Rua Tibúrcio Cavalcante",
  number: "1200",
  complement: "apto 302",
  neighborhood: "Meireles",
  city: "Fortaleza",
  state: "CE",
  isDefault: true,
}

describe("a saved address as the shop window reads it", () => {
  it("is headed by its name and who receives, the shopper when nobody else is named", () => {
    expect(savedAddressHeadingOf(home, "Rafael Souza")).toBe("Casa · Rafael Souza")
    expect(savedAddressHeadingOf({ label: "Trabalho", recipientName: "Recepção" }, "Rafael Souza")).toBe("Trabalho · Recepção")
    expect(savedAddressHeadingOf({ label: null, recipientName: null }, "Rafael Souza")).toBe("Rafael Souza")
  })

  it("draws the card's lines, leaving out what is not on file", () => {
    expect(savedAddressLinesOf(home)).toEqual(["Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles, Fortaleza/CE", "60160-230"])
    expect(savedAddressLinesOf({ ...home, number: null, complement: null, neighborhood: null, zipCode: null })).toEqual(["Rua Tibúrcio Cavalcante", "Fortaleza/CE"])
  })

  it("offers the cart only the addresses a delivery can go to", () => {
    const cepOnly = { ...home, id: "a2", label: null, street: null, city: null, isDefault: false }

    expect(checkoutAddressesOf({ name: "Rafael Souza", addresses: [home, cepOnly] })).toEqual([
      { id: "a1", heading: "Casa · Rafael Souza", line: "Rua Tibúrcio Cavalcante, 1200, apto 302 — Meireles — Fortaleza/CE — CEP 60160-230" },
    ])
  })

  it("keeps a CEP for the header as its eight digits, and nothing that is not one", () => {
    expect(cepDigitsOf("60323-231")).toBe("60323231")
    expect(cepDigitsOf("6032")).toBeNull()
    expect(cepDigitsOf(null)).toBeNull()
  })

  it("says what the last change did, and nothing for a word it does not know", () => {
    expect(addressNoticeOf("endereco-removido", ptBR)).toBe("O endereço foi removido.")
    for (const word of [undefined, "", "outra-coisa", "constructor", "toString"]) expect(addressNoticeOf(word, ptBR)).toBeNull()
  })
})
