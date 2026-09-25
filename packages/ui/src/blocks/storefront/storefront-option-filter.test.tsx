// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { sampleStoreColors } from "../store/store.fixtures"
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOptionFilter, drawsAsPills, type StorefrontFilterValue } from "./storefront-option-filter"

const value = (label: string, selected = false, colorHex: string | null = null): StorefrontFilterValue => ({
  value: label,
  label,
  href: `/loja/produtos?opcao=${encodeURIComponent(`X:${label}`)}`,
  count: 4,
  selected,
  colorHex,
})

// Swatches are the shop's data, so the test takes them from the sample palettes rather than spelling one.
const navy = sampleStoreColors.primary
const pink = sampleStoreColors.header

const flavours = ["Chocolate", "Baunilha", "Morango", "Cookies", "Limão", "Uva", "Coco"].map((label) => value(label))

describe("StorefrontOptionFilter", () => {
  it("draws short sizes and colours as pills, and names as a list", () => {
    expect(drawsAsPills(["P", "M", "G", "300 g"].map((label) => value(label)))).toBe(true)
    expect(drawsAsPills([value("Azul marinho", false, navy)])).toBe(true)
    expect(drawsAsPills(flavours)).toBe(false)
  })

  it("lists five and folds the rest under 'Ver mais', open when a folded one is chosen", () => {
    const { container, rerender } = render(<StorefrontOptionFilter title="Sabor" values={flavours} locale="pt-BR" />)

    expect(screen.getByRole("heading", { level: 3, name: "Sabor" })).toBeInTheDocument()
    expect(container.querySelector("details")).not.toHaveAttribute("open")
    expect(screen.getByText(/Ver mais/)).toBeInTheDocument()

    rerender(<StorefrontOptionFilter title="Sabor" values={[...flavours.slice(0, 6), value("Coco", true)]} locale="pt-BR" />)
    expect(container.querySelector("details")).toHaveAttribute("open")
  })

  it("keeps crawlers off every combination of filters", () => {
    render(<StorefrontOptionFilter title="Sabor" values={flavours} locale="pt-BR" />)

    for (const link of screen.getAllByRole("checkbox")) expect(link).toHaveAttribute("rel", "nofollow")
  })

  it("makes every pill a checkbox a reader can hear the state of", () => {
    render(<StorefrontOptionFilter title="Tamanho" values={[value("P"), value("M", true)]} locale="pt-BR" />)

    expect(screen.getByRole("checkbox", { name: "M" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("checkbox", { name: "P" })).toHaveAttribute("aria-checked", "false")
  })

  it("draws nothing for an option with no values", () => {
    const { container } = render(<StorefrontOptionFilter title="Cor" values={[]} locale="pt-BR" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations, as a list or as pills", async () => {
    const list = render(<StorefrontOptionFilter title="Sabor" values={flavours} locale="pt-BR" />)
    await expectNoA11yViolations(list.container)
    list.unmount()

    const pills = render(<StorefrontOptionFilter title="Cor" values={[value("Azul", true, navy), value("Rosa", false, pink)]} locale="pt-BR" />)
    await expectNoA11yViolations(pills.container)
  })
})
