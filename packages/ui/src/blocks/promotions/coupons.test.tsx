// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CouponForm } from "./coupon-form"
import { CouponList } from "./coupon-list"
import { CouponRedemptions } from "./coupon-redemptions"
import { couponRows, couponValues, redemptionRows } from "./promotions.fixtures"

describe("CouponList", () => {
  it("reads each coupon — its code, what it gives and asks for, its period, its uses and where it stands", () => {
    render(<CouponList rows={couponRows} empty="none" onEdit={() => {}} onToggle={() => {}} onUses={() => {}} />)

    expect(screen.getByText("BEMVINDO10")).toBeInTheDocument()
    expect(screen.getByText("10% · Pedido mínimo de R$ 50,00")).toBeInTheDocument()
    expect(screen.getByText("Desde 1 out 2026, sem data para acabar · 3 de 100 usos")).toBeInTheDocument()
    expect(screen.getByText("Frete grátis")).toBeInTheDocument()
    expect(screen.getByText("Ativo")).toBeInTheDocument()
    expect(screen.getByText("Pausado")).toBeInTheDocument()
    expect(screen.getByText("Esgotado")).toBeInTheDocument()
  })

  it("hands the row to the screen to edit it, pause it or read its uses, and holds every button while a pause is on its way", async () => {
    const onEdit = vi.fn()
    const onToggle = vi.fn()
    const onUses = vi.fn()
    const { rerender } = render(<CouponList rows={couponRows} empty="none" onEdit={onEdit} onToggle={onToggle} onUses={onUses} />)

    await userEvent.click(screen.getByRole("button", { name: "Ver os usos do cupom BEMVINDO10" }))
    expect(onUses).toHaveBeenCalledWith(couponRows[0])
    await userEvent.click(screen.getByRole("button", { name: "Editar o cupom BEMVINDO10" }))
    expect(onEdit).toHaveBeenCalledWith(couponRows[0])
    await userEvent.click(screen.getByRole("button", { name: "Religar o cupom FRETE-GRATIS" }))
    expect(onToggle).toHaveBeenCalledWith(couponRows[1])

    rerender(<CouponList rows={couponRows} empty="none" busyId="c1" onEdit={onEdit} onToggle={onToggle} onUses={onUses} />)
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled()
  })

  it("says why it is empty, and has no accessibility violations", async () => {
    const { rerender, container } = render(<CouponList rows={[]} empty="none" onEdit={() => {}} onToggle={() => {}} onUses={() => {}} />)
    expect(screen.getByText("Nenhum cupom ainda.")).toBeInTheDocument()
    rerender(<CouponList rows={[]} empty="filtered" onEdit={() => {}} onToggle={() => {}} onUses={() => {}} />)
    expect(screen.getByText("Nenhum cupom nesta situação.")).toBeInTheDocument()

    rerender(<CouponList rows={couponRows} empty="none" onEdit={() => {}} onToggle={() => {}} onUses={() => {}} />)
    await expectNoA11yViolations(container)
  })
})

describe("CouponForm", () => {
  it("takes the code, the value its kind carries, the minimum, the period and the two limits", async () => {
    const onChange = vi.fn()
    render(<CouponForm value={couponValues} onChange={onChange} onSubmit={() => {}} onCancel={() => {}} />)

    expect(screen.getByLabelText("Código")).toHaveValue("BEMVINDO10")
    expect(screen.getByLabelText("Percentual (%)")).toHaveValue("10")
    expect(screen.getByLabelText("Pedido mínimo (R$)")).toHaveValue("50,00")
    expect(screen.getByLabelText("Começa em")).toHaveValue("2026-10-01T09:00")
    expect(screen.getByLabelText("Limite de usos")).toHaveValue("100")
    expect(screen.getByLabelText("Limite por cliente")).toHaveValue("1")

    await userEvent.click(screen.getByRole("button", { name: "Frete grátis" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...couponValues, kind: "FREE_SHIPPING" })
  })

  it("asks for no value on a free delivery", () => {
    render(<CouponForm value={{ ...couponValues, kind: "FREE_SHIPPING" }} onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />)
    expect(screen.queryByLabelText("Percentual (%)")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Valor (R$)")).not.toBeInTheDocument()
  })

  it("says each field to correct and the refusal of the whole save, sends, and has no accessibility violations", async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <CouponForm value={couponValues} onChange={() => {}} issues={{ code: "Código inválido.", maxUses: "Informe um número inteiro." }} error="Outro cupom da loja já tem este código." onSubmit={onSubmit} onCancel={() => {}} />,
    )

    expect(screen.getByLabelText("Código")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Código inválido.")).toBeInTheDocument()
    expect(screen.getByText("Informe um número inteiro.")).toBeInTheDocument()
    expect(screen.getByText("Outro cupom da loja já tem este código.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })
})

describe("CouponRedemptions", () => {
  it("lists each use — the order as a link, whose it was, when and what it took off — and marks a cancelled order", async () => {
    const { container } = render(<CouponRedemptions rows={redemptionRows} />)

    expect(screen.getByRole("link", { name: "Pedido #1043" })).toHaveAttribute("href", "#1043")
    expect(screen.getByText("Bia Souza · 30 set 2026")).toBeInTheDocument()
    expect(screen.getByText("R$ 18,99 de desconto")).toBeInTheDocument()
    expect(screen.getAllByText("Cancelado")).toHaveLength(1)
    await expectNoA11yViolations(container)
  })

  it("is grey shapes while it is read, and says so when the coupon was never used", () => {
    const { container, rerender } = render(<CouponRedemptions rows={null} />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")

    rerender(<CouponRedemptions rows={[]} />)
    expect(screen.getByText("Este cupom ainda não foi usado.")).toBeInTheDocument()
  })
})
