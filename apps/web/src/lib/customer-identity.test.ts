// Libs
import { describe, expect, it } from "vitest"

// App
import { birthDateLineOf, cpfLineOf } from "./customer-identity"

describe("the CPF and the birth date as a person reads them", () => {
  it("writes the CPF's eleven digits with its points and dash", () => {
    expect(cpfLineOf("52998224725")).toBe("529.982.247-25")
    expect(cpfLineOf(null)).toBeNull()
  })

  it("writes the birth date in the reader's language, the same day wherever the reader is", () => {
    expect(birthDateLineOf("1990-05-17", "pt-BR")).toBe("17/05/1990")
    expect(birthDateLineOf("1990-05-17", "en")).toBe("05/17/1990")
    // Midnight UTC is still the day before in São Paulo: read as a local instant, this would be the 31st.
    expect(birthDateLineOf("2000-01-01", "pt-BR")).toBe("01/01/2000")
    expect(birthDateLineOf(null, "pt-BR")).toBeNull()
  })
})
