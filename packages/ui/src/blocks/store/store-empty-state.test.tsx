// React
import type { ComponentProps } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreEmptyState } from "./store-empty-state"

describe("StoreEmptyState", () => {
  it("says what is missing and offers the one way out of it", () => {
    render(<StoreEmptyState createHref="/criar-loja" />)

    expect(screen.getByText("Você ainda não tem uma loja")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Criar minha loja" })).toHaveAttribute(
      "href",
      "/criar-loja",
    )
  })

  it("navigates through the link the app injects, not one of its own", () => {
    const Link = ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
      <a href={href} data-testid="app-link" {...props} />
    )
    render(<StoreEmptyState createHref="/criar-loja" linkComponent={Link} />)

    expect(screen.getByTestId("app-link")).toBeInTheDocument()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<StoreEmptyState createHref="/create-store" messages={en} />)

    expect(screen.getByRole("link", { name: "Create my shop" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StoreEmptyState createHref="/criar-loja" />)

    await expectNoA11yViolations(container)
  })
})
