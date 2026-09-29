// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAddressCards, type StorefrontAddressCardsProps } from "./storefront-address-cards"

const home = {
  id: "a1",
  heading: "Casa · Rafael Souza",
  lines: ["Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles, Fortaleza/CE", "60160-230"],
  isDefault: true,
  editHref: "/loja/conta/perfil?endereco=a1",
}
const work = {
  id: "a2",
  heading: "Trabalho · Rafael Souza",
  lines: ["Av. Santos Dumont, 3000, sala 1104", "Aldeota, Fortaleza/CE", "60150-162"],
  isDefault: false,
  editHref: "/loja/conta/perfil?endereco=a2",
}

function cards(props: Partial<StorefrontAddressCardsProps> = {}) {
  return (
    <StorefrontAddressCards
      addresses={[home, work]}
      addHref="/loja/conta/perfil?endereco=novo"
      limit={10}
      removeAction="/loja/api/customer/enderecos/remover"
      defaultAction="/loja/api/customer/enderecos/padrao"
      hidden={{ retorno: "/loja/conta/perfil" }}
      {...props}
    />
  )
}

describe("StorefrontAddressCards", () => {
  it("shows each address, the default marked, with its own edit, remove and make-default", () => {
    render(cards())

    const [add, first, second] = screen.getAllByRole("listitem")
    expect(within(add!).getByRole("link", { name: "Adicionar endereço" })).toHaveAttribute("href", "/loja/conta/perfil?endereco=novo")
    expect(within(first!).getByText("Padrão")).toBeInTheDocument()
    expect(within(first!).getByText("Meireles, Fortaleza/CE")).toBeInTheDocument()
    expect(within(first!).getByRole("link", { name: "Editar o endereço Casa · Rafael Souza" })).toHaveAttribute("href", home.editHref)
    // The default is already the default: only the others offer it.
    expect(within(first!).queryByRole("button", { name: /Tornar padrão/ })).toBeNull()

    const remove = within(second!).getByRole("button", { name: "Remover o endereço Trabalho · Rafael Souza" })
    const form = remove.closest("form")!
    expect(form).toHaveAttribute("action", "/loja/api/customer/enderecos/remover")
    expect(form.querySelector('input[name="id"]')).toHaveValue("a2")
    expect(form.querySelector('input[name="retorno"]')).toHaveValue("/loja/conta/perfil")
    expect(within(second!).getByRole("button", { name: "Tornar padrão o endereço Trabalho · Rafael Souza" }).closest("form")).toHaveAttribute(
      "action",
      "/loja/api/customer/enderecos/padrao",
    )
  })

  it("stops offering another once the shopper keeps the most, and says why", () => {
    render(cards({ addHref: null }))

    expect(screen.queryByRole("link", { name: "Adicionar endereço" })).toBeNull()
    expect(screen.getByText("Você já tem 10 endereços, o máximo. Remova um para adicionar outro.")).toBeInTheDocument()
  })

  it("says what the last change came back with", () => {
    const { rerender } = render(cards({ notice: "O endereço foi removido." }))
    expect(screen.getByRole("status")).toHaveTextContent("O endereço foi removido.")

    rerender(cards({ error: "Esse endereço não está mais na sua conta." }))
    expect(screen.getByRole("alert")).toHaveTextContent("Esse endereço não está mais na sua conta.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(cards({ notice: "Pronto, o endereço foi salvo." }))
    await expectNoA11yViolations(container)
  })
})
