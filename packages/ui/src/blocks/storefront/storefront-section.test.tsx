// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { en } from "../../locales/en"
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSection } from "./storefront-section"

function renderSection(overrides: Partial<Parameters<typeof StorefrontSection>[0]> = {}) {
  return render(
    <StorefrontSection title="Destaques" moreHref="/lessari/produtos" {...overrides}>
      <p>Bolsa Amora</p>
    </StorefrontSection>,
  )
}

describe("StorefrontSection", () => {
  /**
   * The level arrives from whoever knows what sits above the band. A home of three `<h1>` is a
   * broken outline that axe cannot see, so nothing but this prop stands between it and the page.
   */
  it("takes its heading level from the page", () => {
    renderSection({ headingLevel: 3 })

    expect(screen.getByRole("heading", { level: 3, name: "Destaques" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  })

  it("sits under the page's own title by default", () => {
    renderSection()

    expect(screen.getByRole("heading", { level: 2, name: "Destaques" })).toBeInTheDocument()
  })

  /** An unnamed `<section>` is no landmark at all, and a home of three of them cannot be skipped. */
  it("names itself as a landmark and keeps what runs inside it", () => {
    renderSection()

    const band = screen.getByRole("region", { name: "Destaques" })
    expect(within(band).getByText("Bolsa Amora")).toBeInTheDocument()
    expect(within(band).getByRole("heading", { name: "Destaques" })).toBeInTheDocument()
  })

  it("points the way in at the band's real page", () => {
    renderSection()

    expect(screen.getByRole("link", { name: "Ver tudo em Destaques" })).toHaveAttribute(
      "href",
      "/lessari/produtos",
    )
  })

  /**
   * The visible words are the same two in every band, so the accessible name is what tells them
   * apart: a reader listing the links of a home otherwise hears "Ver todos" three times (WCAG
   * 2.4.4).
   */
  it("gives every band on one home a different accessible name", () => {
    render(
      <>
        <StorefrontSection title="Destaques" moreHref="/lessari/produtos">
          <p>um</p>
        </StorefrontSection>
        <StorefrontSection title="Categorias" moreHref="/lessari/categorias">
          <p>dois</p>
        </StorefrontSection>
      </>,
    )

    const names = screen.getAllByRole("link").map((link) => link.getAttribute("aria-label"))
    expect(names).toEqual(["Ver tudo em Destaques", "Ver tudo em Categorias"])
    expect(new Set(screen.getAllByRole("link").map((link) => link.textContent))).toEqual(
      new Set(["Ver todos"]),
    )
  })

  /** The dictionary is data: `{section}` is filled here, because a template cannot be a function. */
  it("fills the placeholder out of whichever dictionary it was handed", () => {
    renderSection({ messages: en })

    expect(screen.getByRole("link", { name: "See everything in Destaques" })).toHaveTextContent(
      "See all",
    )
  })

  it("lets a band say something other than the default, without losing the unique name", () => {
    renderSection({ moreLabel: "Ver a loja inteira" })

    const link = screen.getByRole("link", { name: "Ver tudo em Destaques" })
    expect(link).toHaveTextContent("Ver a loja inteira")
  })

  /**
   * Nowhere to send them is a band with no link, not a link that goes nowhere. The words have to
   * go too: an `<a>` with no `href` is no link to the accessibility tree, so it would leave "Ver
   * todos" on the screen as something that looks clickable and answers no one.
   */
  it("renders no link at all when the band has no page behind it", () => {
    renderSection({ moreHref: undefined })

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByText("Ver todos")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Destaques" })).toBeInTheDocument()
  })

  it("says nothing under the heading when there is nothing to say", () => {
    const { rerender } = renderSection({ description: "O que mais sai desta semana." })
    expect(screen.getByText("O que mais sai desta semana.")).toBeInTheDocument()

    rerender(
      <StorefrontSection title="Destaques" moreHref="/lessari/produtos">
        <p>Bolsa Amora</p>
      </StorefrontSection>,
    )
    expect(screen.queryByText("O que mais sai desta semana.")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <StorefrontSection title="Destaques" description="O que mais sai." moreHref="/lessari/produtos">
          <p>Bolsa Amora</p>
        </StorefrontSection>
        <StorefrontSection title="Categorias" moreHref="/lessari/categorias">
          <p>Promoções</p>
        </StorefrontSection>
      </>,
    )

    await expectNoA11yViolations(container)
  })
})
