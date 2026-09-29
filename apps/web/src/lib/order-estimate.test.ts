// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { estimateLineOf } from "./order-estimate"

describe("estimateLineOf", () => {
  it("says a window of days, the month once when both share it", () => {
    expect(estimateLineOf({ from: "2026-09-24", to: "2026-09-25" }, "pt-BR", ptBR)).toBe("Chega entre qui., 24 e sex., 25 de set.")
    expect(estimateLineOf({ from: "2026-09-30", to: "2026-10-02" }, "pt-BR", ptBR)).toBe("Chega entre qua., 30 de set. e sex., 2 de out.")
  })

  it("says a single day as one", () => {
    expect(estimateLineOf({ from: "2026-09-25", to: "2026-09-25" }, "pt-BR", ptBR)).toBe("Chega sex., 25 de set.")
  })
})
