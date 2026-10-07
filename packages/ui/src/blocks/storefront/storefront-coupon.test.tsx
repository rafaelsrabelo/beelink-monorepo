// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCoupon } from "./storefront-coupon"

describe("StorefrontCoupon", () => {
  it("applies the code as typed, trimmed, by the button or by Enter — and nothing while the field is empty", () => {
    const onApply = vi.fn()
    render(<StorefrontCoupon applied={null} onApply={onApply} />)

    const field = screen.getByLabelText("Cupom de desconto")
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled()

    fireEvent.change(field, { target: { value: "  bemvindo10 " } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))
    fireEvent.submit(field.closest("form")!)

    expect(onApply.mock.calls).toEqual([["bemvindo10"], ["bemvindo10"]])
  })

  it("waits while a code is checked: the field keeps its text and its focus, and nothing is sent twice", () => {
    const onApply = vi.fn()
    const { rerender } = render(<StorefrontCoupon applied={null} onApply={onApply} />)
    fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: "BEMVINDO10" } })

    rerender(<StorefrontCoupon applied={null} pending onApply={onApply} />)

    const field = screen.getByLabelText("Cupom de desconto")
    expect(field).toHaveValue("BEMVINDO10")
    expect(field).toHaveAttribute("readonly")
    expect(field).not.toBeDisabled()
    expect(screen.getByRole("button", { name: "Conferindo…" })).toBeDisabled()
    fireEvent.submit(field.closest("form")!)
    expect(onApply).not.toHaveBeenCalled()
  })

  it("says why a code was not taken, on the field, until the shopper types again", () => {
    const onEdit = vi.fn()
    render(<StorefrontCoupon applied={null} error="Esse cupom venceu." onEdit={onEdit} />)

    const field = screen.getByLabelText("Cupom de desconto")
    expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom venceu.")
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveAccessibleDescription("Esse cupom venceu.")

    fireEvent.change(field, { target: { value: "OUTRO" } })
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("shows the coupon in force with a way to take it off, and says it was applied", () => {
    const onRemove = vi.fn()
    render(<StorefrontCoupon applied="BEMVINDO10" holding onRemove={onRemove} />)

    expect(screen.getByText("BEMVINDO10")).toBeInTheDocument()
    expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toHaveAttribute("aria-live", "polite")
    expect(screen.queryByLabelText("Cupom de desconto")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("keeps a coupon the cart moved from under, with why — and never calls it applied", () => {
    const { container } = render(<StorefrontCoupon applied="BEMVINDO10" holding error="Esse cupom vale para compras a partir de R$ 100,00 em produtos." />)

    expect(screen.getByText("BEMVINDO10")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("a partir de R$ 100,00")
    expect(container.querySelector("[aria-live='polite']")).toBeEmptyDOMElement()
  })

  /** A region born with its sentence is not announced: this one is there from the first draw, empty. */
  it("has its live region in the page before a coupon is in, so the sentence is heard arriving", () => {
    const { container, rerender } = render(<StorefrontCoupon applied={null} />)
    const region = container.querySelector("[aria-live='polite']")!
    expect(region).toBeEmptyDOMElement()

    rerender(<StorefrontCoupon applied="BEMVINDO10" holding />)
    expect(container.querySelector("[aria-live='polite']")).toBe(region)
    expect(region).toHaveTextContent("Cupom BEMVINDO10 aplicado.")
  })

  it("moves the focus with what the press did: to the chip's button once taken, back to the field once refused or taken off", () => {
    const { rerender } = render(<StorefrontCoupon applied={null} />)
    fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: "VENCIDO" } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))

    rerender(<StorefrontCoupon applied={null} pending />)
    rerender(<StorefrontCoupon applied={null} error="Esse cupom venceu." />)
    expect(screen.getByLabelText("Cupom de desconto")).toHaveFocus()

    fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: "BEMVINDO10" } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))
    rerender(<StorefrontCoupon applied="BEMVINDO10" holding pending />)
    rerender(<StorefrontCoupon applied="BEMVINDO10" holding />)
    expect(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" })).toHaveFocus()

    fireEvent.click(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" }))
    rerender(<StorefrontCoupon applied={null} />)
    expect(screen.getByLabelText("Cupom de desconto")).toHaveFocus()
    expect(screen.getByLabelText("Cupom de desconto")).toHaveValue("")
  })

  it("takes no focus for a coupon that arrives without a press here", () => {
    const { rerender } = render(<StorefrontCoupon applied={null} />)

    rerender(<StorefrontCoupon applied="BEMVINDO10" holding />)

    expect(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" })).not.toHaveFocus()
  })

  it("holds still while the order is on its way", () => {
    const { rerender } = render(<StorefrontCoupon applied={null} disabled />)
    expect(screen.getByLabelText("Cupom de desconto")).toBeDisabled()

    rerender(<StorefrontCoupon applied="BEMVINDO10" holding disabled />)
    expect(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" })).toBeDisabled()
  })

  it("tells a visitor where the code goes, and offers no field", () => {
    render(<StorefrontCoupon applied={null} signedOut />)

    expect(screen.getByText("Tem um cupom de desconto? Você aplica depois de entrar na sua conta.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  // BEELINK-311.
  describe("for a visitor at a shop with a first-purchase coupon", () => {
    it("says the benefit it was handed over the sentence that says where the code goes — and still no field, and no code", () => {
      render(<StorefrontCoupon applied={null} signedOut signedOutBenefit="Crie sua conta e ganhe 15% de desconto no primeiro pedido." />)

      const benefit = screen.getByText("Crie sua conta e ganhe 15% de desconto no primeiro pedido.")
      const where = screen.getByText("Tem um cupom de desconto? Você aplica depois de entrar na sua conta.")
      expect(benefit.compareDocumentPosition(where) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("has no accessibility violations", async () => {
      const { container } = render(<StorefrontCoupon applied={null} signedOut signedOutBenefit="Crie sua conta e ganhe 15% de desconto no primeiro pedido." />)

      await expectNoA11yViolations(container)
    })
  })

  // BEELINK-311: the cart's call to a coupon not yet applied is this block's own press.
  describe("with a coupon to call the customer to", () => {
    const call = { message: "Você tem 15% de desconto no primeiro pedido com o cupom", code: "SEJAMUTANTE" }

    it("draws the call over the field, and applies its code in one press", () => {
      const onApply = vi.fn()
      render(<StorefrontCoupon applied={null} call={call} onApply={onApply} />)

      const apply = screen.getByRole("button", { name: "Aplicar cupom" })
      expect(apply.compareDocumentPosition(screen.getByLabelText("Cupom de desconto")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      fireEvent.click(apply)

      expect(onApply.mock.calls).toEqual([["SEJAMUTANTE"]])
      // The field is still there for another code.
      expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled()
    })

    it("is reached by the keyboard before the field, and pressed with Enter without sending the field's form", async () => {
      const onApply = vi.fn()
      render(<StorefrontCoupon applied={null} call={call} onApply={onApply} />)

      await userEvent.tab()
      expect(screen.getByRole("button", { name: "Aplicar cupom" })).toHaveFocus()
      await userEvent.keyboard("{Enter}")
      expect(onApply.mock.calls).toEqual([["SEJAMUTANTE"]])

      await userEvent.tab()
      expect(screen.getByLabelText("Cupom de desconto")).toHaveFocus()
    })

    it("draws none once a coupon is in force, and moves the focus to that coupon's button after its own press", () => {
      const { rerender } = render(<StorefrontCoupon applied={null} call={call} onApply={() => {}} />)
      fireEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }))

      rerender(<StorefrontCoupon applied={null} call={call} pending />)
      expect(screen.getByRole("button", { name: "Conferindo…", description: /SEJAMUTANTE/ })).toBeDisabled()

      rerender(<StorefrontCoupon applied="SEJAMUTANTE" holding call={call} />)
      expect(screen.queryByRole("button", { name: "Aplicar cupom" })).toBeNull()
      expect(screen.getByRole("button", { name: "Remover o cupom SEJAMUTANTE" })).toHaveFocus()
    })

    it("never draws it for a visitor", () => {
      render(<StorefrontCoupon applied={null} signedOut call={call} />)

      expect(screen.queryByRole("button", { name: "Aplicar cupom" })).toBeNull()
      expect(screen.queryByText("SEJAMUTANTE")).toBeNull()
    })

    it("has no accessibility violations", async () => {
      const { container } = render(<StorefrontCoupon applied={null} call={call} />)

      await expectNoA11yViolations(container)
    })
  })

  it("has no accessibility violations, with the field and with a coupon in force", async () => {
    const { container, rerender } = render(<StorefrontCoupon applied={null} error="Esse cupom venceu." />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontCoupon applied="BEMVINDO10" holding />)
    await expectNoA11yViolations(container)
  })
})
