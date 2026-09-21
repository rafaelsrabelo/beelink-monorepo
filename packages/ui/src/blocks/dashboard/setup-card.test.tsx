// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SetupCard } from "./setup-card"

function renderCard(overrides: Partial<Parameters<typeof SetupCard>[0]> = {}) {
  return render(
    <ul>
      <SetupCard
        title="Cadastre o primeiro produto"
        description="Ele aparece na vitrine na hora."
        actionLabel="Cadastrar"
        href="/admin/lessari/products"
        {...overrides}
      />
    </ul>,
  )
}

describe("SetupCard", () => {
  /**
   * A finished card is marked, never removed: a list that empties as it is worked through looks
   * broken on the last step, and "the colours" is a thing changed again in a month.
   */
  it("keeps the way in once the thing is done", () => {
    renderCard({ done: true })

    expect(screen.getByRole("link", { name: /Cadastrar/ })).toHaveAttribute(
      "href",
      "/admin/lessari/products",
    )
  })

  /** A green tick on its own announces as nothing at all. */
  it("puts a word beside the tick", () => {
    renderCard({ done: true })

    expect(screen.getByText("Feito")).toBeInTheDocument()
  })

  it("says nothing about being done when it is not", () => {
    renderCard()

    expect(screen.queryByText("Feito")).not.toBeInTheDocument()
  })

  /** The shop's own window is not the panel: it opens where a customer would see it. */
  it("opens an outside address in its own tab", () => {
    renderCard({ external: true, href: "https://loja.exemplo/lessari" })

    const link = screen.getByRole("link", { name: /Cadastrar/ })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCard({ done: true })

    await expectNoA11yViolations(container)
  })
})
