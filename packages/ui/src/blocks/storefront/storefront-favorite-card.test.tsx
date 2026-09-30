// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoriteCard, type StorefrontFavoriteCardProps } from "./storefront-favorite-card"

const card: StorefrontFavoriteCardProps = {
  name: "Pré-Treino Haze 600g",
  href: "/loja/produtos/haze?variant=v",
  imageUrl: null,
  variantLabel: "Sabor: Uva",
  priceCents: 20990,
  beforeCents: 23990,
  dropCents: 3000,
  likedOn: "18 set",
  soldOut: false,
  action: <button type="button">Adicionar ao carrinho</button>,
  remove: { action: "/loja/api/customer/favoritos", fields: { produto: "p-1", retorno: "/loja/conta/favoritos" } },
  locale: "pt-BR",
}

describe("StorefrontFavoriteCard", () => {
  it("says what it dropped since it was liked, today's price beside the old one, and when it was liked", () => {
    render(<StorefrontFavoriteCard {...card} />)

    expect(screen.getByRole("link", { name: "Pré-Treino Haze 600g" })).toHaveAttribute("href", "/loja/produtos/haze?variant=v")
    expect(screen.getByText("Sabor: Uva")).toBeInTheDocument()
    expect(screen.getByText(/Baixou R\$\s30,00 desde que você curtiu/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s239,90/)).toBeInTheDocument()
    expect(screen.getByText("Curtido em 18 set")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar ao carrinho" })).toBeInTheDocument()
  })

  it("removes it with a form that works without a script", () => {
    const { container } = render(<StorefrontFavoriteCard {...card} />)

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "post")
    expect(form).toHaveAttribute("action", "/loja/api/customer/favoritos")
    expect(Object.fromEntries(new FormData(form!))).toEqual({ produto: "p-1", retorno: "/loja/conta/favoritos" })
    expect(screen.getByRole("button", { name: "Remover Pré-Treino Haze 600g dos favoritos" })).toHaveAttribute("type", "submit")
  })

  it("offers the notice instead of the cart once sold out, and no seal without a drop", () => {
    render(<StorefrontFavoriteCard {...card} soldOut dropCents={0} beforeCents={null} />)

    expect(screen.getByText("Esgotado · avise-me")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Adicionar ao carrinho" })).not.toBeInTheDocument()
    expect(screen.queryByText(/desde que você curtiu/)).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoriteCard {...card} />)
    await expectNoA11yViolations(container)
  })
})
