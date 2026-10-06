// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutPayment, type StorefrontCheckoutOnline, type StorefrontCheckoutPaymentValue } from "./storefront-checkout-payment"

const ONLINE: StorefrontCheckoutOnline = {
  methods: ["PIX", "CREDIT_CARD"],
  unavailable: null,
  installments: [
    { count: 1, label: "1x de R$ 120,00 (à vista)" },
    { count: 2, label: "2x de R$ 60,00 sem juros" },
    { count: 3, label: "3x de R$ 40,00 sem juros" },
  ],
  note: null,
  document: null,
}
const NONE: StorefrontCheckoutPaymentValue = { paymentMethod: null }
const CARD: StorefrontCheckoutPaymentValue = { paymentChannel: "ONLINE", paymentMethod: "CREDIT_CARD", installments: 1 }

describe("StorefrontCheckoutPayment", () => {
  it("shows the shop's own labels alone, as before, at a shop that charges nothing online", async () => {
    const onChange = vi.fn()
    render(<StorefrontCheckoutPayment value={NONE} onChange={onChange} offlineMethods={["MONEY", "PIX"]} />)

    expect(screen.getAllByRole("radio")).toHaveLength(2)
    expect(screen.queryByText("Pagar agora")).toBeNull()
    expect(screen.queryByText("Pagar na entrega ou na retirada")).toBeNull()

    await userEvent.click(screen.getByRole("radio", { name: "Pix" }))
    expect(onChange).toHaveBeenLastCalledWith({ paymentChannel: "OFFLINE", paymentMethod: "PIX", installments: 1 })
  })

  it("offers paying now beside the shop's labels, each group under its name, and says which channel was picked", async () => {
    const onChange = vi.fn()
    render(<StorefrontCheckoutPayment value={NONE} onChange={onChange} offlineMethods={["MONEY", "PIX"]} online={ONLINE} />)

    expect(screen.getByRole("group", { name: "Pagar agora" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Pagar na entrega ou na retirada" })).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(4)

    await userEvent.click(screen.getByRole("radio", { name: /^Pix ?O QR code/ }))
    expect(onChange).toHaveBeenLastCalledWith({ paymentChannel: "ONLINE", paymentMethod: "PIX", installments: 1 })
    await userEvent.click(screen.getByRole("radio", { name: /^Cartão de crédito/ }))
    expect(onChange).toHaveBeenLastCalledWith({ paymentChannel: "ONLINE", paymentMethod: "CREDIT_CARD", installments: 1 })
    await userEvent.click(screen.getByRole("radio", { name: "Dinheiro" }))
    expect(onChange).toHaveBeenLastCalledWith({ paymentChannel: "OFFLINE", paymentMethod: "MONEY", installments: 1 })
  })

  it("marks a Pix paid now and a Pix settled with the shop apart", () => {
    render(<StorefrontCheckoutPayment value={{ paymentChannel: "ONLINE", paymentMethod: "PIX" }} onChange={() => {}} offlineMethods={["PIX"]} online={ONLINE} />)

    expect(screen.getByRole("radio", { name: /^Pix ?O QR code/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Pix" })).not.toBeChecked()
  })

  it("lists a card's instalments, each at its amount, only once the card is chosen", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<StorefrontCheckoutPayment value={{ paymentChannel: "ONLINE", paymentMethod: "PIX" }} onChange={onChange} offlineMethods={[]} online={ONLINE} />)
    expect(screen.queryByRole("combobox", { name: "Parcelas" })).toBeNull()

    rerender(<StorefrontCheckoutPayment value={CARD} onChange={onChange} offlineMethods={[]} online={ONLINE} />)
    const select = screen.getByRole("combobox", { name: "Parcelas" })
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["1x de R$ 120,00 (à vista)", "2x de R$ 60,00 sem juros", "3x de R$ 40,00 sem juros"])

    await userEvent.selectOptions(select, "3")
    expect(onChange).toHaveBeenLastCalledWith({ ...CARD, installments: 3 })
  })

  it("shows the online ways alone, with no group title, where the shop turned paying on delivery off", () => {
    render(<StorefrontCheckoutPayment value={NONE} onChange={() => {}} offlineMethods={[]} online={ONLINE} />)

    expect(screen.getAllByRole("radio")).toHaveLength(2)
    expect(screen.queryByText("Pagar na entrega ou na retirada")).toBeNull()
  })

  it("switches the online ways off, and says why, when the total is under the least charged online", () => {
    render(<StorefrontCheckoutPayment value={NONE} onChange={() => {}} offlineMethods={["MONEY"]} online={{ ...ONLINE, installments: [], unavailable: "O pagamento online vale para pedidos a partir de R$ 5,00." }} />)

    expect(screen.getByRole("radio", { name: /^Pix ?O QR code/ })).toBeDisabled()
    expect(screen.getByRole("radio", { name: /^Cartão de crédito/ })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Dinheiro" })).toBeEnabled()
    expect(screen.getByRole("status")).toHaveTextContent("a partir de R$ 5,00")
  })

  it("asks the payer's CPF, and says a fee to be agreed is paid afterwards, only with an online way chosen", async () => {
    const onDocument = vi.fn()
    const online = { ...ONLINE, note: "Você paga depois que a loja informar o frete.", document: { value: "", onChange: onDocument } }
    const { rerender } = render(<StorefrontCheckoutPayment value={{ paymentChannel: "OFFLINE", paymentMethod: "MONEY" }} onChange={() => {}} offlineMethods={["MONEY"]} online={online} />)
    expect(screen.queryByLabelText("Seu CPF")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()

    rerender(<StorefrontCheckoutPayment value={{ paymentChannel: "ONLINE", paymentMethod: "PIX" }} onChange={() => {}} offlineMethods={["MONEY"]} online={online} />)
    expect(screen.getByRole("status")).toHaveTextContent("Você paga depois que a loja informar o frete.")
    await userEvent.type(screen.getByLabelText("Seu CPF"), "5")
    expect(onDocument).toHaveBeenLastCalledWith("5")
  })

  it("asks nothing when there is nothing to pay", () => {
    render(<StorefrontCheckoutPayment value={NONE} onChange={() => {}} offlineMethods={["MONEY"]} online={ONLINE} nothingToPay="Nada a pagar: o desconto cobre o pedido inteiro." />)

    expect(screen.queryByRole("radio")).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("Nada a pagar")
  })

  it("has no accessibility violations, with a card chosen and the CPF asked", async () => {
    const { container } = render(<StorefrontCheckoutPayment value={CARD} onChange={() => {}} offlineMethods={["MONEY", "PIX"]} online={{ ...ONLINE, note: "Você paga depois.", document: { value: "", onChange: () => {} } }} />)

    await expectNoA11yViolations(container)
  })
})
