// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SectionForm, EMPTY_BANNER, type SectionFormValues } from "./section-form"

const categories = [{ slug: "blusas", name: "Blusas" }]
const products = [{ slug: "whey", name: "Whey 900g" }]

/** Live, because what this form is about is the destination field following the target. */
function Harness({ start = EMPTY_BANNER }: { start?: SectionFormValues }) {
  const [value, setValue] = useState(start)

  return (
    <SectionForm
      value={value}
      onChange={setValue}
      categories={categories}
      products={products}
      onSubmit={() => {}}
      onCancel={() => {}}
    />
  )
}

describe("SectionForm", () => {
  it("asks for a category while the banner points at one", () => {
    render(<Harness />)

    expect(screen.getByLabelText("Categoria")).toBeInTheDocument()
    expect(screen.queryByLabelText("Produto")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Endereço")).not.toBeInTheDocument()
  })

  it("swaps the destination field when the target changes", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByLabelText("Para onde leva"))
    await user.click(await screen.findByRole("option", { name: "Um endereço fora da loja" }))

    expect(screen.getByLabelText("Endereço")).toBeInTheDocument()
    expect(screen.queryByLabelText("Categoria")).not.toBeInTheDocument()
  })

  /**
   * The reason all three destinations are held at once. A shopkeeper who picks a category, changes
   * their mind and changes back should find their first choice still there.
   */
  it("keeps what was chosen for a target that is not showing", async () => {
    const user = userEvent.setup()
    render(<Harness start={{ ...EMPTY_BANNER, categorySlug: "blusas" }} />)

    await user.click(screen.getByLabelText("Para onde leva"))
    await user.click(await screen.findByRole("option", { name: "Um produto" }))
    await user.click(screen.getByLabelText("Para onde leva"))
    await user.click(await screen.findByRole("option", { name: "Uma categoria" }))

    expect(screen.getByLabelText("Categoria")).toHaveTextContent("Blusas")
  })

  it("reports the sentence the screen handed it, never an error code", () => {
    render(
      <SectionForm
        value={EMPTY_BANNER}
        onChange={() => {}}
        categories={categories}
        products={products}
        errors={{ title: { message: "Dê um título ao banner." } }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByText("Dê um título ao banner.")).toBeInTheDocument()
  })

  it("submits without reloading the page", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <SectionForm
        value={EMPTY_BANNER}
        onChange={() => {}}
        categories={categories}
        products={products}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Harness />)

    await expectNoA11yViolations(container)
  })
})
