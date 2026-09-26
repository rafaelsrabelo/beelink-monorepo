// React
import { useState } from "react"

// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerDuplicates, type CustomerDuplicatesProps } from "./customer-duplicates"
import type { CustomerDuplicateView } from "./customer-types"
import { customerDuplicates } from "./customers.fixtures"

const props: CustomerDuplicatesProps = {
  duplicates: customerDuplicates,
  hrefOf: (id) => `/admin/loja/customers/${id}`,
  asking: null,
  onAsk: () => {},
  onConfirm: () => {},
  onCancel: () => {},
}

/** The section as the screen drives it: a question opens and closes, the merge is the screen's. */
function Driven({ onConfirm, ...overrides }: Partial<CustomerDuplicatesProps>) {
  const [asking, setAsking] = useState<CustomerDuplicateView | null>(null)
  return <CustomerDuplicates {...props} {...overrides} asking={asking} onAsk={setAsking} onCancel={() => setAsking(null)} onConfirm={onConfirm ?? (() => {})} />
}

describe("CustomerDuplicates", () => {
  it("lists each record with why it is offered, how to tell it apart, and a link to it", () => {
    render(<CustomerDuplicates {...props} />)
    const [byPhone, byName] = within(screen.getByRole("region", { name: "Possíveis duplicados" })).getAllByRole("listitem")

    expect(byPhone).toHaveTextContent("Bia (WhatsApp)Mesmo celular5511944443333Sem conta2 pedidos")
    expect(within(byPhone!).getByRole("link", { name: "Bia (WhatsApp)" })).toHaveAttribute("href", "/admin/loja/customers/c9")
    expect(byName).toHaveTextContent("bia souzaMesmo nomeSem contaNenhum pedido")
  })

  it("draws nothing when there is no one to offer", () => {
    const { container } = render(<CustomerDuplicates {...props} duplicates={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("asks before merging, saying this record stays when the other has no account", async () => {
    const onConfirm = vi.fn()
    render(<Driven onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole("button", { name: "Juntar com Bia (WhatsApp)" }))
    const dialog = screen.getByRole("alertdialog", { name: "Juntar com Bia (WhatsApp)?" })

    expect(dialog).toHaveTextContent("Os pedidos de Bia (WhatsApp) passam para este cadastro, e o cadastro de Bia (WhatsApp) é apagado.")
    expect(dialog).toHaveTextContent("Juntar não se desfaz.")
    // Enter on the question must not merge.
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Juntar" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("says the other record stays, and opens next, when it is the one with an account", async () => {
    render(<Driven duplicates={[{ ...customerDuplicates[0]!, name: "Bia Souza", email: "bia@exemplo.com", hasAccount: true }]} />)

    await userEvent.click(screen.getByRole("button", { name: "Juntar com Bia Souza" }))

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Bia Souza tem conta na loja: os pedidos deste cadastro passam para o de Bia Souza, e este é apagado. Em seguida, a ficha de Bia Souza se abre.",
    )
  })

  it("closes on Cancelar, and holds while merging, with the refusal said in the question", async () => {
    const { rerender } = render(<Driven />)
    await userEvent.click(screen.getByRole("button", { name: "Juntar com bia souza" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()

    rerender(<CustomerDuplicates {...props} asking={customerDuplicates[1]!} pending error="Os dois cadastros têm conta." />)
    const dialog = screen.getByRole("alertdialog")
    expect(within(dialog).getByRole("button", { name: "Juntando…" })).toBeDisabled()
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled()
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Os dois cadastros têm conta.")
  })

  it("speaks English with the English messages", () => {
    render(<CustomerDuplicates {...props} messages={en} />)

    expect(screen.getByRole("region", { name: "Possible duplicates" })).toHaveTextContent("Same phone")
    expect(screen.getByRole("button", { name: "Merge with Bia (WhatsApp)" })).toBeInTheDocument()
  })

  it("has no accessibility violations, listed and asking", async () => {
    const { container, rerender } = render(<CustomerDuplicates {...props} />)
    await expectNoA11yViolations(container)

    rerender(<CustomerDuplicates {...props} asking={customerDuplicates[0]!} />)
    await expectNoA11yViolations(document.body)
  })
})
