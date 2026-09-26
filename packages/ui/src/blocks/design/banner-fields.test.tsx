// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BannerFields } from "./banner-fields"

describe("BannerFields", () => {
  /**
   * Neither the width nor the format is asked here: both are how the banner sits, in the Layout tab
   * and the draft. A second control for either wrote the same column behind the draft's back.
   */
  it("asks for the pictures, and not for a width or a format", () => {
    render(<BannerFields value={{ slides: [] }} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />)

    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Formato" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Tamanho|Largura/ })).not.toBeInTheDocument()
  })

  it("hands a new picture back as a partial change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BannerFields value={{ slides: [] }} onChange={onChange} categories={[]} products={[]} newItemId={() => "new"} />)

    await user.click(screen.getByRole("button", { name: "Adicionar imagem" }))

    expect(onChange).toHaveBeenCalledWith({ slides: [expect.objectContaining({ id: "new", target: "NONE" })] })
  })

  // The format is chosen in the Layout tab; the hint beside the pictures still says what it means.
  it("says what one more picture does in the format the Layout tab holds", () => {
    const one = { slides: [{ id: "s", imageUrl: "/s.jpg", title: "", subtitle: "", target: "NONE" as const, categoryId: "", productId: "", externalUrl: "" }] }
    const { rerender } = render(<BannerFields value={one} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />)
    expect(screen.getByText(/vira um carrossel/)).toBeInTheDocument()

    rerender(<BannerFields value={one} display="GRID" onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />)
    expect(screen.getByText(/aparecem lado a lado/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BannerFields value={{ slides: [] }} onChange={vi.fn()} categories={[]} products={[]} newItemId={() => "new"} />,
    )

    await expectNoA11yViolations(container)
  })
})
