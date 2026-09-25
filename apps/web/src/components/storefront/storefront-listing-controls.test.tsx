/* eslint-disable @next/next/no-html-link-for-pages -- the island is exercised against the plain anchors the storefront blocks render */
// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { StorefrontListingControls } from "./storefront-listing-controls"

const push = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

beforeEach(() => {
  window.history.replaceState(null, "", "/loja/produtos?ordenar=menor-preco&pagina=2")
})

afterEach(() => {
  push.mockReset()
})

function renderControls() {
  return render(
    <StorefrontListingControls>
      <a href="/loja/produtos?ordenar=menor-preco&opcao=Sabor%3AUva" role="checkbox" aria-checked="false">
        Uva
      </a>
      <a href="/loja/produtos?ordenar=menor-preco&pagina=3">3</a>
      <a href="/loja/produto/whey">Whey</a>
      <form action="/loja/produtos" method="get">
        <input type="hidden" name="ordenar" value="menor-preco" />
        <input type="hidden" name="precoMin" value="" />
        <input name="precoMax" defaultValue="200" aria-label="Máx." />
        <button type="submit">Ir</button>
      </form>
    </StorefrontListingControls>,
  )
}

describe("StorefrontListingControls", () => {
  it("follows a narrowing of this shelf inside the page, keeping the scroll", () => {
    renderControls()

    fireEvent.click(screen.getByRole("checkbox", { name: "Uva" }))

    expect(push).toHaveBeenCalledWith("/loja/produtos?ordenar=menor-preco&opcao=Sabor%3AUva", { scroll: false })
  })

  it("scrolls to the top when only the page changes", () => {
    renderControls()

    fireEvent.click(screen.getByRole("link", { name: "3" }))

    expect(push).toHaveBeenCalledWith("/loja/produtos?ordenar=menor-preco&pagina=3", { scroll: true })
  })

  it("leaves a link out of the shelf to the browser, and a click with a modifier too", () => {
    renderControls()

    fireEvent.click(screen.getByRole("link", { name: "Whey" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Uva" }), { metaKey: true })

    expect(push).not.toHaveBeenCalled()
  })

  it("follows a GET form on this shelf, dropping the empty fields", () => {
    renderControls()

    fireEvent.submit(screen.getByRole("button", { name: "Ir" }).closest("form")!)

    expect(push).toHaveBeenCalledWith("/loja/produtos?ordenar=menor-preco&precoMax=200", { scroll: false })
  })

  it("answers Space on a link that wears the checkbox role", () => {
    renderControls()

    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Uva" }), { key: " " })

    expect(push).toHaveBeenCalledTimes(1)
  })
})
