// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateAreaNotice } from "./affiliate-area-notice"
import { AffiliateAreaShell } from "./affiliate-area-shell"
import { AffiliateAreaTabs } from "./affiliate-area-tabs"
import { home, orders, pausedHome, payouts, products, profile, shops } from "./affiliate-area.fixtures"
import { AffiliateHomePanel } from "./affiliate-home-panel"
import { AffiliateOrdersList } from "./affiliate-orders-list"
import { AffiliatePayoutsList } from "./affiliate-payouts-list"
import { AffiliateProductLinks } from "./affiliate-product-links"
import { AffiliateProfileForm } from "./affiliate-profile-form"
import { AffiliateShopCards } from "./affiliate-shop-cards"

const noop = () => {}

describe("the affiliate's own area (IMPULSEIA-108)", () => {
  it("lists the shops with their standing and balances, each a way in", async () => {
    const { container } = render(<AffiliateShopCards shops={shops} />)

    expect(screen.getByRole("heading", { name: "Lojas em que você vende" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Abrir Loja da Ana" })).toHaveAttribute("href", "/afiliado/loja-da-ana")
    expect(within(screen.getByRole("link", { name: "Abrir Doceria Mel" })).getByText("Encerrado")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says so when the account sells for no shop", () => {
    render(<AffiliateShopCards shops={[]} />)

    expect(screen.getByText("Você ainda não vende por nenhuma loja")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("frames the area with the account, the way to the panel only for whoever has a shop, and signing out", async () => {
    const onSignOut = vi.fn()
    const { container, rerender } = render(
      <AffiliateAreaShell user={{ name: "Maria Souza", email: "maria@exemplo.com" }} panelHref="/admin" onSignOut={onSignOut}>
        <p>conteúdo</p>
      </AffiliateAreaShell>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Sua conta" }))
    expect(await screen.findByRole("menuitem", { name: "Painel da loja" })).toHaveAttribute("href", "/admin")
    await userEvent.click(screen.getByRole("menuitem", { name: "Sair" }))
    expect(onSignOut).toHaveBeenCalled()
    await expectNoA11yViolations(container)

    rerender(
      <AffiliateAreaShell user={{ name: "Maria Souza", email: "maria@exemplo.com" }} panelHref={null} onSignOut={onSignOut}>
        <p>conteúdo</p>
      </AffiliateAreaShell>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Sua conta" }))
    expect(await screen.findByRole("menuitem", { name: "Sair" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Painel da loja" })).not.toBeInTheDocument()
  })

  it("marks the open section, each one an address", () => {
    render(<AffiliateAreaTabs active="orders" tabs={["home", "orders", "statement", "profile"]} hrefOf={(tab) => `?aba=${tab}`} />)

    expect(screen.getByRole("link", { name: "Vendas" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "?aba=home")
    expect(screen.queryByRole("link", { name: "Produtos" })).not.toBeInTheDocument()
  })

  it("shows what is owed, the next payment, the link to copy and the numbers", async () => {
    const onCopy = vi.fn()
    const { container } = render(<AffiliateHomePanel home={home} copied={false} onCopy={onCopy} />)

    expect(screen.getByText("R$ 30,00")).toBeInTheDocument()
    expect(screen.getByText("30 de nov. · R$ 120,00")).toBeInTheDocument()
    expect(screen.getByText("Tabela Padrão · 10% por venda")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copiar o link de Seu link" }))
    expect(onCopy).toHaveBeenCalledWith("https://bee-link.com.br/loja-da-ana/maria")
    expect(screen.getByText("Visitas pelo link")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says why the link credits nobody now, and that it was copied", () => {
    render(<AffiliateHomePanel home={pausedHome} copied onCopy={noop} />)

    expect(screen.getByRole("status")).toHaveTextContent("A loja pausou a sua participação")
    expect(screen.getByText("Copiado!")).toBeInTheDocument()
  })

  it("lists each product's link and what it pays, searched by name", async () => {
    const onCopy = vi.fn()
    const onSearch = vi.fn()
    const { container } = render(<AffiliateProductLinks products={products} pager={{ page: 1, pageSize: 20, total: 2 }} search="" onSearch={onSearch} onPage={noop} copiedId={null} onCopy={onCopy} />)

    expect(screen.getByText("Você ganha 15%")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copiar o link de Chaveiro" }))
    expect(onCopy).toHaveBeenCalledWith("p2", "https://bee-link.com.br/loja-da-ana/produtos/chaveiro?afiliado=maria")
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar produto" }), "b")
    expect(onSearch).toHaveBeenCalledWith("b")
    await expectNoA11yViolations(container)
  })

  it("lists the orders with who bought and the commission, a reversed one struck through", async () => {
    const { container } = render(<AffiliateOrdersList orders={orders} pager={{ page: 1, pageSize: 20, total: 2 }} onPage={noop} />)

    expect(screen.getByText("Pedido #12 · Bia Souza")).toBeInTheDocument()
    expect(screen.getByText("R$ 4,00")).toHaveClass("line-through")
    expect(screen.getByText("Os pedidos feitos pelo seu link. Os dados de contato do cliente ficam só com a loja.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("pages a list only past one page", async () => {
    const onPage = vi.fn()
    const { rerender } = render(<AffiliatePayoutsList payouts={payouts} pager={{ page: 1, pageSize: 20, total: 1 }} onPage={onPage} />)

    expect(screen.getByText("Pix de novembro")).toBeInTheDocument()
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()

    rerender(<AffiliatePayoutsList payouts={payouts} pager={{ page: 1, pageSize: 1, total: 3 }} onPage={onPage} />)
    await userEvent.click(screen.getByRole("button", { name: "Mais antigos" }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it("edits their data, and once ended keeps only the Pix key and the phone", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const { container, rerender } = render(<AffiliateProfileForm value={profile} onChange={onChange} onSubmit={onSubmit} name="Maria Souza" error="Confira os campos" />)

    expect(screen.getByText("22 de 100 caracteres. Aparece embaixo do seu nome na loja.")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Chave Pix"), "x")
    expect(onChange).toHaveBeenLastCalledWith({ ...profile, pixKey: "maria@pix.testx" })
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Confira os campos")
    await expectNoA11yViolations(container)

    rerender(<AffiliateProfileForm value={profile} onChange={onChange} onSubmit={onSubmit} name="Maria Souza" showcaseLocked />)
    expect(screen.queryByLabelText("Frase")).not.toBeInTheDocument()
    expect(screen.getByText(/a foto e a frase não aparecem mais na loja/)).toBeInTheDocument()
  })

  it("says when the account does not sell for the shop, and when a read failed", async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<AffiliateAreaNotice kind="notFound" />)
    expect(screen.getByRole("link", { name: "Ver as minhas lojas" })).toHaveAttribute("href", "/afiliado")

    rerender(<AffiliateAreaNotice kind="failed" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalled()
  })
})
