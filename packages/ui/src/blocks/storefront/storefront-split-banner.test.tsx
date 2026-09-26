// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSplitBanner } from "./storefront-split-banner"

const item = { id: "s", imageUrl: "https://cdn/capa.jpg", title: "Nova coleção", subtitle: "Chegou o inverno", href: "/loja/inverno" }

describe("StorefrontSplitBanner", () => {
  it("writes the words beside the picture, with a button where the banner leads", () => {
    render(<StorefrontSplitBanner item={item} />)

    expect(screen.getByRole("heading", { name: "Nova coleção" })).toBeInTheDocument()
    expect(screen.getByText("Chegou o inverno")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Saiba mais sobre Nova coleção" })).toHaveAttribute("href", "/loja/inverno")
  })

  // A third of a band has no room for two columns and a 36px title.
  it("stacks, and titles smaller, in a slice narrower than the band", () => {
    const { container } = render(<StorefrontSplitBanner item={item} span="THIRD" />)

    expect(container.firstElementChild?.className).not.toContain("grid-cols-2")
    expect(screen.getByRole("heading", { name: "Nova coleção" })).toHaveClass("text-lg")
  })

  it("offers no button where the banner leads nowhere", () => {
    render(<StorefrontSplitBanner item={{ ...item, href: null }} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("draws nothing without a picture", () => {
    const { container } = render(<StorefrontSplitBanner item={{ ...item, imageUrl: "" }} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontSplitBanner item={item} />)

    await expectNoA11yViolations(container)
  })
})
