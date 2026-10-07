// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderFacts } from "./order-facts"
import { order } from "./order-detail.fixtures"
import type { OrderDetailView } from "./order-types"

const fromCart: OrderDetailView = { ...order, events: [{ status: "RECEIVED", actor: "CUSTOMER", at: "2026-09-25T14:30:00.000Z" }], origin: null }
const campaign = { source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, metaAd: false }

function facts(view: OrderDetailView) {
  render(<OrderFacts order={view} deliveryLine={null} whatsappHref={null} />)
  return within(screen.getByRole("region", { name: "Cliente" }))
}

describe("where an order's buyer came from, on its page (BEELINK-275)", () => {
  it("says the campaign of an order placed from the cart", () => {
    const card = facts({ ...fromCart, origin: campaign })

    expect(card.getByText("Origem")).toBeInTheDocument()
    expect(card.getByText("facebook / cpc · campanha teste")).toBeInTheDocument()
  })

  it("says an ad of Meta's brought the buyer, and never an identifier", () => {
    const card = facts({ ...fromCart, origin: { ...campaign, content: "vídeo 1", term: "whey", metaAd: true } })

    expect(card.getByText("Anúncio da Meta · facebook / cpc · campanha teste")).toBeInTheDocument()
    expect(card.getByText("Conteúdo: vídeo 1 · Termo: whey")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Cliente" }).textContent).not.toMatch(/fbclid|_fbp|fb\.1\./i)
  })

  it("reads an order from the cart with no campaign as a direct visit", () => {
    expect(facts(fromCart).getByText("Direto / sem campanha")).toBeInTheDocument()
  })

  it("says nothing of origin on a sale the shop registered, nor where the page was given none", () => {
    // The fixture's first event is the shopkeeper's.
    expect(facts({ ...order, origin: null }).queryByText("Origem")).not.toBeInTheDocument()
  })

  it("says nothing where the order carries no origin at all", () => {
    expect(facts({ ...order, events: fromCart.events }).queryByText("Origem")).not.toBeInTheDocument()
  })

  it("draws a label with markup in it as text, wrapped inside the card", () => {
    const card = facts({ ...fromCart, origin: { ...campaign, campaign: '<img src=x onerror="alert(1)">' } })

    const line = card.getByText('facebook / cpc · campanha <img src=x onerror="alert(1)">')
    expect(line.querySelector("img")).toBeNull()
    expect(document.querySelector("img")).toBeNull()
    expect(line.closest("dd")).toHaveClass("break-words")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<OrderFacts order={{ ...fromCart, origin: { ...campaign, metaAd: true } }} deliveryLine={null} whatsappHref={null} />)
    await expectNoA11yViolations(container)
  })
})
