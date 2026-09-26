// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerProfileForm, type CustomerProfileFormProps } from "./customer-profile-form"
import { customerRecord } from "./customers.fixtures"

function renderForm(overrides: Partial<CustomerProfileFormProps> = {}) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  const { container } = render(<CustomerProfileForm customer={customerRecord} onSubmit={onSubmit} onCancel={onCancel} {...overrides} />)
  return { onSubmit, onCancel, container }
}

describe("CustomerProfileForm", () => {
  it("starts from the record, and sends the name trimmed, the phone as typed and every address part", async () => {
    const { onSubmit } = renderForm()

    expect(screen.getByLabelText("Nome")).toHaveValue("Caio Lima")
    expect(screen.getByLabelText("Celular")).toHaveValue("5511955554444")
    expect(screen.getByLabelText("Complemento")).toHaveValue("apto 12")

    await userEvent.clear(screen.getByLabelText("Nome"))
    await userEvent.type(screen.getByLabelText("Nome"), "  Caio Lima Souza ")
    await userEvent.clear(screen.getByLabelText("Celular"))
    await userEvent.type(screen.getByLabelText("Celular"), "(19) 98888-7777")
    await userEvent.clear(screen.getByLabelText("Complemento"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Caio Lima Souza",
      phone: "(19) 98888-7777",
      address: { zipCode: "13015-904", street: "Rua Barão de Jaguara", number: "1000", complement: "", neighborhood: "Centro", city: "Campinas", state: "SP" },
    })
  })

  it("shows the e-mail and says why it is not a field — or that there is none", () => {
    renderForm({ customer: { ...customerRecord, email: "caio@exemplo.com" } })
    expect(screen.getByText("caio@exemplo.com")).toBeInTheDocument()
    expect(screen.getByText("O e-mail é da conta do cliente e não se edita aqui.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "E-mail" })).not.toBeInTheDocument()
  })

  it("says so of a customer the shop registered, who has no e-mail", () => {
    renderForm()

    expect(screen.getByText("Sem e-mail: cadastrado pela loja, sem conta.")).toBeInTheDocument()
  })

  it("points at a short name, a phone emptied or without its area code and a malformed CEP, sends nothing and focuses the first", async () => {
    const { onSubmit } = renderForm()

    await userEvent.clear(screen.getByLabelText("Nome"))
    await userEvent.type(screen.getByLabelText("Nome"), "C")
    await userEvent.clear(screen.getByLabelText("Celular"))
    await userEvent.clear(screen.getByLabelText("CEP"))
    await userEvent.type(screen.getByLabelText("CEP"), "130")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Nome")).toHaveAccessibleDescription("Digite o nome, com pelo menos 2 letras.")
    expect(screen.getByLabelText("Celular")).toHaveAccessibleDescription("Digite o celular com DDD, como (11) 98888-7777.")
    expect(screen.getByLabelText("CEP")).toHaveAccessibleDescription("O CEP tem 8 dígitos.")
    expect(screen.getByLabelText("Nome")).toHaveFocus()
  })

  it("lets a record that never had a phone keep none", async () => {
    const { onSubmit } = renderForm({ customer: { ...customerRecord, phone: null } })

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ phone: "" }))
  })

  it("puts a refused phone at the phone field, keeping what was typed, and moves the focus there", async () => {
    function Refusing() {
      const [error, setError] = useState<string>()
      return <CustomerProfileForm customer={customerRecord} onSubmit={() => setError("Esse celular já está no cadastro de outro cliente desta loja.")} onCancel={() => {}} phoneError={error} />
    }
    render(<Refusing />)

    await userEvent.clear(screen.getByLabelText("Celular"))
    await userEvent.type(screen.getByLabelText("Celular"), "11977776666")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    const phone = screen.getByLabelText("Celular")
    expect(phone).toHaveValue("11977776666")
    expect(phone).toHaveAttribute("aria-invalid", "true")
    expect(phone).toHaveAccessibleDescription("Esse celular já está no cadastro de outro cliente desta loja.")
    expect(phone).toHaveFocus()
  })

  it("holds both buttons while saving", () => {
    renderForm({ pending: true })

    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
  })

  it("cancels without sending", async () => {
    const { onSubmit, onCancel } = renderForm()

    await userEvent.type(screen.getByLabelText("Nome"), " Souza")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("speaks the panel's language", () => {
    renderForm({ messages: en })

    expect(screen.getByLabelText("Phone")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })

  it("has no accessibility violations, with a refusal on screen", async () => {
    const { container } = renderForm({ phoneError: "Esse celular já está no cadastro de outro cliente desta loja.", error: "Algo deu errado." })

    await expectNoA11yViolations(container)
  })
})
