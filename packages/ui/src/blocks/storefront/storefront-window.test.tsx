// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleStoreColors } from "../store/store.fixtures"
import { StorefrontWindow } from "./storefront-window"

// Read from the fixtures, which read from JSON: `web/no-hex-colors` scans this file too, and it
// is right to — a colour written into a module is a token that escaped.
const colors = sampleStoreColors

function renderWindow(overrides: Partial<Parameters<typeof StorefrontWindow>[0]> = {}) {
  return render(<StorefrontWindow name="Padaria da Ana" colors={colors} {...overrides} />)
}

describe("StorefrontWindow", () => {
  it("names the shop as the page's one heading", () => {
    renderWindow()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Padaria da Ana")
  })

  /**
   * The panel is ours and looks like us; the window is the shopkeeper's and must not. The colours
   * arrive as data and become custom properties, which is also why the no-hex-colors gate is
   * untroubled — it forbids a literal in source, and there is none.
   */
  it("wears the shop's own colours, from data", () => {
    const { container } = renderWindow()
    const dressed = container.firstElementChild as HTMLElement

    expect(dressed.style.getPropertyValue("--shop-primary")).toBe(colors.primary)
    expect(dressed.style.getPropertyValue("--shop-background")).toBe(colors.background)
    // Not a token: what is asserted is that the shop's own value reached the page.
    expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it("offers the order button only when the shop has a WhatsApp to send it to", () => {
    renderWindow()
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument()

    renderWindow({ orderHref: "https://wa.me/5585999998888" })
    expect(screen.getByRole("link", { name: "Fazer pedido no WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/5585999998888",
    )
  })

  // An icon with no words announces itself as "link" and nothing else.
  it("names each network, so a row of icons is not a row of unlabelled links", () => {
    renderWindow({
      links: [
        { network: "instagram", href: "https://instagram.com/padaria" },
        { network: "tiktok", href: "https://tiktok.com/@padaria" },
      ],
    })

    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/padaria",
    )
    expect(screen.getByRole("link", { name: "TikTok" })).toBeInTheDocument()
  })

  it("shows the banner the shopkeeper supplied, and a coloured bar when there is none", () => {
    const { container: withBanner } = renderWindow({ bannerImageUrl: "https://cdn/banner.png" })
    expect(withBanner.querySelector("img[src='https://cdn/banner.png']")).not.toBeNull()

    const { container: without } = renderWindow()
    expect(without.querySelector("img")).toBeNull()
  })

  /**
   * Decorative, deliberately: the shop's name is the heading below it, and a described banner
   * makes a screen reader announce the name twice before saying anything useful.
   */
  it("hides the banner from a screen reader", () => {
    const { container } = renderWindow({ bannerImageUrl: "https://cdn/banner.png" })

    expect(container.querySelector("img[src='https://cdn/banner.png']")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("leaves the description out rather than printing an empty line", () => {
    renderWindow({ description: null })

    expect(screen.getByRole("heading", { level: 1 }).parentElement?.children).toHaveLength(1)
  })

  it("renders what the screen put under it", () => {
    renderWindow({ children: <p>O catálogo vem aqui</p> })

    expect(screen.getByText("O catálogo vem aqui")).toBeInTheDocument()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderWindow({ messages: en, orderHref: "https://wa.me/1" })

    expect(screen.getByRole("link", { name: "Order on WhatsApp" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontWindow
        name="Padaria da Ana"
        description="Pães e bolos feitos no dia."
        logoUrl="https://cdn/logo.png"
        bannerImageUrl="https://cdn/banner.png"
        colors={colors}
        orderHref="https://wa.me/5585999998888"
        links={[{ network: "instagram", href: "https://instagram.com/padaria" }]}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
