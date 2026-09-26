// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LANDING_TEMPLATES } from "./landing-template-picker"
import { addressOf, emptyNewLanding, NewLandingDialog, type NewLandingDialogProps, type NewLandingValue } from "./new-landing-dialog"

const products = [
  { id: "p1", name: "Whey Baunilha" },
  { id: "p2", name: "Creatina" },
]

function Harness({ initial, onValue, ...props }: Partial<NewLandingDialogProps> & { initial?: NewLandingValue; onValue?: (value: NewLandingValue) => void }) {
  const [value, setValue] = useState(initial ?? emptyNewLanding("lancamento"))
  return (
    <NewLandingDialog
      open
      onOpenChange={vi.fn()}
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
      addressPrefix="/mutante/lp/"
      addressState="idle"
      templates={LANDING_TEMPLATES}
      products={products}
      productsState="ready"
      onSubmit={vi.fn()}
      pending={false}
      {...props}
    />
  )
}

describe("NewLandingDialog", () => {
  it("follows the name with the address until the address is typed", async () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)

    await userEvent.type(screen.getByLabelText("Nome da página"), "Lançamento Whey")
    expect(screen.getByLabelText("Endereço")).toHaveValue("lancamento-whey")

    await userEvent.clear(screen.getByLabelText("Endereço"))
    await userEvent.type(screen.getByLabelText("Endereço"), "whey")
    await userEvent.type(screen.getByLabelText("Nome da página"), "!")
    expect(screen.getByLabelText("Endereço")).toHaveValue("whey")
  })

  it("asks for the product a template is built around, and not for a blank page", async () => {
    const onSubmit = vi.fn()
    render(<Harness initial={{ ...emptyNewLanding("lancamento"), title: "Lançamento" }} onSubmit={onSubmit} />)

    const create = screen.getByRole("button", { name: "Criar página" })
    expect(create).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Whey Baunilha" }))
    expect(create).toBeEnabled()

    await userEvent.click(screen.getByRole("radio", { name: /Em branco/ }))
    expect(screen.queryByLabelText("Produto principal")).not.toBeInTheDocument()
    await userEvent.click(create)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("will not create on an address that is taken, and says why the API refused", () => {
    render(
      <Harness
        initial={{ ...emptyNewLanding("em-branco"), title: "Ofertas" }}
        addressState="taken"
        error="Já existe uma página com esse endereço. Escolha outro."
      />,
    )

    expect(screen.getByRole("button", { name: "Criar página" })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("Já existe uma página com esse endereço")
  })

  it("derives the address the API would", () => {
    expect(addressOf({ title: "Promoção de Verão!", slug: null })).toBe("promocao-de-verao")
    expect(addressOf({ title: "Promoção", slug: "verao" })).toBe("verao")
  })

  it("has no accessibility violations", async () => {
    render(<Harness />)

    await expectNoA11yViolations(await screen.findByRole("dialog"))
  })
})
