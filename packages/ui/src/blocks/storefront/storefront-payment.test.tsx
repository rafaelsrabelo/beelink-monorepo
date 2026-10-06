// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontPaymentCard } from "./storefront-payment-card"
import { StorefrontPaymentLayout } from "./storefront-payment-layout"
import { StorefrontPaymentNotice, type StorefrontPaymentNoticeVariant } from "./storefront-payment-notice"
import { StorefrontPaymentPix } from "./storefront-payment-pix"
import { StorefrontPaymentSkeleton } from "./storefront-payment-skeleton"
import { SAMPLE_PIX_CODE, SAMPLE_QR } from "./storefront-payment.fixtures"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("StorefrontPaymentLayout", () => {
  it("names the order, leads back to it, and says a refusal with what it leads to", () => {
    render(
      <StorefrontPaymentLayout number={14} orderHref="/loja/conta/pedidos/14" alert="Para pagar online, o seu cadastro precisa ter o CPF." alertAction={<a href="/loja/conta/perfil">Informar CPF no cadastro</a>}>
        <p>miolo</p>
      </StorefrontPaymentLayout>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Pagamento do pedido #14" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver pedido" })).toHaveAttribute("href", "/loja/conta/pedidos/14")
    expect(within(screen.getByRole("alert")).getByRole("link", { name: "Informar CPF no cadastro" })).toBeInTheDocument()
    expect(screen.getByText("miolo")).toBeInTheDocument()
  })

  it("says no alert when nothing was refused", () => {
    render(
      <StorefrontPaymentLayout number={14} orderHref="#">
        <StorefrontPaymentSkeleton />
      </StorefrontPaymentLayout>,
    )

    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("StorefrontPaymentPix", () => {
  const pix = <StorefrontPaymentPix amount="R$ 179,90" image={SAMPLE_QR} payload={SAMPLE_PIX_CODE} validUntil="7 de out., 23:59" />

  it("shows the amount, the QR as an image, the code, until when it is good, and that the confirmation shows here", () => {
    render(pix)

    expect(screen.getByRole("heading", { name: "Pague com Pix" })).toBeInTheDocument()
    expect(screen.getByText("R$ 179,90")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "QR code do Pix" })).toHaveAttribute("src", `data:image/png;base64,${SAMPLE_QR}`)
    expect(screen.getByText(SAMPLE_PIX_CODE)).toBeInTheDocument()
    expect(screen.getByText("Vale até 7 de out., 23:59")).toBeInTheDocument()
    expect(screen.getByText(/esta página avisa/)).toBeInTheDocument()
  })

  it("copies the code, and says it did", async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } })
    render(pix)

    await userEvent.click(screen.getByRole("button", { name: /Copiar código/ }))

    expect(writeText).toHaveBeenCalledWith(SAMPLE_PIX_CODE)
    expect(await screen.findByText("Código copiado")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(pix)

    await expectNoA11yViolations(container)
  })
})

describe("StorefrontPaymentCard", () => {
  const card = <StorefrontPaymentCard amount="R$ 239,70" installments="3x de R$ 79,90 sem juros" invoiceUrl="https://www.asaas.com/i/abc" validUntil="9 de out., 23:59" />

  it("shows the amount and the instalments, and says the confirmation shows on this page", () => {
    render(card)

    expect(screen.getByRole("heading", { name: "Pague com cartão de crédito" })).toBeInTheDocument()
    expect(screen.getByText("R$ 239,70")).toBeInTheDocument()
    expect(screen.getByText("3x de R$ 79,90 sem juros")).toBeInTheDocument()
    expect(screen.getByText(/a confirmação aparece nesta página/)).toBeInTheDocument()
    expect(screen.getByText("Vale até 9 de out., 23:59")).toBeInTheDocument()
  })

  it("opens Asaas's page in a new tab, which is told nothing of this one", () => {
    render(card)

    const door = screen.getByRole("link", { name: /Pagar com cartão/ })
    expect(door).toHaveAttribute("href", "https://www.asaas.com/i/abc")
    expect(door).toHaveAttribute("target", "_blank")
    expect(door).toHaveAttribute("rel", "noopener noreferrer")
    expect(door).toHaveAccessibleName("Pagar com cartão (abre em nova aba)")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(card)

    await expectNoA11yViolations(container)
  })
})

describe("StorefrontPaymentNotice", () => {
  const ACTS: readonly [StorefrontPaymentNoticeVariant, string, string][] = [
    ["none", "O pagamento ainda não foi gerado", "Gerar pagamento"],
    ["chargeCancelled", "A cobrança anterior foi cancelada", "Gerar pagamento"],
    ["pixExpired", "Este Pix venceu", "Gerar novo Pix"],
    ["cardExpired", "O prazo deste pagamento acabou", "Gerar pagamento"],
    ["unread", "Não foi possível carregar o pagamento", "Tentar de novo"],
  ]
  const WAITS: readonly [StorefrontPaymentNoticeVariant, string][] = [
    ["pixWaiting", "Gerando o seu Pix"],
    ["awaitingTotal", "Aguardando a loja informar o frete"],
    ["paid", "Pagamento aprovado"],
    ["refunded", "Pagamento estornado"],
    ["orderCancelled", "Este pedido foi cancelado"],
  ]

  it.each(ACTS)("says %s in words and offers the one thing to do about it", async (variant, title, action) => {
    const onAction = vi.fn()
    render(<StorefrontPaymentNotice variant={variant} orderHref="/loja/conta/pedidos/14" onAction={onAction} />)

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: action }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("link", { name: "Ver pedido" })).toBeNull()
  })

  it.each(WAITS)("says %s in words and leads back to the order, with no charge to make", (variant, title) => {
    render(<StorefrontPaymentNotice variant={variant} orderHref="/loja/conta/pedidos/14" onAction={() => {}} />)

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("link", { name: "Ver pedido" })).toHaveAttribute("href", "/loja/conta/pedidos/14")
  })

  it("holds the button, and says what it is doing, while a charge is being made", () => {
    render(<StorefrontPaymentNotice variant="pixExpired" orderHref="#" onAction={() => {}} pending />)

    const button = screen.getByRole("button", { name: "Gerando o pagamento" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
  })

  it("announces the approval as a status, and a payment that could not be read as an alert", () => {
    const { rerender } = render(<StorefrontPaymentNotice variant="paid" orderHref="#" />)
    expect(screen.getByRole("status")).toHaveTextContent("Pagamento aprovado")

    rerender(<StorefrontPaymentNotice variant="unread" orderHref="#" onAction={() => {}} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o pagamento")
  })

  it("has no accessibility violations, with and without an action", async () => {
    const { container } = render(
      <StorefrontPaymentLayout number={14} orderHref="#" alert="A loja não consegue receber online agora.">
        <StorefrontPaymentNotice variant="none" orderHref="#" onAction={() => {}} />
        <StorefrontPaymentNotice variant="paid" orderHref="#" />
      </StorefrontPaymentLayout>,
    )

    await expectNoA11yViolations(container)
  })
})

describe("StorefrontPaymentSkeleton", () => {
  it("is shapes only: nothing for a screen reader, and no word", () => {
    const { container } = render(<StorefrontPaymentSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container).toHaveTextContent("")
  })
})
