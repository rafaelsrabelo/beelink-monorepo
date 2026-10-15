// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { INVOICE_URL } from "./billing.fixtures"
import { SubscriptionAwaiting, type SubscriptionAwaitingProps } from "./subscription-awaiting"

const plain = (text: string | null | undefined) => (text ?? "").replace(/[\u00a0\u202f]/g, " ")

function show(props: Partial<SubscriptionAwaitingProps> = {}) {
  const handlers = { onOpen: vi.fn(), onCheck: vi.fn(), onChoose: vi.fn() }
  const view = render(<SubscriptionAwaiting invoiceUrl={INVOICE_URL} cycle="SEMIANNUAL" priceCents={54000} locale="pt-BR" {...handlers} {...props} />)
  return { ...view, ...handlers }
}

const invoice = () => screen.getByRole("link", { name: /Abrir a fatura/ })

describe("SubscriptionAwaiting (BEELINK-293)", () => {
  it("waits for the payment on the same invoice, which opens in another tab", async () => {
    const { container } = show()

    expect(screen.getByRole("heading", { level: 2, name: "Aguardando a confirmação do pagamento" })).toBeInTheDocument()
    expect(plain(screen.getByText(/Plano Semestral/).textContent)).toBe("Plano Semestral · R$ 540,00")
    expect(invoice()).toHaveAttribute("href", INVOICE_URL)
    expect(invoice()).toHaveAttribute("target", "_blank")
    expect(invoice()).toHaveAttribute("rel", "noopener noreferrer")
    expect(invoice()).toHaveAccessibleName("Abrir a fatura (abre em outra aba)")
    await expectNoA11yViolations(container)
  })

  it("says the invoice was followed, asks now, and goes back to the cycles", async () => {
    const { onOpen, onCheck, onChoose } = show()
    invoice().addEventListener("click", (event) => event.preventDefault())

    await userEvent.click(invoice())
    await userEvent.click(screen.getByRole("button", { name: "Já paguei, verificar agora" }))
    await userEvent.click(screen.getByRole("button", { name: "Escolher outro plano" }))

    expect(onOpen).toHaveBeenCalledOnce()
    expect(onCheck).toHaveBeenCalledOnce()
    expect(onChoose).toHaveBeenCalledOnce()
  })

  it("locks the check while it runs, and says when one asked by hand found nothing yet", () => {
    const { rerender } = show({ checking: true })
    expect(screen.getByRole("button", { name: "Verificando…" })).toBeDisabled()

    rerender(<SubscriptionAwaiting invoiceUrl={INVOICE_URL} cycle="SEMIANNUAL" priceCents={54000} locale="pt-BR" onCheck={vi.fn()} notYet />)
    expect(screen.getByRole("status")).toHaveTextContent("Ainda não recebemos a confirmação deste pagamento.")
  })

  it("says the price the invoice holds when it is not the one the button said", () => {
    show({ priceChanged: true, priceCents: 61000 })

    expect(plain(screen.getByRole("alert").textContent)).toBe("O valor do plano mudou para R$ 610,00. Confira na fatura antes de pagar.")
  })

  it("offers no way back to the cycles where the invoice due is what is paid", () => {
    show({ onChoose: undefined })

    expect(screen.queryByRole("button", { name: "Escolher outro plano" })).toBeNull()
  })
})
