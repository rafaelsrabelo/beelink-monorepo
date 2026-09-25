// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSort } from "./storefront-sort"

const options = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
]

function renderSort() {
  return render(
    <StorefrontSort
      action="/loja/produtos"
      name="ordenar"
      value="menor-preco"
      options={options}
      fields={[
        ["precoMin", "50"],
        ["opcao", "sabor:chocolate"],
        ["opcao", "peso:900g"],
      ]}
    />,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("StorefrontSort", () => {
  it("is a GET form on the listing's own address, labelled 'Ordenar por', on the current order", () => {
    const { container } = renderSort()

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("action", "/loja/produtos")
    expect(form).toHaveAttribute("method", "get")
    expect(screen.getByLabelText("Ordenar por")).toHaveValue("menor-preco")
    expect(screen.getByLabelText("Ordenar por")).toHaveAttribute("name", "ordenar")
  })

  it("carries every other filter through, repeated keys included, and never the page", () => {
    const { container } = renderSort()

    const hidden = [...container.querySelectorAll<HTMLInputElement>("input[type=hidden]")].map((input) => [input.name, input.value])
    expect(hidden).toEqual([
      ["precoMin", "50"],
      ["opcao", "sabor:chocolate"],
      ["opcao", "peso:900g"],
    ])
  })

  it("submits by itself when the order changes", () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {})
    renderSort()

    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "maior-preco" } })

    expect(submit).toHaveBeenCalledTimes(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSort()

    await expectNoA11yViolations(container)
  })
})
