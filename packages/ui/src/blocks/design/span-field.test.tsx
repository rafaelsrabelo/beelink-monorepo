// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SpanField } from "./span-field"

describe("SpanField", () => {
  it("names the group by whose width it is, and each slice by its name", () => {
    render(<SpanField value="THIRD" onChange={vi.fn()} name="Frete grátis" />)

    const group = screen.getByRole("group", { name: "Largura do bloco: Frete grátis" })
    expect(within(group).getByRole("button", { name: "Um terço", pressed: true })).toBeInTheDocument()
    expect(within(group).getAllByRole("button")).toHaveLength(4)
  })

  it("writes the chosen slice out, and the band's width beside it in words of its own", () => {
    const { container } = render(<SpanField value="TWO_THIRDS" onChange={vi.fn()} name="x" bandWidth="CONTAINED" />)

    expect(container).toHaveTextContent("Dois terços · Largura da faixa: Dentro da margem")
  })

  it("reports the slice chosen", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpanField value="FULL" onChange={onChange} name="x" />)

    await user.click(screen.getByRole("button", { name: "Metade" }))

    expect(onChange).toHaveBeenCalledWith("HALF")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<SpanField value="HALF" onChange={vi.fn()} name="x" bandWidth="FULL" />)

    await expectNoA11yViolations(container)
  })
})
