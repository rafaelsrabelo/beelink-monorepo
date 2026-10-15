// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TYPED_CNPJ, TYPED_CPF, exampleAccount, exampleOffers, offersWithOpenInvoice } from "./billing.fixtures"
import { SubscriptionCheckout, type SubscriptionCheckoutProps } from "./subscription-checkout"

/** `Intl` parts "R$" from its number with a no-break space; a sentence is compared with an ordinary one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\u00a0\u202f]/g, " ")

function show(props: Partial<SubscriptionCheckoutProps> = {}) {
  const onSubmit = vi.fn()
  const view = render(<SubscriptionCheckout offers={exampleOffers} account={null} loss={{ kind: "trial", daysLeft: 5 }} locale="pt-BR" onSubmit={onSubmit} {...props} />)
  return { ...view, onSubmit }
}

const cycles = () => screen.getByRole("radiogroup", { name: "Escolha o período do plano" })
const radio = (name: string) => screen.getByRole("radio", { name })
const button = () => screen.getByRole("button", { name: /Assinar e pagar|Continuar o pagamento|Trocar de plano|Gerando a fatura/ })
const facts = () => within(screen.getByRole("region", { name: "Antes de assinar" })).getAllByRole("listitem").map((item) => plain(item.textContent))
/** The lines a cycle's radio is described by. */
const figuresOf = (name: string) => [...(document.getElementById(radio(name).getAttribute("aria-describedby") ?? "")?.querySelectorAll("p") ?? [])].map((line) => plain(line.textContent))

describe("SubscriptionCheckout (BEELINK-293), the cycles", () => {
  it("offers the three as a radio group with a legend, each named by its cycle and described by its figures", async () => {
    const { container } = show({ account: exampleAccount })

    expect(within(cycles()).getAllByRole("radio")).toHaveLength(3)
    expect(radio("Mensal")).toHaveAttribute("aria-checked", "true")
    expect(figuresOf("Mensal")).toEqual(["R$ 100,00 por mês", "Cobrado mês a mês.", "Renova em 15/11/2026."])
    expect(figuresOf("Semestral")).toEqual(["R$ 90,00 por mês", "R$ 540,00 hoje, pelos 6 meses.", "Economia de R$ 60,00 (10%) em relação ao mensal.", "Renova em 15/04/2027."])
    expect(figuresOf("Anual")).toEqual(["R$ 80,00 por mês", "R$ 960,00 hoje, pelos 12 meses.", "Economia de R$ 240,00 (20%) em relação ao mensal.", "Renova em 15/10/2027."])
    expect(plain(button().textContent)).toBe("Assinar e pagar R$ 100,00")
    await expectNoA11yViolations(container)
  })

  it("moves between the cycles with the arrows, and the amount paid today follows the choice", async () => {
    show({ account: exampleAccount })

    await userEvent.click(radio("Mensal"))
    await userEvent.keyboard("{ArrowRight}")

    expect(radio("Semestral")).toHaveAttribute("aria-checked", "true")
    expect(plain(button().textContent)).toBe("Assinar e pagar R$ 540,00")
    expect(facts()[0]).toBe("Você paga hoje R$ 540,00, por esta página. Cada página tem o seu plano.")
  })

  it("hands over the cycle chosen, and nothing of who is charged when it did not ask", async () => {
    const { onSubmit } = show({ account: exampleAccount })

    await userEvent.click(radio("Anual"))
    await userEvent.click(button())

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ cycle: "ANNUAL", name: "", document: "" }, false)
  })
})

describe("SubscriptionCheckout, what is said before the button", () => {
  it.each([
    [{ kind: "trial", daysLeft: 5 } as const, "Assinando agora, você perde os 5 dias de teste que faltam: o plano começa a contar hoje."],
    [{ kind: "trial", daysLeft: 1 } as const, "Assinando agora, você perde o dia de teste que falta: o plano começa a contar hoje."],
    [{ kind: "trial", daysLeft: 0 } as const, "O plano começa a contar hoje, último dia do teste."],
    [{ kind: "canceled" } as const, "Assinando agora, você perde os dias que faltavam do período já pago: o plano novo começa a contar hoje."],
  ])("says the first charge is today, what is given up (%o), how it renews, where it is paid and how to cancel", (loss, given) => {
    show({ account: exampleAccount, loss })

    expect(facts()).toEqual([
      "Você paga hoje R$ 100,00, por esta página. Cada página tem o seu plano.",
      given,
      "Com cartão de crédito, o plano renova sozinho no mesmo cartão. Com Pix, boleto ou cartão de débito, cada renovação é uma fatura nova para pagar, que aparece aqui no painel.",
      "A fatura abre no Asaas, em outra aba: lá você escolhe pagar com cartão, Pix ou boleto. O cartão é digitado só no Asaas.",
      "Ainda não dá para cancelar pelo painel. Para cancelar, fale com a Beelink: a página continua funcionando até o fim do período já pago.",
    ])
  })

  it("gives nothing up where there is nothing left: a trial over", () => {
    show({ account: exampleAccount, loss: null })

    expect(facts()).toHaveLength(4)
  })
})

