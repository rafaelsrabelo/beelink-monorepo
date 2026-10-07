// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { GOOGLE_ANALYTICS_HOME } from "./integrations.fixtures"
import { GoogleAnalyticsReports } from "./google-analytics-reports"

describe("GoogleAnalyticsReports", () => {
  it("says the reports stay at Google Analytics, and leads there in another tab that cannot reach back", async () => {
    const { container } = render(<GoogleAnalyticsReports analyticsHref={GOOGLE_ANALYTICS_HOME} />)

    const card = within(screen.getByRole("region", { name: "Os relatórios ficam no Google Analytics" }))
    expect(card.getByText(/O bee-link não mostra os números do Google Analytics\./)).toBeInTheDocument()
    const link = card.getByRole("link", { name: "Ver os relatórios no Google Analytics (abre em nova aba)" })
    expect(link).toHaveAttribute("href", GOOGLE_ANALYTICS_HOME)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<GoogleAnalyticsReports analyticsHref={GOOGLE_ANALYTICS_HOME} messages={en} />)

    expect(screen.getByRole("link", { name: "See the reports at Google Analytics (opens in a new tab)" })).toBeInTheDocument()
  })
})
