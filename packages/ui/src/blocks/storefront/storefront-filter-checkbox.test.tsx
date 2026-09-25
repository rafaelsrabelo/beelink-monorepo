// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFilterCheckbox } from "./storefront-filter-checkbox"

describe("StorefrontFilterCheckbox", () => {
  it("is a link a reader hears as a checkbox, on or off, named with its count", () => {
    const { rerender } = render(<StorefrontFilterCheckbox label="Chocolate" href="/loja/produtos?opcao=Sabor%3AChocolate" count={1200} selected={false} locale="pt-BR" />)

    const box = screen.getByRole("checkbox", { name: "Chocolate (1.200)" })
    expect(box).toHaveAttribute("href", "/loja/produtos?opcao=Sabor%3AChocolate")
    expect(box).toHaveAttribute("aria-checked", "false")

    rerender(<StorefrontFilterCheckbox label="Chocolate" href="/loja/produtos" count={1200} selected locale="pt-BR" />)
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFilterCheckbox label="Chocolate" href="#" count={3} selected locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