describe("SubscriptionCheckout, who is charged", () => {
  const name = () => screen.getByLabelText("Nome completo ou razão social")
  const documentField = () => screen.getByLabelText<HTMLInputElement>("CPF ou CNPJ")

  it("asks an account that never said for a name and a CPF or CNPJ, and refuses what does not check out", async () => {
    const { container, onSubmit } = show()

    await userEvent.click(button())

    expect(onSubmit).not.toHaveBeenCalled()
    expect(name()).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Informe o nome completo ou a razão social.")).toBeInTheDocument()
    expect(screen.getByText("CPF ou CNPJ inválido: confira os números digitados.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("writes the document as it is typed, a CPF's shape and then a CNPJ's, and hands both over", async () => {
    const { onSubmit } = show()

    await userEvent.type(name(), "Maria Souza Lima")
    await userEvent.type(documentField(), TYPED_CPF)
    expect(documentField().value).toBe("529.982.247-25")
    await userEvent.clear(documentField())
    await userEvent.type(documentField(), TYPED_CNPJ)
    expect(documentField().value).toBe("11.222.333/0001-81")
    await userEvent.click(button())

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ cycle: "MONTHLY", name: "Maria Souza Lima", document: "11.222.333/0001-81" }, true)
  })

  it("says who an account is charged to, masked, and opens the two fields to change it — and closes them again", async () => {
    show({ account: exampleAccount })

    expect(screen.getByText("Cobrança em nome de Maria Souza Lima, CPF ***.982.247-**.")).toBeInTheDocument()
    expect(screen.queryByLabelText("CPF ou CNPJ")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Alterar dados de cobrança" }))
    expect(documentField()).toHaveValue("")
    await userEvent.click(screen.getByRole("button", { name: "Manter os dados atuais" }))
    expect(screen.queryByLabelText("CPF ou CNPJ")).toBeNull()
  })

  it("does not refuse what it no longer asks: fields left wrong, then kept as they were", async () => {
    const { onSubmit } = show({ account: exampleAccount })

    await userEvent.click(screen.getByRole("button", { name: "Alterar dados de cobrança" }))
    await userEvent.type(documentField(), "123")
    await userEvent.click(screen.getByRole("button", { name: "Manter os dados atuais" }))
    await userEvent.click(button())

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ cycle: "MONTHLY", name: "", document: "" }, false)
  })

  it("draws the fields when the API asked who is charged, whatever the screen held", () => {
    show({ account: exampleAccount, accountRequired: true })

    expect(documentField()).toBeInTheDocument()
  })

  it("puts the API's refusal of a field on that field, and the focus there", async () => {
    show({ fieldErrors: { document: "O CPF não passou." } })

    expect(documentField()).toHaveAttribute("aria-invalid", "true")
    expect(documentField()).toHaveAccessibleDescription("O CPF não passou.")
    await waitFor(() => expect(documentField()).toHaveFocus())
  })
})

describe("SubscriptionCheckout, an invoice already open", () => {
  it("comes with its cycle chosen and carries on with it", async () => {
    const { onSubmit } = show({ account: exampleAccount, offers: offersWithOpenInvoice, openInvoice: { cycle: "SEMIANNUAL", totalCents: 54000 } })

    expect(plain(screen.getByText(/Você já escolheu o plano/).textContent)).toBe("Você já escolheu o plano Semestral, de R$ 540,00, e a fatura dele ainda não foi paga. Continue o pagamento na mesma fatura.")
    expect(radio("Semestral")).toHaveAttribute("aria-checked", "true")
    expect(figuresOf("Semestral")).toContain("Renova a contar do vencimento da fatura em aberto.")
    expect(button()).toHaveTextContent("Continuar o pagamento")

    await userEvent.click(button())
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ cycle: "SEMIANNUAL", name: "", document: "" }, false)
  })

  it("says the open invoice stops being payable before another cycle is paid for", async () => {
    show({ account: exampleAccount, offers: offersWithOpenInvoice, openInvoice: { cycle: "SEMIANNUAL", totalCents: 54000 } })

    await userEvent.click(radio("Anual"))

    expect(screen.getByText(/Trocar de plano cancela a fatura em aberto/)).toBeInTheDocument()
    expect(plain(button().textContent)).toBe("Trocar de plano e pagar R$ 960,00")
  })
})

describe("SubscriptionCheckout, while and after it is sent", () => {
  it("locks the button and the cycles while the invoice is made", () => {
    show({ account: exampleAccount, pending: true })

    expect(button()).toBeDisabled()
    expect(button()).toHaveTextContent("Gerando a fatura…")
    expect(radio("Anual")).toHaveAttribute("aria-disabled", "true")
  })

  it("says why the last try did not go through", () => {
    show({ account: exampleAccount, error: "O Asaas não respondeu." })

    expect(screen.getByRole("alert")).toHaveTextContent("O Asaas não respondeu.")
  })

  it("offers no button where nothing can be bought, and says why — asking nothing of who is charged and telling nothing of paying", () => {
    show({ blocked: "A assinatura está indisponível no momento." })

    expect(screen.queryByRole("button", { name: /Assinar e pagar/ })).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("A assinatura está indisponível no momento.")
    expect(screen.queryByLabelText("CPF ou CNPJ")).toBeNull()
    expect(screen.queryByRole("region", { name: "Antes de assinar" })).toBeNull()
    expect(screen.getAllByRole("radio")).toHaveLength(3)
  })

  it("still says why where there is no cycle to offer at all", () => {
    show({ offers: [], blocked: "A assinatura está indisponível no momento." })

    expect(screen.queryByRole("radio")).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("A assinatura está indisponível no momento.")
  })

  it("speaks the reader's language", () => {
    show({ account: exampleAccount, messages: en, locale: "en" })

    expect(screen.getByRole("radiogroup", { name: "Choose the plan's period" })).toBeInTheDocument()
    expect(plain(screen.getByRole("button", { name: /Subscribe and pay/ }).textContent)).toBe("Subscribe and pay R$100.00")
  })
})
