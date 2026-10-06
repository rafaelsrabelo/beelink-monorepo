// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { payments } from "./integrations.fixtures"
import { PaymentSettingsForm } from "./payment-settings-form"

const noop = () => {}

describe("PaymentSettingsForm", () => {
  it("switches each way of paying, reporting the whole value, and says under each what it means", async () => {
    const onChange = vi.fn()
    const { container } = render(<PaymentSettingsForm value={payments} onChange={onChange} onSubmit={noop} />)

    expect(screen.getByRole("form", { name: "Formas de pagamento aceitas" })).toBeInTheDocument()
    const pix = screen.getByRole("switch", { name: "Pix" })
    const card = screen.getByRole("switch", { name: "Cartão de crédito" })
    const offline = screen.getByRole("switch", { name: "Pagar na entrega ou na retirada" })
    for (const way of [pix, card, offline]) expect(way).toBeChecked()
    expect(pix).toHaveAccessibleDescription(/QR Code ou Pix copia e cola/)
    expect(card).toHaveAccessibleDescription(/O cartão não passa pelo bee-link/)
    // What the shop does today, said as that: nothing changes for a shop that leaves it on.
    expect(offline).toHaveAccessibleDescription("O acerto é direto com o cliente, como a loja já faz hoje. O bee-link não cobra nada.")

    await userEvent.click(pix)
    expect(onChange).toHaveBeenLastCalledWith({ ...payments, pix: false })
    await userEvent.click(offline)
    expect(onChange).toHaveBeenLastCalledWith({ ...payments, offline: false })
    await expectNoA11yViolations(container)
  })

  it("offers the card's instalments from in full up to twelve, and says the fee is the shop's", async () => {
    const onChange = vi.fn()
    render(<PaymentSettingsForm value={payments} onChange={onChange} onSubmit={noop} />)

    const instalments = screen.getByRole("combobox", { name: "Parcelas sem juros" })
    expect(instalments).toHaveTextContent("Até 3x")
    expect(instalments).toHaveAccessibleDescription("O cliente parcela sem pagar juros: a taxa de parcelamento do Asaas fica com a loja.")

    await userEvent.click(instalments)
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent)
    expect(options).toHaveLength(12)
    expect([options[0], options[1], options[11]]).toEqual(["Só à vista (1x)", "Até 2x", "Até 12x"])

    await userEvent.click(screen.getByRole("option", { name: "Até 12x" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...payments, maxInstallments: 12 })
  })

  it("says in full when the card takes one instalment", () => {
    render(<PaymentSettingsForm value={{ ...payments, maxInstallments: 1 }} onChange={noop} onSubmit={noop} />)
    expect(screen.getByRole("combobox", { name: "Parcelas sem juros" })).toHaveTextContent("Só à vista (1x)")
  })

  /** The number is the shop's choice for when the card is on: off, it is out of sight and not forgotten. */
  it("hides the instalments of a card switched off, and keeps their number as the card is switched on again", async () => {
    const onChange = vi.fn()
    render(<PaymentSettingsForm value={{ ...payments, card: false, maxInstallments: 10 }} onChange={onChange} onSubmit={noop} />)

    expect(screen.queryByRole("combobox")).toBeNull()
    await userEvent.click(screen.getByRole("switch", { name: "Cartão de crédito" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...payments, card: true, maxInstallments: 10 })
  })

  it("says, as an alert, why what is chosen cannot be saved", () => {
    const issue = "Deixe pelo menos uma forma ligada: sem nenhuma, o cliente não tem como pagar."
    render(<PaymentSettingsForm value={{ ...payments, pix: false, card: false, offline: false }} onChange={noop} onSubmit={noop} issue={issue} />)

    expect(screen.getByRole("alert")).toHaveTextContent(issue)
    for (const way of screen.getAllByRole("switch")) expect(way).not.toBeChecked()
  })

  it("saves on submit, and says it saved", async () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<PaymentSettingsForm value={payments} onChange={noop} onSubmit={onSubmit} />)
    expect(screen.queryByText("Formas de pagamento salvas.")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalledOnce()

    rerender(<PaymentSettingsForm value={payments} onChange={noop} onSubmit={onSubmit} saved />)
    expect(screen.getByText("Formas de pagamento salvas.")).toBeInTheDocument()
  })

  it("holds every choice while saving", () => {
    render(<PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} pending />)

    // Base UI's switch is a span: it says it is disabled, since no attribute can make it so.
    for (const way of screen.getAllByRole("switch")) expect(way).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("combobox", { name: "Parcelas sem juros" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
  })

  it("says the API's refusal under the button, and not that it saved", () => {
    const refusal = "Alguma escolha está fora do permitido. Confira as formas e o número de parcelas."
    render(<PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} error={refusal} saved />)

    expect(screen.getByRole("alert")).toHaveTextContent(refusal)
    expect(screen.queryByText("Formas de pagamento salvas.")).toBeNull()
  })

  it("holds its place as grey shapes while the choices are read, with nothing to switch or save", async () => {
    const { container } = render(<PaymentSettingsForm value="loading" onChange={noop} onSubmit={noop} />)

    expect(screen.getByRole("heading", { level: 2, name: "Formas de pagamento aceitas" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Carregando as formas de pagamento…")
    expect(screen.queryByRole("switch")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} messages={en} />)

    expect(screen.getByRole("switch", { name: "Pay on delivery or at pickup" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Interest-free instalments" })).toHaveTextContent("Up to 3x")
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })
})
