// Libs
import { describe, expect, it } from "vitest"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// Lib
import { markAsLabelOf, orderStatusLabelOf } from "./order-status-label"

describe("orderStatusLabelOf", () => {
  it("names a pick-up's last two steps as the shop and the customer say them", () => {
    expect(orderStatusLabelOf("OUT_FOR_DELIVERY", "PICKUP", defaultMessages)).toBe("Pronto para retirar")
    expect(orderStatusLabelOf("DELIVERED", "PICKUP", defaultMessages)).toBe("Retirado")
    expect(orderStatusLabelOf("PREPARING", "PICKUP", defaultMessages)).toBe("Em preparo")
  })

  it("leaves a delivery's words as they were", () => {
    expect(orderStatusLabelOf("OUT_FOR_DELIVERY", "DELIVERY", defaultMessages)).toBe("Saiu para entrega")
    expect(orderStatusLabelOf("DELIVERED", "DELIVERY", defaultMessages)).toBe("Entregue")
  })
})

describe("markAsLabelOf", () => {
  it("words the button as the status it leads to", () => {
    expect(markAsLabelOf("OUT_FOR_DELIVERY", "PICKUP", defaultMessages)).toBe("Marcar como pronto para retirar")
    expect(markAsLabelOf("DELIVERED", "PICKUP", defaultMessages)).toBe("Marcar como retirado")
    expect(markAsLabelOf("OUT_FOR_DELIVERY", "DELIVERY", defaultMessages)).toBe("Marcar como saiu para entrega")
    expect(markAsLabelOf("ACCEPTED", "PICKUP", defaultMessages)).toBe("Marcar como aceito")
  })
})
