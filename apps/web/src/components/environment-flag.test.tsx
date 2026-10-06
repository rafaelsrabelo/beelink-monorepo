// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// App
import { EnvironmentFlag } from "./environment-flag"

describe("EnvironmentFlag", () => {
  it("says which deployment this is, to a reader as well", () => {
    render(<EnvironmentFlag label="Ambiente de homologação" />)

    expect(screen.getByRole("status")).toHaveTextContent("Ambiente de homologação")
  })

  // It hangs over headers and buttons on every page: it may cover them, never take their clicks.
  it("stays over the page without taking its clicks or its room", () => {
    render(<EnvironmentFlag label="Ambiente de homologação" />)

    expect(screen.getByRole("status")).toHaveClass("fixed", "pointer-events-none")
  })
})
