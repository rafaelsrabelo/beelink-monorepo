// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// App
import { ReviewLink } from "./review-link"

const params = vi.hoisted(() => ({ current: new URLSearchParams() }))
vi.mock("next/navigation", () => ({ useSearchParams: () => params.current }))

describe("ReviewLink", () => {
  it("carries the combination chosen after the page was drawn", () => {
    params.current = new URLSearchParams("variant=v-2")
    render(<ReviewLink href="/loja/produtos/whey?variant=v-1&nota=4#avaliacoes">4 estrelas</ReviewLink>)

    expect(screen.getByRole("link", { name: "4 estrelas" })).toHaveAttribute("href", "/loja/produtos/whey?variant=v-2&nota=4#avaliacoes")
  })

  it("drops a combination no longer chosen", () => {
    params.current = new URLSearchParams()
    render(<ReviewLink href="/loja/produtos/whey?variant=v-1&pagina-avaliacoes=2#avaliacoes">2</ReviewLink>)

    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("href", "/loja/produtos/whey?pagina-avaliacoes=2#avaliacoes")
  })
})
