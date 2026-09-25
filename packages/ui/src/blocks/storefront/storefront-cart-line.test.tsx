// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCartLine } from "./storefront-cart-line"

const row = { key: "blusa", name: "Blusa", href: "/loja/produtos/blusa", variantLabel: null, imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: true }

describe("StorefrontCartLine", () => {
  it("never goes below one — taking a line out is the bin's job", () => {
    render(
      <ul>
        <StorefrontCartLine row={row} locale="pt-BR" />
      </ul>,
    )

    expect(screen.getByRole("button", { name: "Diminuir a quantidade de Blusa" })).toBeDisabled()
    expect(screen.getByRole("group", { name: "Quantidade: Blusa" })).toHaveTextContent("1")
  })

  it("stops at the most one line may hold", () => {
    render(
      <ul>
        <StorefrontCartLine row={{ ...row, qty: 99 }} locale="pt-BR" />
      </ul>,
    )

    expect(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ul>
        <StorefrontCartLine row={row} locale="pt-BR" />
      </ul>,
    )

    await expectNoA11yViolations(container)
  })
})
