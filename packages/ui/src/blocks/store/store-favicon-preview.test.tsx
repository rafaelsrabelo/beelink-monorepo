// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreFaviconPreview } from "./store-favicon-preview"

const icon = "https://cdn.exemplo.com/icone.png"
const logo = "https://cdn.exemplo.com/logo.png"
const platform = "/icon.png"

describe("StoreFaviconPreview", () => {
  it("draws the shop's icon beside its name, and says the tab shows it", () => {
    render(<StoreFaviconPreview faviconUrl={icon} logoUrl={logo} platformIconUrl={platform} title="Doces da Ana" />)

    expect(screen.getByTestId("favicon-preview-image")).toHaveAttribute("src", icon)
    expect(screen.getByText("Doces da Ana")).toBeInTheDocument()
    expect(screen.getByText("A aba mostra o ícone da loja.")).toBeInTheDocument()
  })

  it("draws the logo while the shop has no icon, and says so", () => {
    render(<StoreFaviconPreview faviconUrl="" logoUrl={logo} platformIconUrl={platform} title="Doces da Ana" />)

    expect(screen.getByTestId("favicon-preview-image")).toHaveAttribute("src", logo)
    expect(screen.getByText("Sem ícone, a aba mostra a logo da loja.")).toBeInTheDocument()
  })

  it("draws the platform's with neither, and a neutral glyph where it was handed none", () => {
    const { rerender } = render(<StoreFaviconPreview faviconUrl="" logoUrl="" platformIconUrl={platform} title="Doces da Ana" />)

    expect(screen.getByTestId("favicon-preview-image")).toHaveAttribute("src", platform)
    expect(screen.getByText("Sem ícone e sem logo, a aba mostra o ícone da Beelink.")).toBeInTheDocument()

    rerender(<StoreFaviconPreview faviconUrl="" logoUrl="" title="Doces da Ana" />)

    expect(screen.queryByTestId("favicon-preview-image")).not.toBeInTheDocument()
  })

  it("never crops the picture: a logo standing in may not be square", () => {
    render(<StoreFaviconPreview faviconUrl="" logoUrl={logo} title="Doces da Ana" />)

    expect(screen.getByTestId("favicon-preview-image")).toHaveClass("object-contain", "size-4")
  })

  it("titles the tab with a stand-in while the name is empty, and speaks English when handed it", () => {
    render(<StoreFaviconPreview faviconUrl={icon} logoUrl="" title="  " messages={en} />)

    expect(screen.getByText("Your shop")).toBeInTheDocument()
    expect(screen.getByText("The tab shows the shop's icon.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StoreFaviconPreview faviconUrl={icon} logoUrl={logo} title="Doces da Ana" />)

    await expectNoA11yViolations(container)
  })
})
