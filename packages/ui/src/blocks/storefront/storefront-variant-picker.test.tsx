// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontVariantPicker } from "./storefront-variant-picker"
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "./variant-choice-fixtures"

function renderPicker(onSelect = vi.fn()) {
  render(
    <StorefrontVariantPicker
      options={BLOUSE_OPTIONS}
      variants={BLOUSE_VARIANTS}
      selection={{ size: "P", colour: "areia" }}
      onSelect={onSelect}
    />,
  )
  return onSelect
}

describe("StorefrontVariantPicker", () => {
  it("names each option with the value chosen", () => {
    renderPicker()

    expect(screen.getByRole("group", { name: "Tamanho: P" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Cor: Areia" })).toBeInTheDocument()
  })

  it("disables a value no combination has, struck through, and says so", () => {
    renderPicker()

    const missing = screen.getByRole("button", { name: "GG, indisponível" })
    expect(missing).toBeDisabled()
    expect(missing).toHaveClass("line-through")
  })

  it("keeps a value choosable when a combination with it exists, even with other choices", async () => {
    const user = userEvent.setup()
    const onSelect = renderPicker()

    await user.click(screen.getByRole("button", { name: "G" }))

    expect(onSelect).toHaveBeenCalledWith("size", "G")
  })

  it("keeps a sold-out combination choosable, struck through and said out loud", async () => {
    const user = userEvent.setup()
    const onSelect = renderPicker()

    const medium = screen.getByRole("button", { name: "M, Esgotado · avise-me" })
    expect(medium).toBeEnabled()
    expect(within(medium).getByText("M")).toHaveClass("line-through")
    await user.click(medium)

    expect(onSelect).toHaveBeenCalledWith("size", "M")
  })

  it("draws a colour's swatch beside its name, and has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontVariantPicker options={BLOUSE_OPTIONS} variants={BLOUSE_VARIANTS} selection={{ size: "P", colour: "areia" }} onSelect={() => {}} />,
    )

    expect(screen.getByRole("button", { name: "Terracota" }).querySelector("span[aria-hidden]")).not.toBeNull()
    await expectNoA11yViolations(container)
  })

  it("draws sizes as pills and colours as cards, as 5b does", () => {
    renderPicker()

    expect(screen.getByRole("button", { name: "P" })).toHaveClass("shop-sm:min-w-[110px]")
    expect(screen.getByRole("button", { name: "Areia" })).toHaveClass("items-stretch")
  })

  it("puts a price on every value when prices are shown, even when they are the same", () => {
    render(
      <StorefrontVariantPicker options={BLOUSE_OPTIONS} variants={BLOUSE_VARIANTS} selection={{ size: "P", colour: "areia" }} onSelect={() => {}} locale="pt-BR" />,
    )

    expect(screen.getByRole("button", { name: /^P, R\$\s189,00$/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Areia, R\$\s189,00$/ })).toBeInTheDocument()
    // A value no combination has costs nothing it could be bought at.
    expect(screen.getByRole("button", { name: "GG, indisponível" })).not.toHaveTextContent("R$")
  })

  it("marks the value chosen in bold on the shop's wash, and names it in bold over the row", () => {
    renderPicker()

    const chosen = screen.getByRole("button", { name: "Areia" })
    expect(chosen).toHaveAttribute("aria-pressed", "true")
    expect(chosen).toHaveClass("border-2", "bg-shop-primary-tint")
    expect(screen.getByText("Areia", { selector: "strong" })).toBeInTheDocument()
  })

  it("says 'Esgotado · avise-me' on a sold-out value, where its price would be", () => {
    render(
      <StorefrontVariantPicker options={BLOUSE_OPTIONS} variants={BLOUSE_VARIANTS} selection={{ size: "P", colour: "areia" }} onSelect={() => {}} locale="pt-BR" />,
    )

    const medium = screen.getByRole("button", { name: "M, Esgotado · avise-me" })
    expect(medium).toHaveTextContent("Esgotado · avise-me")
    expect(medium).not.toHaveTextContent("189")
    expect(medium).toHaveClass("border-dashed")
  })

  it("keeps sizes as pills when a photo names a size together with a colour", () => {
    render(
      <StorefrontVariantPicker
        options={BLOUSE_OPTIONS}
        variants={BLOUSE_VARIANTS}
        selection={{ size: "P", colour: "areia" }}
        onSelect={() => {}}
        images={[{ url: "https://cdn/p-terracota.jpg", optionValueIds: ["P", "terracota"] }]}
      />,
    )

    const small = screen.getByRole("button", { name: "P" })
    expect(small).toHaveClass("shop-sm:min-w-[110px]")
    expect(small.querySelector("img")).toBeNull()
    expect(screen.getByRole("button", { name: "Terracota" }).querySelector("img")).toBeNull()
  })

  it("shows a value's own photo on its card", () => {
    render(
      <StorefrontVariantPicker
        options={BLOUSE_OPTIONS}
        variants={BLOUSE_VARIANTS}
        selection={{ size: "P", colour: "areia" }}
        onSelect={() => {}}
        images={[{ url: "https://cdn/terracota.jpg", optionValueIds: ["terracota"] }]}
      />,
    )

    expect(screen.getByRole("button", { name: "Terracota" }).querySelector("img")).toHaveAttribute("src", "https://cdn/terracota.jpg")
    expect(screen.getByRole("button", { name: "Areia" }).querySelector("img")).toBeNull()
  })
})
