// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { GOOGLE_ANALYTICS_HOME } from "./integrations.fixtures"
import { GoogleAnalyticsGuide } from "./google-analytics-guide"

describe("GoogleAnalyticsGuide", () => {
  /** Administrador → Fluxos de dados → o fluxo da Web → o ID, by the names Google's own help gives the menus. */
  it("says where the ID is copied from at Google Analytics, one step at a time, in order", async () => {
    const { container } = render(<GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} />)

    const guide = within(screen.getByRole("region", { name: "Onde encontrar o ID de medição" }))
    const steps = within(guide.getAllByRole("list")[0]!).getAllByRole("listitem")
    expect(steps.map((step) => step.textContent)).toEqual([
      "Abra o Google Analytics, com a conta que cuida da propriedade da sua loja.",
      "Clique em Administrador, a engrenagem no canto de baixo, à esquerda.",
      "Em Configurações da propriedade, entre em Fluxos de dados.",
      "Escolha o fluxo da Web da sua loja. Se você ainda não tem um, crie por lá antes.",
      "Em Detalhes do fluxo, copie o ID de métricas, que começa com G-, e cole no campo desta página.",
    ])
    await expectNoA11yViolations(container)
  })

  it("leads to Google Analytics in another tab that cannot reach back into the panel", () => {
    render(<GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} />)

    const link = screen.getByRole("link", { name: "Abrir o Google Analytics (abre em nova aba)" })
    expect(link).toHaveAttribute("href", GOOGLE_ANALYTICS_HOME)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("says that only a GA4 ID serves, and that nobody checks it against Google", () => {
    render(<GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} />)

    const notes = within(screen.getByRole("heading", { level: 3, name: "Bom saber" }).parentElement!)
    expect(notes.getAllByRole("listitem").map((note) => note.textContent)).toEqual([
      "Só serve o ID do Google Analytics 4, que começa com G-. Os do Universal Analytics (UA-), do Tag Manager (GTM-) e do Google Ads (AW-) não servem aqui.",
      "O bee-link não tem como conferir o ID com o Google. Copie e cole o ID, em vez de digitar.",
    ])
  })

  it("speaks the language it is handed", () => {
    render(<GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} messages={en} />)

    expect(screen.getByRole("region", { name: "Where to find the measurement ID" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Google Analytics (opens in a new tab)" })).toBeInTheDocument()
    expect(screen.getByText(/^Under Stream details, copy the Measurement ID/)).toBeInTheDocument()
  })
})
