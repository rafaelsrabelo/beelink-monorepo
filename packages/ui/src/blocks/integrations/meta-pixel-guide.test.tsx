// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { META_EVENTS_MANAGER } from "./integrations.fixtures"
import { MetaPixelGuide } from "./meta-pixel-guide"

describe("MetaPixelGuide", () => {
  it("says where the ID is copied from at Meta, one step at a time, in order", async () => {
    const { container } = render(<MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} />)

    const guide = within(screen.getByRole("region", { name: "Onde encontrar o ID do pixel" }))
    const steps = within(guide.getAllByRole("list")[0]!).getAllByRole("listitem")
    expect(steps.map((step) => step.textContent)).toEqual([
      "Abra o Gerenciador de Eventos da Meta, com a conta que cuida dos seus anúncios.",
      "No menu, entre em Fontes de dados.",
      "Escolha o pixel da sua loja. A Meta também chama o pixel de conjunto de dados. Se você ainda não tem um, crie por lá antes.",
      "Copie o ID, o número que aparece junto do nome do pixel, e cole no campo desta página.",
    ])
    await expectNoA11yViolations(container)
  })

  it("leads to Events Manager in another tab that cannot reach back into the panel", () => {
    render(<MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} />)

    const link = screen.getByRole("link", { name: "Abrir o Gerenciador de Eventos (abre em nova aba)" })
    expect(link).toHaveAttribute("href", META_EVENTS_MANAGER)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  /** BEELINK-268: shops share one domain, and none of them could verify it at Meta — nor needs to. */
  it("says the domain needs no verifying at Meta, and that reports and ads stay there", () => {
    render(<MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} />)

    const notes = within(screen.getByRole("heading", { level: 3, name: "Bom saber" }).parentElement!)
    expect(notes.getAllByRole("listitem").map((note) => note.textContent)).toEqual([
      "Você não precisa verificar o domínio na Meta para usar o pixel na sua loja.",
      "Os relatórios e a criação dos anúncios continuam na Meta: o bee-link não mostra o resultado dos anúncios.",
      "O bee-link não tem como conferir o ID com a Meta. Copie e cole o número, em vez de digitar.",
    ])
  })

  it("speaks the language it is handed", () => {
    render(<MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} messages={en} />)

    expect(screen.getByRole("region", { name: "Where to find the pixel ID" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Events Manager (opens in a new tab)" })).toBeInTheDocument()
    expect(screen.getByText("You do not need to verify the domain at Meta to use the pixel on your shop.")).toBeInTheDocument()
  })
})
