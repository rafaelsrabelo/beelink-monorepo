// React
import { useState } from "react"

// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Lib
import { EMPTY_VARIATIONS, type VariationsValue } from "../../lib/variations"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductVariationsFields } from "./product-variations-fields"
import { BASE_ROW, BLOUSE, WHEY, WHEY_PHOTOS } from "./variation-fixtures"

let latest: VariationsValue = EMPTY_VARIATIONS

function Controlled({ initial, trackStock = true }: { initial: VariationsValue; trackStock?: boolean }) {
  const [value, setValue] = useState(initial)
  latest = value
  return (
    <ProductVariationsFields
      value={value}
      onChange={(next) => {
        latest = next
        setValue(next)
      }}
      base={BASE_ROW}
      trackStock={trackStock}
    />
  )
}

describe("ProductVariationsFields", () => {
  it("says the product has no variations until an option has a value", () => {
    render(<Controlled initial={EMPTY_VARIATIONS} />)

    expect(screen.getByText(/Sem variações/)).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("adds an option from a preset and its values with Enter, the first one keeping the product's price", async () => {
    const user = userEvent.setup()
    render(<Controlled initial={EMPTY_VARIATIONS} />)

    await user.click(screen.getByRole("button", { name: "Tamanho" }))
    const field = screen.getByRole("textbox", { name: "Novo valor de Tamanho" })
    await user.type(field, "P{Enter}")
    await user.type(field, "M{Enter}")

    expect(screen.getByRole("button", { name: "Tamanho" })).toBeDisabled()
    const table = screen.getByRole("table")
    expect(within(table).getByRole("textbox", { name: "Preço de P" })).toHaveValue("189,00")
    expect(within(table).getByRole("textbox", { name: "Código de P" })).toHaveValue("BLS")
    // A new combination borrows the price, never the code.
    expect(within(table).getByRole("textbox", { name: "Código de M" })).toHaveValue("")
  })

  it("refuses a value the option already has", async () => {
    const user = userEvent.setup()
    render(<Controlled initial={BLOUSE} />)

    await user.type(screen.getByRole("textbox", { name: "Novo valor de Tamanho" }), " p {Enter}")

    expect(screen.getByText("Este valor já existe nesta opção.")).toBeInTheDocument()
    expect(latest.options[0]?.values).toHaveLength(4)
  })

  it("edits a row in place, and switches a combination off", async () => {
    const user = userEvent.setup()
    render(<Controlled initial={BLOUSE} />)

    const price = screen.getByRole("textbox", { name: "Preço de M · Areia" })
    await user.clear(price)
    await user.type(price, "179,90")
    await user.click(screen.getByRole("switch", { name: "Vendo P · Preto" }))

    expect(latest.rows["M|areia"]?.price).toBe("179,90")
    expect(latest.rows["P|preto"]?.isActive).toBe(false)
  })

  it("gives the selected rows one price at once", async () => {
    const user = userEvent.setup()
    render(<Controlled initial={BLOUSE} />)

    await user.click(screen.getByRole("checkbox", { name: "Selecionar P · Areia" }))
    await user.click(screen.getByRole("checkbox", { name: "Selecionar M · Areia" }))
    expect(screen.getByText(/2 selecionadas/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Mesmo preço para todas" }))

    const dialog = await screen.findByRole("dialog", { name: "Mesmo preço para as 2 selecionadas" })
    await user.type(within(dialog).getByRole("textbox", { name: "Preço" }), "99,90")
    await user.click(within(dialog).getByRole("button", { name: "Aplicar" }))

    expect(latest.rows["P|areia"]?.price).toBe("99,90")
    expect(latest.rows["M|areia"]?.price).toBe("99,90")
    expect(latest.rows["P|terracota"]?.price).toBe("189,00")
    // A row nobody typed into keeps its own price, not the one just given to its neighbour.
    expect(latest.rows["M|preto"]?.price).toBe("189,00")
  })

  it("asks before removing an option, and says how many combinations remain", async () => {
    const user = userEvent.setup()
    render(<Controlled initial={BLOUSE} />)

    await user.click(screen.getByRole("button", { name: "Remover opção Cor" }))
    const question = await screen.findByRole("alertdialog")
    expect(within(question).getByText(/As 12 combinações passam a ser 4/)).toBeInTheDocument()

    await user.click(within(question).getByRole("button", { name: "Cancelar" }))
    expect(latest.options).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: "Remover opção Cor" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remover opção" }))
    expect(latest.options.map((option) => option.name)).toEqual(["Tamanho"])
    // The trash button is gone; focus lands in the section rather than on the page's body.
    expect(document.activeElement).not.toBe(document.body)
    // P keeps the row of its first colour.
    expect(latest.rows.P?.sku).toBe("BLS-P-ARE")
  })

  it("leaves the stock alone while the product is not counted", () => {
    render(<Controlled initial={BLOUSE} trackStock={false} />)

    expect(screen.getByRole("textbox", { name: "Estoque de P · Areia" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Definir estoque" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Controlled initial={BLOUSE} />)

    await expectNoA11yViolations(container)
  })

  it("shows beside each combination the photo the shop window opens it on", () => {
    render(<ProductVariationsFields value={WHEY} onChange={() => {}} base={BASE_ROW} trackStock={false} photos={WHEY_PHOTOS} />)

    const photoOf = (label: string) => within(screen.getByRole("row", { name: new RegExp(label) })).getByRole("img").getAttribute("alt")
    // The 900 g Morango has a photo of its own; the 750 g one, the Morango tub's; Chocolate, the general one.
    expect(photoOf("900g · Morango")).toBe("Foto 3")
    expect(photoOf("750g · Morango")).toBe("Foto 2")
    expect(photoOf("900g · Chocolate")).toBe("Foto 1")
  })
})
