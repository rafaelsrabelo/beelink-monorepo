// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoritesSort } from "./storefront-favorites-sort"

const orders = [
  { value: "recentes", label: "Curtidos recentemente" },
  { value: "menor-preco", label: "Menor preço" },
]

describe("StorefrontFavoritesSort", () => {
  it("is a GET form on the tab that keeps the filter chosen", () => {
    const { container } = render(<StorefrontFavoritesSort action="/loja/conta/favoritos" name="ordem" value="menor-preco" orders={orders} hidden={{ filtro: "baixou" }} />)

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/loja/conta/favoritos")
    expect(screen.getByRole("combobox", { name: "Ordenar" })).toHaveValue("menor-preco")
    expect(Object.fromEntries(new FormData(form!))).toEqual({ filtro: "baixou", ordem: "menor-preco" })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoritesSort action="#" name="ordem" value="recentes" orders={orders} />)
    await expectNoA11yViolations(container)
  })
})
