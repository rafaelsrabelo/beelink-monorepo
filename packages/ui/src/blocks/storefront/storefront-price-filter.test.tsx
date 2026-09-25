// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontPriceFilter } from "./storefront-price-filter"

const ranges = [
  { label: "Até R$ 50", href: "/loja/produtos?precoMax=50", selected: false },
  { label: "R$ 100 a R$ 200", href: "/loja/produtos", selected: true },
]

function renderPrice(props: Partial<Parameters<typeof StorefrontPriceFilter>[0]> = {}) {
  return render(
    <StorefrontPriceFilter
      ranges={ranges}
      action="/loja/produtos"
      fields={[["ordenar", "menor-preco"]]}
      bounds={{ min: 20, max: 300 }}
      value={{ min: 100, max: 200 }}
      locale="pt-BR"
      {...props}
    />,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("StorefrontPriceFilter", () => {
  it("offers the quick ranges as links, the one in force bold", () => {
    renderPrice()

    expect(screen.getByRole("heading", { level: 3, name: "Preço" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Até R$ 50" })).toHaveAttribute("href", "/loja/produtos?precoMax=50")
    expect(screen.getByRole("link", { name: "R$ 100 a R$ 200" })).toHaveAttribute("aria-current", "true")
  })

  it("is a GET form on the shelf, carrying the other filters and what the address asks now", () => {
    const { container } = renderPrice()

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("action", "/loja/produtos")
    expect(form).toHaveAttribute("method", "get")
    expect(screen.getByLabelText("Mín.")).toHaveValue("100")
    expect(screen.getByLabelText("Máx.")).toHaveValue("200")
    expect(screen.getByLabelText("Mín.")).toHaveAttribute("name", "precoMin")
    expect(container.querySelector("input[type=hidden]")).toHaveAttribute("name", "ordenar")
  })

  // jsdom lays nothing out, so Base UI keeps the thumbs hidden until measured: ask for hidden ones.
  it("names each thumb for a reader, between the shelf's cheapest and dearest", () => {
    renderPrice()

    const [lowest, highest] = screen.getAllByRole("slider", { hidden: true })
    expect(lowest).toHaveAttribute("aria-label", "Preço mínimo")
    expect(highest).toHaveAttribute("aria-label", "Preço máximo")
    expect(lowest).toHaveAttribute("min", "20")
    expect(highest).toHaveAttribute("max", "300")
  })

  it("draws no slider when the shelf has one price", () => {
    renderPrice({ bounds: { min: 50, max: 50 } })

    expect(screen.queryByRole("slider", { hidden: true })).toBeNull()
  })

  it("submits what was typed", () => {
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault())
    const { container } = renderPrice({ value: {} })
    container.querySelector("form")!.addEventListener("submit", submit)

    fireEvent.change(screen.getByLabelText("Máx."), { target: { value: "100,50" } })
    fireEvent.click(screen.getByRole("button", { name: "Ir" }))

    expect(submit).toHaveBeenCalledTimes(1)
    expect(new FormData(container.querySelector("form")!).get("precoMax")).toBe("100,50")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderPrice()

    await expectNoA11yViolations(container)
  })
})
