// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreListSkeleton } from "./store-list-skeleton"

describe("StoreListSkeleton", () => {
  it("says it is loading in words, not with a spinning picture", () => {
    render(<StoreListSkeleton />)

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent("Carregando suas lojas")
  })

  it("holds the space of as many cards as the list is about to show", () => {
    const { container } = render(<StoreListSkeleton count={3} />)

    expect(container.querySelectorAll("[data-slot=card]")).toHaveLength(3)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StoreListSkeleton />)

    await expectNoA11yViolations(container)
  })
})
