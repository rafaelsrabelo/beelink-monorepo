// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BannerFields } from "./banner-fields"

describe("BannerFields", () => {
  /**
   * The width is not asked here any more. It is every block's, chosen on the block's card, and the
   * "Tamanho" this sheet used to hold wrote the same column behind the draft's back.
   */
  it("asks for the format and the pictures, and not for a width", () => {
    render(<BannerFields value={{ display: "CAROUSEL", slides: [] }} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />)

    expect(screen.getByRole("group", { name: "Formato" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Tamanho|Largura/ })).not.toBeInTheDocument()
  })

  it("hands a new picture back as a partial change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BannerFields value={{ display: "CAROUSEL", slides: [] }} onChange={onChange} categories={[]} products={[]} newItemId={() => "new"} />)

    await user.click(screen.getByRole("button", { name: "Adicionar imagem" }))

    expect(onChange).toHaveBeenCalledWith({ slides: [expect.objectContaining({ id: "new", target: "NONE" })] })
  })

  /**
   * The choice the slide count used to make without asking. It is asked here, marked as it stands,
   * and handed back as a partial change like every other field of the sheet.
   */
  it("asks whether the pictures take turns or share the space, and reports the answer", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BannerFields value={{ display: "CAROUSEL", slides: [] }} onChange={onChange} categories={[]} products={[]} newItemId={() => "new"} />)

    expect(screen.getByRole("button", { name: /Carrossel/, pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Grade/ }))

    expect(onChange).toHaveBeenCalledWith({ display: "GRID" })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BannerFields value={{ display: "CAROUSEL", slides: [] }} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />,
    )

    await expectNoA11yViolations(container)
  })
})
