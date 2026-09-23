// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BannerFields } from "./banner-fields"

describe("BannerFields", () => {
  it("says the shape in words and offers a first picture", () => {
    render(<BannerFields value={{ layout: "THIRDS", slides: [] }} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />)

    expect(screen.getByRole("combobox", { name: "Tamanho" })).toHaveTextContent("Um terço")
    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument()
  })

  it("hands a new picture back as a partial change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BannerFields value={{ layout: "FULL", slides: [] }} onChange={onChange} categories={[]} products={[]} newItemId={() => "new"} />)

    await user.click(screen.getByRole("button", { name: "Adicionar imagem" }))

    expect(onChange).toHaveBeenCalledWith({ slides: [expect.objectContaining({ id: "new", target: "NONE" })] })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BannerFields value={{ layout: "FULL", slides: [] }} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />,
    )

    await expectNoA11yViolations(container)
  })
})
