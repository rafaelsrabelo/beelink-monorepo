// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { MetaPixelReportLink } from "./meta-pixel-report-link"

const HREF = "/admin/doces-da-ana/reports/origins"

describe("MetaPixelReportLink", () => {
  it("leads to the sales by origin, inside the panel, and says it needs no pixel", async () => {
    const { container } = render(<MetaPixelReportLink href={HREF} />)

    const card = within(screen.getByRole("region", { name: "Vendas por campanha" }))
    const link = card.getByRole("link", { name: "Ver vendas por origem" })
    expect(link).toHaveAttribute("href", HREF)
    expect(link).not.toHaveAttribute("target")
    expect(card.getByText(/Funciona com ou sem pixel\./)).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<MetaPixelReportLink href={HREF} messages={en} />)

    expect(screen.getByRole("link", { name: "See sales by origin" })).toBeInTheDocument()
  })
})
