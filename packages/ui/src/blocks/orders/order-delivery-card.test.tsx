// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderDeliveryCard } from "./order-delivery-card"

const told = { kind: "CARRIER" as const, carrier: "Correios", service: "SEDEX", trackingCode: "AB123456789BR", trackingUrl: null, estimateFrom: "2026-09-25", estimateTo: "2026-09-26" }

describe("OrderDeliveryCard", () => {
  it("sends the whole delivery, with what was left empty as nothing", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<OrderDeliveryCard delivery={null} onSave={onSave} onClear={() => {}} />)

    await user.click(screen.getByRole("button", { name: "Transportadora" }))
    await user.type(screen.getByLabelText("Transportadora"), "Correios")
    await user.type(screen.getByLabelText("Código de rastreio"), "AB123456789BR")
    await user.type(screen.getByLabelText("De"), "2026-09-25")
    await user.type(screen.getByLabelText("Até"), "2026-09-26")
    await user.click(screen.getByRole("button", { name: "Salvar entrega" }))

    expect(onSave).toHaveBeenCalledWith({ kind: "CARRIER", carrier: "Correios", service: null, trackingCode: "AB123456789BR", trackingUrl: null, estimateFrom: "2026-09-25", estimateTo: "2026-09-26" })
  })

  /** The shop's own delivery has no carrier: what was typed for one is not sent. */
  it("sends no carrier for the shop's own delivery", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<OrderDeliveryCard delivery={told} onSave={onSave} onClear={() => {}} />)

    await user.click(screen.getByRole("button", { name: "Entrega própria" }))
    expect(screen.queryByLabelText("Transportadora")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Salvar entrega" }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ kind: "OWN", carrier: null, service: null, trackingCode: "AB123456789BR" }))
  })

  it("starts from what was told, takes it back, asks for it once out for delivery, and says how the save went", async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const { rerender } = render(<OrderDeliveryCard delivery={told} onSave={() => {}} onClear={onClear} needed saved />)

    expect(screen.getByLabelText("Código de rastreio")).toHaveValue("AB123456789BR")
    expect(screen.getByText("O pedido saiu para entrega: diga quem entrega e quando chega.")).toBeInTheDocument()
    expect(screen.getByText("Entrega salva.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Remover" }))
    expect(onClear).toHaveBeenCalledOnce()

    rerender(<OrderDeliveryCard delivery={null} onSave={() => {}} onClear={onClear} error="A previsão precisa das duas datas." />)
    expect(screen.getByRole("alert")).toHaveTextContent("A previsão precisa das duas datas.")
    expect(screen.queryByRole("button", { name: "Remover" })).toBeNull()
  })

  /** Remounted, the form would drop the focus and create its live region already full, which nobody hears. */
  it("starts over from a new save in place, and says it saved until the form is edited again", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OrderDeliveryCard delivery={told} onSave={() => {}} onClear={() => {}} />)
    const code = screen.getByLabelText("Código de rastreio")
    expect(screen.queryByText("Entrega salva.")).toBeNull()

    rerender(<OrderDeliveryCard delivery={{ ...told, trackingCode: "CD987654321BR" }} onSave={() => {}} onClear={() => {}} saved />)
    expect(screen.getByLabelText("Código de rastreio")).toBe(code)
    expect(code).toHaveValue("CD987654321BR")
    expect(screen.getByText("Entrega salva.")).toBeInTheDocument()

    await user.type(code, "X")
    expect(screen.queryByText("Entrega salva.")).toBeNull()
  })

  it("hands focus to its title once a removal takes the button away", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OrderDeliveryCard delivery={told} onSave={() => {}} onClear={() => {}} />)

    await user.click(screen.getByRole("button", { name: "Remover" }))
    rerender(<OrderDeliveryCard delivery={null} onSave={() => {}} onClear={() => {}} />)

    await waitFor(() => expect(screen.getByRole("heading", { name: "Entrega" })).toHaveFocus())
    expect(screen.getByLabelText("Código de rastreio")).toHaveValue("")
  })

  it("ties the link's hint to its field", () => {
    render(<OrderDeliveryCard delivery={null} onSave={() => {}} onClear={() => {}} />)
    expect(screen.getByLabelText("Link de rastreio")).toHaveAccessibleDescription("Começa com https://. Vazio, um código dos Correios leva ao site deles.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<OrderDeliveryCard delivery={told} onSave={() => {}} onClear={() => {}} needed />)
    await expectNoA11yViolations(container)
  })
})
