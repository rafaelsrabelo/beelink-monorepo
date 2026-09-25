// React
import { useState } from "react"

// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderDetail } from "./order-detail"
import { order } from "./order-detail.fixtures"
import { nextStatusOf, otherStatusesOf } from "./order-status-actions"
import type { OrderDetailView, OrderStatusValue } from "./order-types"

const props = { backHref: "/admin/loja/orders", addressLine: "Av. Paulista, 1000 — São Paulo/SP", whatsappHref: "https://wa.me/5511988887777?text=Oi", onStatusChange: () => {} }

describe("the order's next step", () => {
  it("walks a delivery through every step, and a pick-up past 'out for delivery'", () => {
    expect(nextStatusOf("RECEIVED", "DELIVERY")).toBe("ACCEPTED")
    expect(nextStatusOf("PREPARING", "DELIVERY")).toBe("OUT_FOR_DELIVERY")
    expect(nextStatusOf("PREPARING", "PICKUP")).toBe("DELIVERED")
    expect(nextStatusOf("OUT_FOR_DELIVERY", "PICKUP")).toBe("DELIVERED")
    expect(nextStatusOf("DELIVERED", "DELIVERY")).toBeNull()
    expect(nextStatusOf("CANCELLED", "DELIVERY")).toBeNull()
  })

  it("offers every other open status by hand, a pick-up's without 'out for delivery'", () => {
    expect(otherStatusesOf("ACCEPTED", "DELIVERY")).toEqual(["RECEIVED", "OUT_FOR_DELIVERY", "DELIVERED"])
    expect(otherStatusesOf("ACCEPTED", "PICKUP")).toEqual(["RECEIVED", "DELIVERED"])
  })
})

describe("OrderDetail", () => {
  it("shows the lines as photographed and the API's totals", () => {
    render(<OrderDetail order={order} {...props} />)

    const items = screen.getByRole("region", { name: "Itens" })
    expect(within(items).getByText("Sabor: Baunilha · Peso: 900 g · WHEY-BAU-900")).toBeInTheDocument()
    expect(within(items).getByText("2 × R$ 129,90")).toBeInTheDocument()
    expect(within(items).getByText("R$ 259,80")).toBeInTheDocument()
    expect(within(items).getByText("− R$ 5,00")).toBeInTheDocument()
    expect(within(items).getByText("R$ 289,70")).toBeInTheDocument()
  })

  it("shows the customer, how it leaves and is paid, and a way to talk to them", () => {
    render(<OrderDetail order={order} {...props} />)

    const facts = screen.getByRole("region", { name: "Cliente" })
    expect(within(facts).getByText("Av. Paulista, 1000 — São Paulo/SP")).toBeInTheDocument()
    expect(within(facts).getByText("Entrega")).toBeInTheDocument()
    expect(within(facts).getByText("Pix")).toBeInTheDocument()
    expect(within(facts).getByText("Entregar depois das 18h")).toBeInTheDocument()
    expect(within(facts).getByRole("link", { name: "Chamar no WhatsApp" })).toHaveAttribute("href", props.whatsappHref)
  })

  it("leads the customer's name to their record when it is given one, and leaves it text otherwise", () => {
    const { rerender } = render(<OrderDetail order={order} {...props} customerHref="/admin/loja/customers/c1" />)

    const name = within(screen.getByRole("region", { name: "Cliente" })).getByRole("link", { name: `Abrir a ficha de ${order.customer.name}` })
    expect(name).toHaveAttribute("href", "/admin/loja/customers/c1")
    expect(name).toHaveTextContent(order.customer.name)

    rerender(<OrderDetail order={order} {...props} />)
    expect(screen.queryByRole("link", { name: `Abrir a ficha de ${order.customer.name}` })).not.toBeInTheDocument()
  })

  it("moves the order to its next step with one press", async () => {
    const onStatusChange = vi.fn()
    render(<OrderDetail order={order} {...props} onStatusChange={onStatusChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Marcar como em preparo" }))
    expect(onStatusChange).toHaveBeenCalledWith("PREPARING")
  })

  it("cancels only after a confirmation that says what cancelling does", async () => {
    const onStatusChange = vi.fn()
    render(<OrderDetail order={order} {...props} onStatusChange={onStatusChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Outros status" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancelar pedido" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Ele sai do resumo do cliente")
    expect(onStatusChange).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar pedido" }))
    expect(onStatusChange).toHaveBeenCalledWith("CANCELLED")
  })

  it("offers no status change once the order is cancelled", () => {
    render(<OrderDetail order={{ ...order, status: "CANCELLED" }} {...props} />)

    expect(screen.queryByRole("button", { name: /Marcar como/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Outros status" })).not.toBeInTheDocument()
    expect(screen.getByText("Este pedido foi cancelado e não muda mais de status.")).toBeInTheDocument()
  })

  it("keeps a note's line breaks, and wraps a long unbroken one inside the card", () => {
    render(<OrderDetail order={{ ...order, note: "Entregar depois das 18h\nPortão azul" }} {...props} />)

    const note = within(screen.getByRole("region", { name: "Cliente" })).getByText(/Portão azul/)
    expect(note.textContent).toBe("Entregar depois das 18h\nPortão azul")
    expect(note).toHaveClass("whitespace-pre-line", "break-words")
  })

  describe("after a press moves the order", () => {
    /** The screen's part: the order on screen follows the move, as the cache does after the PATCH. */
    function Moving({ from }: { from: OrderDetailView }) {
      const [status, setStatus] = useState<OrderStatusValue>(from.status)
      return <OrderDetail order={{ ...from, status }} {...props} onStatusChange={setStatus} />
    }

    it("keeps the focus on the step button and says the new status", async () => {
      render(<Moving from={order} />)

      await userEvent.click(screen.getByRole("button", { name: "Marcar como em preparo" }))

      expect(screen.getByRole("status")).toHaveTextContent("Status do pedido: Em preparo")
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /Marcar como/ }))
    })

    // "Entregue" has no next step: the pressed button goes, and the focus must not fall to the page.
    it("holds the focus in the block when the pressed button goes away", async () => {
      render(<Moving from={{ ...order, status: "OUT_FOR_DELIVERY" }} />)

      await userEvent.click(screen.getByRole("button", { name: "Marcar como entregue" }))

      expect(screen.getByRole("status")).toHaveTextContent("Status do pedido: Entregue")
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement?.contains(screen.getByRole("group", { name: "Status do pedido" }))).toBe(true)
    })

    it("holds the focus in the block once a cancel takes every control away", async () => {
      render(<Moving from={order} />)

      await userEvent.click(screen.getByRole("button", { name: "Outros status" }))
      await userEvent.click(await screen.findByRole("menuitem", { name: "Cancelar pedido" }))
      await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar pedido" }))

      expect(await screen.findByText("Este pedido foi cancelado e não muda mais de status.")).toBeInTheDocument()
      expect(screen.getByRole("status")).toHaveTextContent("Status do pedido: Cancelado")
      expect(document.activeElement).not.toBe(document.body)
    })

    it("stays focusable while the move is on its way", () => {
      render(<OrderDetail order={order} {...props} statusPending />)

      expect(screen.getByRole("button", { name: "Marcar como em preparo" })).toHaveAttribute("aria-disabled", "true")
      expect(screen.getByRole("button", { name: "Marcar como em preparo" })).not.toHaveAttribute("disabled")
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<OrderDetail order={order} {...props} />)
    await expectNoA11yViolations(container)
  })
})
