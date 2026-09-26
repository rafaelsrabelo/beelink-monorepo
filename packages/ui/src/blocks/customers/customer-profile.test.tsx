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
import { CustomerProfile, type CustomerProfileProps } from "./customer-profile"
import { customerRecord } from "./customers.fixtures"

const props: CustomerProfileProps = {
  customer: { ...customerRecord, email: "caio@exemplo.com", emailVerified: true },
  addressLine: "Rua Barão de Jaguara, 1000, apto 12 — Centro — Campinas/SP — CEP 13015-904",
  editing: false,
  onEdit: () => {},
  onCancel: () => {},
  onSave: () => {},
}

/** The card as the screen drives it: the form opens, a save closes it and says so. */
function Driven({ onSave }: { onSave: CustomerProfileProps["onSave"] }) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <CustomerProfile
      {...props}
      editing={editing}
      saved={saved}
      onEdit={() => setEditing(true)}
      onCancel={() => setEditing(false)}
      onSave={(draft) => {
        onSave(draft)
        setEditing(false)
        setSaved(true)
      }}
    />
  )
}

function fact(label: string) {
  return within(screen.getByRole("region", { name: "Dados" })).getByText(label).nextElementSibling
}

describe("CustomerProfile", () => {
  it("shows the name, the e-mail and that it was confirmed, the phone and the address", () => {
    render(<CustomerProfile {...props} />)

    expect(fact("Nome")).toHaveTextContent("Caio Lima")
    expect(fact("E-mail")).toHaveTextContent("caio@exemplo.com · confirmado")
    expect(fact("Celular")).toHaveTextContent("5511955554444")
    expect(fact("Endereço")).toHaveTextContent("Rua Barão de Jaguara, 1000, apto 12 — Centro — Campinas/SP — CEP 13015-904")
  })

  it("says an e-mail was never confirmed, and what is missing on a customer the shop registered", () => {
    const { rerender } = render(<CustomerProfile {...props} customer={{ ...props.customer, emailVerified: false }} />)
    expect(fact("E-mail")).toHaveTextContent("caio@exemplo.com · não confirmado")

    rerender(<CustomerProfile {...props} customer={{ ...customerRecord, email: null, phone: null }} addressLine={null} />)
    expect(fact("E-mail")).toHaveTextContent("Sem e-mail: cadastrado pela loja, sem conta.")
    expect(fact("Celular")).toHaveTextContent("Sem celular")
    expect(fact("Endereço")).toHaveTextContent("Sem endereço cadastrado")
  })

  it("opens the form in the card with the focus on the name, and a save closes it, says so and returns the focus", async () => {
    const onSave = vi.fn()
    render(<Driven onSave={onSave} />)

    await userEvent.click(screen.getByRole("button", { name: "Editar dados" }))
    expect(screen.getByLabelText("Nome")).toHaveFocus()

    await userEvent.type(screen.getByLabelText("Nome"), " Souza")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Caio Lima Souza" }))
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Dados salvos.")
    expect(screen.getByRole("button", { name: "Editar dados" })).toHaveFocus()
  })

  it("keeps the form open under a refused phone, the refusal at the field", () => {
    render(<CustomerProfile {...props} editing phoneError="Esse celular já está no cadastro de outro cliente desta loja." />)

    expect(screen.getByLabelText("Celular")).toHaveAccessibleDescription("Esse celular já está no cadastro de outro cliente desta loja.")
    expect(screen.getByRole("status")).toHaveTextContent("")
  })

  it("speaks the panel's language", () => {
    render(<CustomerProfile {...props} messages={en} />)

    expect(screen.getByRole("region", { name: "Details" })).toHaveTextContent("caio@exemplo.com · confirmed")
    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument()
  })

  it("has no accessibility violations, reading or editing", async () => {
    const { container, rerender } = render(<CustomerProfile {...props} />)
    await expectNoA11yViolations(container)

    rerender(<CustomerProfile {...props} editing />)
    await expectNoA11yViolations(container)
  })
})
