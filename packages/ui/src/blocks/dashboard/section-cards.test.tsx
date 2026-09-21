// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleCards } from "./dashboard.fixtures"
import { SectionCards } from "./section-cards"

describe("SectionCards", () => {
  it("shows every number it was handed, with its label and its footnote", () => {
    render(<SectionCards cards={sampleCards} />)

    expect(screen.getByText("Receita total")).toBeInTheDocument()
    expect(screen.getByText("R$ 1.250,00")).toBeInTheDocument()
    expect(screen.getByText("Comparado ao mês passado")).toBeInTheDocument()
    expect(screen.getAllByText("+12,5%")).toHaveLength(2)
  })

  it("leaves out the badge and the footnote a card does not have", () => {
    const { container } = render(<SectionCards cards={[{ label: "Contas criadas hoje", value: "27" }]} />)

    expect(screen.getByText("27")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=badge]")).toBeNull()
    expect(container.querySelector("[data-slot=card-footer]")).toBeNull()
  })

  it("turns the arrow around for a number that is falling", () => {
    // The direction is decorative — the sign is in the text the badge already shows — so the icon
    // is the only thing to assert on.
    const { container } = render(
      <SectionCards cards={[{ label: "Novas contas", value: "312", trend: "-8,2%" }]} />,
    )

    expect(screen.getByText("-8,2%")).toBeInTheDocument()
    expect(container.querySelector(".lucide-trending-down")).not.toBeNull()
    expect(container.querySelector(".lucide-trending-up")).toBeNull()
  })

  it("reads the sign off the trend even when it arrives padded", () => {
    const { container } = render(
      <SectionCards cards={[{ label: "Novas contas", value: "312", trend: " -8,2%" }]} />,
    )

    expect(container.querySelector(".lucide-trending-down")).not.toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<SectionCards cards={sampleCards} />)

    await expectNoA11yViolations(container)
  })
})
