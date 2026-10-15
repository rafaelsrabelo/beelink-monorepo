// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SubscriptionCoupon, type SubscriptionCouponProps } from "./subscription-coupon"
import { SubscriptionCouponApplied } from "./subscription-coupon-applied"

function show(props: Partial<SubscriptionCouponProps> = {}) {
  const onSubmit = vi.fn()
  const view = render(<SubscriptionCoupon onSubmit={onSubmit} {...props} />)
  return { ...view, onSubmit }
}

const field = () => screen.getByRole("textbox", { name: "Código do cupom" })
const apply = () => screen.getByRole("button", { name: /Aplicar cupom|Aplicando o cupom/ })

describe("SubscriptionCoupon (BEELINK-224)", () => {
  it("says what a coupon gives and when its month begins, and hands over the code typed, trimmed", async () => {
    const { container, onSubmit } = show()

    expect(screen.getByRole("heading", { level: 2, name: "Tem um cupom da Beelink?" })).toBeInTheDocument()
    expect(screen.getByText("O cupom dá um mês grátis a esta página, sem cartão. Ele vale uma vez por página e só começa quando acaba o tempo grátis que ela já tem: você não perde nenhum dia.")).toBeInTheDocument()
    await userEvent.type(field(), "  teste-um ")
    await userEvent.click(apply())

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("teste-um")
    await expectNoA11yViolations(container)
  })

  it("sends it with Enter, from the field", async () => {
    const { onSubmit } = show()

    await userEvent.type(field(), "TESTE-ENTER{Enter}")

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("TESTE-ENTER")
  })

  it("refuses an empty field without sending anything, and says so on it", async () => {
    const { onSubmit } = show()

    await userEvent.type(field(), "   ")
    await userEvent.click(apply())

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Digite o código do cupom.")
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveAccessibleDescription("Digite o código do cupom.")
  })

  it("says the screen's sentence on the field, read out, and takes the person back to it", async () => {
    const { rerender, container } = show()
    await userEvent.type(field(), "TESTE-NADA")
    await userEvent.click(apply())

    rerender(<SubscriptionCoupon onSubmit={vi.fn()} error="Cupom não encontrado. Confira o código digitado." />)

    expect(screen.getByRole("alert")).toHaveTextContent("Cupom não encontrado. Confira o código digitado.")
    await waitFor(() => expect(field()).toHaveFocus())
    expect(field()).toHaveValue("TESTE-NADA")
    expect(field()).toHaveAccessibleDescription("Cupom não encontrado. Confira o código digitado.")
    await expectNoA11yViolations(container)
  })

  it("holds the field and the button while the code is checked", () => {
    show({ pending: true })

    expect(apply()).toHaveTextContent("Aplicando o cupom…")
    expect(apply()).toBeDisabled()
    expect(field()).toBeDisabled()
  })

  it("warns, only where there is one, that a coupon takes out the invoice open", () => {
    const { rerender } = show()
    expect(screen.queryByText(/cancela a fatura em aberto/)).toBeNull()

    rerender(<SubscriptionCoupon onSubmit={vi.fn()} invoiceOpen />)

    expect(screen.getByText("Usar o cupom cancela a fatura em aberto. Se você já pagou um boleto dela, espere a confirmação antes de usar o cupom.")).toBeInTheDocument()
  })

  it("speaks the reader's language", () => {
    render(<SubscriptionCoupon onSubmit={vi.fn()} messages={en} />)

    expect(screen.getByRole("heading", { level: 2, name: "Have a Beelink coupon?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply coupon" })).toBeInTheDocument()
  })
})

describe("SubscriptionCouponApplied (BEELINK-224)", () => {
  it("says the page is free until its last day, as a status, and leads to the panel", async () => {
    const { container } = render(<SubscriptionCouponApplied freeUntil="21/11/2026" panelHref="/admin/padaria" />)

    expect(screen.getByRole("status")).toHaveAccessibleName("Cupom aplicado")
    expect(screen.getByText("Sua página está grátis até 21/11/2026. Nada é cobrado nesse tempo.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir para o painel" })).toHaveAttribute("href", "/admin/padaria")
    await expectNoA11yViolations(container)
  })

  it("says the month was given where there is no day to say", () => {
    render(<SubscriptionCouponApplied freeUntil={null} panelHref="/admin/padaria" />)

    expect(screen.getByText("Sua página ganhou um mês grátis. Nada é cobrado nesse tempo.")).toBeInTheDocument()
  })
})
