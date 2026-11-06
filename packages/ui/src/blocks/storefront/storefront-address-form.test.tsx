// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAddressForm, type StorefrontAddressFormProps, type StorefrontAddressFormValues } from "./storefront-address-form"

const blank: StorefrontAddressFormValues = {
  id: null,
  label: null,
  recipientName: null,
  zipCode: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
}

function form(props: Partial<StorefrontAddressFormProps> = {}) {
  return (
    <StorefrontAddressForm
      address={blank}
      shopperName="Rafael Souza"
      action="/loja/api/customer/enderecos/salvar"
      hidden={{ retorno: "/loja/conta/perfil" }}
      cancelHref="/loja/conta/perfil"
      offerDefault
      {...props}
    />
  )
}

describe("StorefrontAddressForm", () => {
  it("asks for a new address, the browser holding it to a ZIP code, a street, a city and a state", () => {
    const { container } = render(form())

    expect(screen.getByRole("heading", { name: "Novo endereço" })).toBeInTheDocument()
    expect(container.querySelector("form")).toHaveAttribute("action", "/loja/api/customer/enderecos/salvar")
    expect(container.querySelector('input[name="id"]')).toBeNull()
    // Blank is the shopper: their name stands in the field until something else is typed.
    expect(screen.getByLabelText(/^Quem recebe/)).toHaveAttribute("placeholder", "Rafael Souza")
    for (const name of ["CEP", "Rua", "Cidade", "UF"]) expect(screen.getByLabelText(name)).toBeRequired()
    expect(screen.getByLabelText("Número")).not.toBeRequired()
    expect(screen.getByLabelText("Usar como endereço padrão")).not.toBeChecked()
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/loja/conta/perfil")
    // Without a lookup to call, there is no button to press.
    expect(screen.queryByRole("button", { name: "Buscar CEP" })).toBeNull()
  })

  it("edits a saved address with its own values and id, and offers the default only where asked", () => {
    const { container } = render(
      form({ address: { ...blank, id: "a1", label: "Casa", zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", city: "Fortaleza", state: "CE" }, offerDefault: false }),
    )

    expect(screen.getByRole("heading", { name: "Editar endereço" })).toBeInTheDocument()
    expect(container.querySelector('input[name="id"]')).toHaveValue("a1")
    expect(screen.getByLabelText(/^Apelido/)).toHaveValue("Casa")
    expect(screen.getByLabelText("Rua")).toHaveValue("Rua Tibúrcio Cavalcante")
    expect(screen.queryByLabelText("Usar como endereço padrão")).toBeNull()
  })

  it("fills the street, neighbourhood, city and state from the ZIP code as it is typed, then moves on to the number", async () => {
    const onZipCodeLookup = vi.fn(async () => ({ status: "found" as const, street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" }))
    render(form({ onZipCodeLookup }))

    // The eighth digit asks: no button to find on a phone.
    await userEvent.type(screen.getByLabelText("CEP"), "60160230")

    expect(onZipCodeLookup).toHaveBeenCalledExactlyOnceWith("60160230")
    expect(screen.getByLabelText("Rua")).toHaveValue("Rua Tibúrcio Cavalcante")
    expect(screen.getByLabelText("Bairro")).toHaveValue("Meireles")
    expect(screen.getByLabelText("UF")).toHaveValue("CE")
    expect(screen.getByLabelText("Número")).toHaveFocus()
  })

  it("says when the ZIP code is unknown or the lookup is down, back on the ZIP code, leaving the fields to be typed", async () => {
    const onZipCodeLookup = vi.fn().mockResolvedValueOnce({ status: "not-found" }).mockResolvedValueOnce({ status: "unavailable" })
    render(form({ onZipCodeLookup }))

    await userEvent.type(screen.getByLabelText("CEP"), "99999999")
    expect(screen.getByRole("status")).toHaveTextContent("Não achamos esse CEP.")
    expect(screen.getByLabelText("CEP")).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))
    expect(screen.getByRole("status")).toHaveTextContent("Não deu para buscar o CEP agora.")
    expect(screen.getByLabelText("Rua")).toHaveValue("")
  })

  /** A city-wide CEP names no street: the street is where the shopper goes on, not the number. */
  it("moves on to the street when the ZIP code names none, and states the formats it asks for", async () => {
    render(form({ onZipCodeLookup: async () => ({ status: "found", street: null, neighborhood: null, city: "Maracanaú", state: "CE" }) }))

    await userEvent.type(screen.getByLabelText("CEP"), "61900000")
    expect(screen.getByLabelText("Cidade")).toHaveValue("Maracanaú")
    expect(screen.getByLabelText("Rua")).toHaveFocus()
    expect(screen.getByLabelText("CEP")).toHaveAttribute("title", "8 números, como 60160-230")
    expect(screen.getByLabelText("UF")).toHaveAttribute("title", "2 letras, como CE")
  })

  it("leaves what the lookup wrote to be corrected, as any field", async () => {
    render(form({ onZipCodeLookup: async () => ({ status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" }) }))

    await userEvent.type(screen.getByLabelText("CEP"), "60160230")
    await userEvent.clear(screen.getByLabelText("Bairro"))
    await userEvent.type(screen.getByLabelText("Bairro"), "Aldeota")
    expect(screen.getByLabelText("Bairro")).toHaveValue("Aldeota")
  })

  /** The checkout's form: the CEP first, only what a delivery needs, closed in place. */
  it("asks only what a delivery needs in the checkout, the CEP first, and closes in place", async () => {
    const onCancel = vi.fn()
    const { container } = render(form({ compact: true, cancelHref: undefined, onCancel, autoFocus: true }))

    expect(screen.getByRole("heading", { name: "Onde entregar" })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Apelido/)).toBeNull()
    expect(screen.queryByLabelText(/^Quem recebe/)).toBeNull()
    expect(screen.queryByLabelText("Usar como endereço padrão")).toBeNull()
    expect(container.querySelector("input:not([type=hidden])")).toHaveAttribute("name", "zipCode")
    expect(screen.getByLabelText("CEP")).toHaveFocus()
    expect(screen.getByRole("button", { name: "Usar este endereço" })).toHaveAttribute("type", "submit")
    expect(screen.queryByRole("link", { name: "Cancelar" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  describe("the checkout's, with a lookup: the CEP first, and the rest once it is known", () => {
    const fortaleza = async () => ({ status: "found" as const, street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" })
    const checkout = (props: Partial<StorefrontAddressFormProps> = {}) => form({ compact: true, cancelHref: undefined, onCancel: () => {}, onZipCodeLookup: fortaleza, ...props })

    it("asks only the CEP, with no button to use an address that is not there yet", () => {
      render(checkout())

      expect(screen.getByLabelText("CEP")).toBeVisible()
      for (const label of ["Rua", "Número", "Complemento", "Bairro", "Cidade", "UF"]) expect(screen.getByLabelText(label)).not.toBeVisible()
      expect(screen.queryByRole("button", { name: "Usar este endereço" })).toBeNull()
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeVisible()
    })

    it("shows the rest filled once the CEP is found, and moves on to the number", async () => {
      render(checkout())

      await userEvent.type(screen.getByLabelText("CEP"), "60160230")

      expect(screen.getByLabelText("Rua")).toBeVisible()
      expect(screen.getByLabelText("Rua")).toHaveValue("Rua Tibúrcio Cavalcante")
      expect(screen.getByLabelText("Cidade")).toHaveValue("Fortaleza")
      expect(screen.getByLabelText("Número")).toHaveFocus()
      expect(screen.getByRole("button", { name: "Usar este endereço" })).toBeVisible()
    })

    it("shows the rest empty, to be typed, when the CEP is unknown or the lookup is down — and nothing before a whole CEP", async () => {
      render(checkout({ onZipCodeLookup: async () => ({ status: "not-found" }) }))

      await userEvent.type(screen.getByLabelText("CEP"), "6016")
      await userEvent.tab()
      expect(screen.getByLabelText("Rua")).not.toBeVisible()

      await userEvent.type(screen.getByLabelText("CEP"), "9999")
      expect(screen.getByRole("status")).toHaveTextContent("Não achamos esse CEP.")
      expect(screen.getByLabelText("Rua")).toBeVisible()
      expect(screen.getByLabelText("Rua")).toHaveValue("")
    })

    it("shows a written address whole", () => {
      render(checkout({ address: { ...blank, zipCode: "60160230", street: "Rua Tibúrcio Cavalcante", city: "Fortaleza", state: "CE" } }))

      expect(screen.getByLabelText("Rua")).toBeVisible()
      expect(screen.getByRole("button", { name: "Usar este endereço" })).toBeVisible()
    })

    it("has no accessibility violations, before the CEP and after it", async () => {
      const { container } = render(checkout())
      await expectNoA11yViolations(container)

      await userEvent.type(screen.getByLabelText("CEP"), "60160230")
      await expectNoA11yViolations(container)
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(form({ onZipCodeLookup: async () => ({ status: "not-found" }), error: "Confira o endereço." }))
    await expectNoA11yViolations(container)
  })
})
