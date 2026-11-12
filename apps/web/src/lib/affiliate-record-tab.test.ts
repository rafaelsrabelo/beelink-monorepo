// Libs
import { describe, expect, it } from "vitest"

// App
import { recordTabHrefOf, recordTabOf } from "./affiliate-record-tab"

describe("the affiliate record's tab, in the address (12/11/2026)", () => {
  it("reads the tab the address names, and Geral for none or a word it does not know", () => {
    expect(recordTabOf("financeiro")).toBe("financeiro")
    expect(recordTabOf(null)).toBe("geral")
    expect(recordTabOf("extrato")).toBe("geral")
  })

  it("spells each tab's address, Geral being the record's own", () => {
    expect(recordTabHrefOf("/admin/loja/affiliates/a1", "geral")).toBe("/admin/loja/affiliates/a1")
    expect(recordTabHrefOf("/admin/loja/affiliates/a1", "pedidos")).toBe("/admin/loja/affiliates/a1?aba=pedidos")
  })
})
