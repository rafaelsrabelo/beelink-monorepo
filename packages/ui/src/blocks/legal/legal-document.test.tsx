// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LegalDocument } from "./legal-document"
import { sampleLegalDocument } from "./legal-document.fixtures"

describe("LegalDocument", () => {
  it("draws the title, the day it took effect and each section numbered, in order", () => {
    render(<LegalDocument content={sampleLegalDocument} />)

    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeInTheDocument()
    expect(screen.getByText("Vigente desde 30 de setembro de 2026")).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["1. Quem cuida dos seus dados", "2. Seus direitos"])
  })

  it("keeps each section's paragraphs and lists inside its own region", () => {
    render(<LegalDocument content={sampleLegalDocument} />)

    const first = screen.getByRole("region", { name: "1. Quem cuida dos seus dados" })
    expect(within(first).getByText(/a loja é a controladora/)).toBeInTheDocument()
    expect(within(first).getAllByRole("listitem")).toHaveLength(3)
  })

  it("declares the language the text is written in, whatever the page is read in", () => {
    render(<LegalDocument content={sampleLegalDocument} />)

    expect(screen.getByRole("article")).toHaveAttribute("lang", "pt-BR")
  })

  /** In a dialog the title and the day are the dialog's name and description, and are not said twice. */
  it("leaves the title and the day to whatever holds it when headless, and sets its sections a level down", () => {
    render(<LegalDocument content={sampleLegalDocument} headless />)

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
    expect(screen.queryByText("Vigente desde 30 de setembro de 2026")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["1. Quem cuida dos seus dados", "2. Seus direitos"])
    expect(screen.getByText("Esta política explica quais dados o bee-link guarda, para quê e por quanto tempo.")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "1. Quem cuida dos seus dados" })).getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByRole("article")).toHaveAttribute("lang", "pt-BR")
  })

  it("has no accessibility violations, whole or headless", async () => {
    const whole = render(<LegalDocument content={sampleLegalDocument} />)
    await expectNoA11yViolations(whole.container)
    whole.unmount()

    const headless = render(<LegalDocument content={sampleLegalDocument} headless />)
    await expectNoA11yViolations(headless.container)
  })
})
