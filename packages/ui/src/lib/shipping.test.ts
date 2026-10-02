// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { distanceText, minutesWindowText } from "./shipping"

const text = ptBR.storefront

describe("a quoted window in words (BEELINK-178)", () => {
  it("keeps minutes below two hours, a range or a single number", () => {
    expect(minutesWindowText(30, 50, text)).toBe("30–50 min")
    expect(minutesWindowText(45, 45, text)).toBe("45 min")
  })

  it("speaks hours from two hours up and days from two days up, rounding outwards", () => {
    expect(minutesWindowText(90, 150, text)).toBe("1–3 h")
    expect(minutesWindowText(120, 120, text)).toBe("2 h")
    expect(minutesWindowText(1440, 4320, text)).toBe("1–3 dias")
    expect(minutesWindowText(2880, 2880, text)).toBe("2 dias")
  })
})

describe("a distance in words", () => {
  it("speaks metres under a kilometre and kilometres to one decimal from there", () => {
    expect(distanceText(800, "pt-BR")).toBe("800 m")
    expect(distanceText(2603, "pt-BR")).toBe("2,6 km")
    expect(distanceText(8000, "pt-BR")).toBe("8 km")
  })
})
