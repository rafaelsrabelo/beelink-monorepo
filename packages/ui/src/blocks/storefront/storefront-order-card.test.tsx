// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderCard, type StorefrontOrderCardProps } from "./storefront-order-card"

const card: StorefrontOrderCardProps = {
  number: 1042,
  placedOn: "21 set 2026",
  total: "R$ 237,22 · Pix",
  shipTo: "Rafael Souza",
  headline: "Aguardando a loja confirmar",
  detail: "Feito por você na loja em 21 set, 14:02. A loja confirma o pedido e o prazo.",
  tone: "progress",
  items: [
    { name: "Pré-Treino Haze Hardcore 300g", href: "/loja/produtos/haze", imageUrl: "https://img.test/haze.jpg", meta: "Sabor: Frutas vermelhas · Qtd. 1" },
    { name: "Creatina Monohidratada 300g", href: null, imageUrl: null, meta: "Qtd. 1" },
  ],
  moreItems: 1,
}

describe("StorefrontOrderCard", () => {
  it("names the order, its facts, where it stands and its first lines, with the rest counted", () => {
    render(<StorefrontOrderCard {...card} />)

    const article = screen.getByRole("article", { name: "Pedido nº 1042" })
    expect(within(article).getByText("21 set 2026")).toBeInTheDocument()
    expect(within(article).getByText("R$ 237,22 · Pix")).toBeInTheDocument()
    expect(within(article).getByText("Rafael Souza")).toBeInTheDocument()
    expect(within(article).getByText("Aguardando a loja confirmar")).toBeInTheDocument()
    expect(within(article).getByRole("link", { name: "Pré-Treino Haze Hardcore 300g" })).toHaveAttribute("href", "/loja/produtos/haze")
    // A product no longer sold is a name, not a link.
    expect(within(article).queryByRole("link", { name: "Creatina Monohidratada 300g" })).toBeNull()
    expect(within(article).getByText("Qtd. 1 · + 1 item")).toBeInTheDocument()
  })

  /** BEELINK-194: the list says what came off an order, and the coupon it took. */
  it("says what was taken off under the total, and nothing there for an order with no discount", () => {
    const { rerender } = render(<StorefrontOrderCard {...card} saving="Desconto de R$ 42,50 · cupom BEMVINDO10" />)
    const saving = screen.getByText("R$ 237,22 · Pix").nextElementSibling!
    expect(saving).toHaveTextContent("Desconto de R$ 42,50 · cupom BEMVINDO10")
    // Never cut short, as the facts above it are: the code is the end of the sentence.
    expect(saving).not.toHaveClass("truncate")

    rerender(<StorefrontOrderCard {...card} cashback="Você vai ganhar R$ 5,00 de cashback quando o pedido for entregue." />)
    expect(screen.getByText("Você vai ganhar R$ 5,00 de cashback quando o pedido for entregue.")).toBeInTheDocument()

    rerender(<StorefrontOrderCard {...card} />)
    expect(screen.getByText("R$ 237,22 · Pix").nextElementSibling).toBeNull()
  })

  it("hides the recipient on a pick-up, and holds the actions given", () => {
    render(<StorefrontOrderCard {...card} shipTo={null} actions={<button type="button">Cancelar pedido</button>} />)

    expect(screen.queryByText("Enviar para")).toBeNull()
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeInTheDocument()
  })

  it("leads to the order's page by its number, and to follow it while it is on its way", () => {
    const { rerender } = render(<StorefrontOrderCard {...card} />)
    expect(screen.queryByRole("link", { name: "Ver detalhes" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Acompanhar pedido" })).toBeNull()

    rerender(<StorefrontOrderCard {...card} detailsHref="/loja/conta/pedidos/1042" trackHref="/loja/conta/pedidos/1042" actions={<button type="button">Cancelar pedido</button>} />)
    expect(screen.getByRole("link", { name: "Ver detalhes" })).toHaveAttribute("href", "/loja/conta/pedidos/1042")
    const track = screen.getByRole("link", { name: "Acompanhar pedido" })
    expect(track).toHaveAttribute("href", "/loja/conta/pedidos/1042")
    // The way to follow it comes before anything else that can be done.
    expect(track.compareDocumentPosition(screen.getByRole("button", { name: "Cancelar pedido" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("leads each line of a delivered order to its rating, naming the product to a reader", () => {
    const delivered = { ...card, tone: "done" as const, items: [{ ...card.items[0]!, reviewHref: "/loja/conta/avaliacoes?produto=p-1#avaliar-p-1" }, card.items[1]!] }
    render(<StorefrontOrderCard {...delivered} />)

    const link = screen.getByRole("link", { name: "Avaliar produto: Pré-Treino Haze Hardcore 300g" })
    expect(link).toHaveAttribute("href", "/loja/conta/avaliacoes?produto=p-1#avaliar-p-1")
    expect(screen.getAllByText("Avaliar produto")).toHaveLength(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderCard {...card} detailsHref="#" trackHref="#" />)
    await expectNoA11yViolations(container)
  })
})
