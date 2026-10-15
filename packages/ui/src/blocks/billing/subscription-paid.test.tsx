// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { INVOICE_URL, paidByCard, paidByPix } from "./billing.fixtures"
import { SubscriptionConfirmed } from "./subscription-confirmed"
import { SubscriptionDue } from "./subscription-due"
import { SubscriptionPaid } from "./subscription-paid"

const plain = (text: string | null | undefined) => (text ?? "").replace(/[\u00a0\u202f]/g, " ")
const fact = (label: string) => plain(screen.getByText(label).nextElementSibling?.textContent)

describe("SubscriptionPaid (BEELINK-293)", () => {
  it("says a page paid by card: its plan, its last day paid, the card by brand and last four, and that it renews by itself", async () => {
    const { container } = render(<SubscriptionPaid view={paidByCard} locale="pt-BR" panelHref="/admin/loja" />)

    expect(screen.getByRole("heading", { level: 2, name: "Sua página está em dia" })).toBeInTheDocument()
    expect(fact("Plano")).toBe("Anual · R$ 960,00")
    expect(fact("Paga até")).toBe("15/10/2027")
    expect(fact("Forma de pagamento")).toBe("Cartão VISA terminado em 4242")
    expect(screen.getByText("A renovação é cobrada sozinha no cartão.")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Pagar a renovação/ })).toBeNull()
    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute("href", "/admin/loja")
    await expectNoA11yViolations(container)
  })

  it("leads a page paid by Pix to the renewal's invoice, once Asaas made it", async () => {
    const onOpenRenewal = vi.fn()
    render(<SubscriptionPaid view={paidByPix} locale="pt-BR" panelHref="/admin/loja" onOpenRenewal={onOpenRenewal} />)
    const renewal = screen.getByRole("link", { name: "Pagar a renovação (abre em outra aba)" })
    renewal.addEventListener("click", (event) => event.preventDefault())

    expect(fact("Forma de pagamento")).toBe("Pix")
    expect(screen.getByText("Cada renovação gera uma fatura nova para pagar.")).toBeInTheDocument()
    expect(renewal).toHaveAttribute("href", INVOICE_URL)
    expect(renewal).toHaveAttribute("target", "_blank")
    await userEvent.click(renewal)
    expect(onOpenRenewal).toHaveBeenCalledOnce()
  })
})

describe("SubscriptionConfirmed (BEELINK-293)", () => {
  it("says the payment was confirmed, until when the page is paid, and leads to the panel", async () => {
    const { container } = render(<SubscriptionConfirmed paidUntil="15/11/2026" panelHref="/admin/loja" />)

    expect(screen.getByRole("status")).toHaveTextContent("Pagamento confirmado")
    expect(screen.getByText("Sua página está em dia até 15/11/2026.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir para o painel" })).toHaveAttribute("href", "/admin/loja")
    await expectNoA11yViolations(container)
  })

  it("says it without a day where none was told", () => {
    render(<SubscriptionConfirmed paidUntil={null} panelHref="/admin/loja" />)

    expect(screen.getByText("Sua página está em dia.")).toBeInTheDocument()
  })
})

describe("SubscriptionDue (BEELINK-293)", () => {
  it("leads a renewal past its day to the invoice due, never to another cycle", async () => {
    const onOpen = vi.fn()
    const { container } = render(<SubscriptionDue invoiceUrl={INVOICE_URL} onOpen={onOpen} onCheck={vi.fn()} />)
    const pay = screen.getByRole("link", { name: "Pagar a fatura (abre em outra aba)" })
    pay.addEventListener("click", (event) => event.preventDefault())

    expect(screen.getByRole("heading", { level: 2, name: "Pague a renovação em aberto" })).toBeInTheDocument()
    expect(pay).toHaveAttribute("href", INVOICE_URL)
    await userEvent.click(pay)
    expect(onOpen).toHaveBeenCalledOnce()
    expect(screen.queryByRole("radio")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("offers to look again when no invoice is out", async () => {
    const onCheck = vi.fn()
    const { rerender } = render(<SubscriptionDue invoiceUrl={null} onOpen={vi.fn()} onCheck={onCheck} />)

    expect(screen.getByRole("status")).toHaveTextContent("Ainda não há uma fatura da renovação para pagar.")
    await userEvent.click(screen.getByRole("button", { name: "Verificar de novo" }))
    expect(onCheck).toHaveBeenCalledOnce()

    rerender(<SubscriptionDue invoiceUrl={null} onOpen={vi.fn()} onCheck={onCheck} checking />)
    expect(screen.getByRole("button", { name: "Verificando…" })).toBeDisabled()
  })
})
