// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountLink } from "./storefront-account-link"

describe("StorefrontAccountLink", () => {
  it("invites a signed-out shopper to sign in", () => {
    render(<StorefrontAccountLink href="/loja/entrar" name={null} />)

    expect(screen.getByRole("link", { name: "Olá, entre — Minha conta" })).toHaveAttribute("href", "/loja/entrar")
  })

  it("greets a signed-in shopper by first name, and leads to their page", () => {
    render(<StorefrontAccountLink href="/loja/conta" name="  Bia Cliente Souza " />)

    expect(screen.getByRole("link", { name: "Olá, Bia — Minha conta" })).toHaveAttribute("href", "/loja/conta")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAccountLink href="#" name="Bia" />)

    await expectNoA11yViolations(container)
  })
})
