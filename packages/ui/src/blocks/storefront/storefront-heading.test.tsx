// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontHeading } from "./storefront-heading"

describe("StorefrontHeading", () => {
  it("draws the sign the shopkeeper wrote", () => {
    render(<StorefrontHeading title="Novidades" subtitle="Desta semana" />)

    expect(screen.getByRole("heading", { name: "Novidades" })).toBeInTheDocument()
    expect(screen.getByText("Desta semana")).toBeInTheDocument()
  })

  // A landing page that shows a bare rule where a heading will go is worse than one that shows
  // nothing yet.
  it("draws nothing while it is still empty", () => {
    const { container } = render(<StorefrontHeading />)

    expect(container).toBeEmptyDOMElement()
  })

  it("is never an h1: the page already spent that on the shop's own name", () => {
    render(<StorefrontHeading title="Novidades" />)

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument()
  })

  it("takes the level the page gives it", () => {
    render(<StorefrontHeading title="Novidades" as="h3" />)

    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontHeading title="Novidades" subtitle="Desta semana" />)

    await expectNoA11yViolations(container)
  })
})
