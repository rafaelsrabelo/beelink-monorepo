// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoritesHint } from "./storefront-favorites-hint"

describe("StorefrontFavoritesHint", () => {
  it("says the notices go by e-mail, and where to change them", () => {
    render(<StorefrontFavoritesHint on settingsHref="/loja/conta/perfil#avisos" />)

    expect(screen.getByText("Te avisamos por e-mail quando um favorito baixar de preço ou voltar ao estoque.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Mudar avisos" })).toHaveAttribute("href", "/loja/conta/perfil#avisos")
  })

  it("says they are off, and offers to turn them on", () => {
    render(<StorefrontFavoritesHint on={false} settingsHref="/loja/conta/perfil#avisos" />)

    expect(screen.getByText("Os avisos de favoritos por e-mail estão desligados.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ligar avisos" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoritesHint on settingsHref="#" />)
    await expectNoA11yViolations(container)
  })
})
