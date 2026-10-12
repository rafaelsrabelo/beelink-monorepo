// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingIntegrations } from "./landing-integrations"

/** What the app hands over: each brand's mark as an image of its own, read out with the dictionary's sentence. */
function logosOf(messages: UiMessages) {
  const { items } = messages.landing.integrations
  return {
    asaas: <img src="/asaas.png" alt={items.asaas.alt} />,
    melhorEnvio: <img src="/melhor-envio.png" alt={items.melhorEnvio.alt} />,
    googleAnalytics: <img src="/google-analytics.svg" alt={items.googleAnalytics.alt} />,
    meta: <img src="/meta.svg" alt={items.meta.alt} />,
  }
}

const cardOf = (name: string) => screen.getByRole("heading", { level: 3, name }).closest("li")!

describe("LandingIntegrations", () => {
  it("is the section the header's link travels to, under a heading in two weights", () => {
    const { container } = render(<LandingIntegrations logos={logosOf(ptBR)} />)

    const section = container.querySelector("section")!
    expect(section).toHaveAttribute("id", "integracoes")
    expect(within(section).getByRole("heading", { level: 2, name: "Conecte a loja às suas contas" })).toBeInTheDocument()
    expect(within(section).getByText("Pagamento, frete e medição. Você conecta cada serviço pelo painel, com a conta que é sua.")).toBeInTheDocument()
  })

  it("lists the four third parties and Beelia, each by its name and one sentence", () => {
    render(<LandingIntegrations logos={logosOf(ptBR)} />)

    const cards = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(cards.map((card) => within(card).getByRole("heading", { level: 3 }).textContent)).toEqual(["Asaas", "Melhor Envio", "Google Analytics", "Meta", "Beelia"])
    expect(cards.map((card) => card.querySelector("p")?.textContent)).toEqual([
      "Pix e cartão de crédito no checkout. O dinheiro cai direto na sua conta Asaas.",
      "Frete de Correios, Jadlog e outras transportadoras no checkout, com etiqueta e rastreio pelo painel.",
      "O ID de medição do seu GA4, informado no painel sem colar código. Os relatórios ficam no Google.",
      "O pixel dos seus anúncios no Facebook e no Instagram e a compra pela API de Conversões, de quem aceita os cookies.",
      "Avisos de pedido, cupons e atendimento no WhatsApp da loja.",
    ])
  })

  it("frames the mark it is handed for each brand, read out by the brand's own alternative text", () => {
    render(<LandingIntegrations logos={logosOf(ptBR)} />)

    expect(
      ["Asaas", "Melhor Envio", "Google Analytics", "Meta"].map((name) => {
        const mark = within(cardOf(name)).getByRole("img")
        return [mark.getAttribute("alt"), mark.getAttribute("src")]
      }),
    ).toEqual([
      ["Logo do Asaas", "/asaas.png"],
      ["Logo do Melhor Envio", "/melhor-envio.png"],
      ["Logo do Google Analytics", "/google-analytics.svg"],
      ["Logo da Meta", "/meta.svg"],
    ])
    // The image fills the frame: the frame is what sets the size and the corner.
    expect(within(cardOf("Asaas")).getByRole("img").parentElement).toHaveClass("size-14", "overflow-hidden")
  })

  /** Beelia does not exist yet: a card of it that could be pressed would be a stop with nothing behind it. */
  it("announces Beelia as still to come, with a drawn icon for a mark and nothing to press", () => {
    render(<LandingIntegrations logos={logosOf(ptBR)} />)

    const beelia = cardOf("Beelia")
    expect(within(beelia).getByText("Em breve")).toBeInTheDocument()
    expect(within(beelia).queryByRole("img")).not.toBeInTheDocument()
    expect(beelia.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull()
    expect(beelia.querySelector("a, button, [tabindex], [role='link'], [role='button']")).toBeNull()
  })

  it("leads nowhere: no card is a link or a button", () => {
    const { container } = render(<LandingIntegrations logos={logosOf(ptBR)} />)

    expect(container.querySelector("a, button, [tabindex]")).toBeNull()
  })

  it("says everything in the language it is handed", () => {
    render(<LandingIntegrations logos={logosOf(en)} messages={en} />)

    expect(screen.getByRole("heading", { level: 2, name: "Connect the shop to your accounts" })).toBeInTheDocument()
    expect(within(cardOf("Asaas")).getByRole("img", { name: "Asaas logo" })).toBeInTheDocument()
    expect(within(cardOf("Beelia")).getByText("Coming soon")).toBeInTheDocument()
  })

  /**
   * A public page promises only what the product does. Asaas charges Pix and credit card here, and
   * no boleto. The shop window does not load Google Analytics yet (BEELINK-303): until it does, the
   * card may speak of the ID a shopkeeper saves, never of visits or sales arriving at Google.
   */
  it.each([
    ["pt-BR", ptBR],
    ["en", en],
  ])("promises nothing the product does not do yet, in %s", (_, messages) => {
    const { items } = messages.landing.integrations

    expect(items.asaas.text).not.toMatch(/boleto/i)
    expect(items.googleAnalytics.text).not.toMatch(/visita|venda|compra|visit|sale|purchase/i)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<LandingIntegrations logos={logosOf(ptBR)} />)

    await expectNoA11yViolations(container)
  })
})
