// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutStep } from "./storefront-checkout-step"

describe("StorefrontCheckoutStep", () => {
  it("holds its fields while open, numbered among the steps", () => {
    render(
      <StorefrontCheckoutStep step={2} total={3} title="Entrega" state="open">
        <p>os campos</p>
      </StorefrontCheckoutStep>,
    )

    expect(screen.getByRole("region", { name: "Entrega" })).toBeInTheDocument()
    expect(screen.getByText("2 de 3")).toBeInTheDocument()
    expect(screen.getByText("os campos")).toBeInTheDocument()
  })

  it("is a line with the way back once done, and says it is done to a screen reader", () => {
    render(
      <StorefrontCheckoutStep step={1} total={3} title="Seus dados" state="done" summary={<p>Bia · 11988887777</p>} edit={<a href="/conta">Alterar</a>}>
        <p>os campos</p>
      </StorefrontCheckoutStep>,
    )

    expect(screen.getByRole("heading", { name: /^Seus dados\s*— concluída$/ })).toBeInTheDocument()
    expect(screen.getByText("Bia · 11988887777")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Alterar" })).toHaveAttribute("href", "/conta")
    expect(screen.queryByText("os campos")).toBeNull()
  })

  it("holds nothing while locked, and says what comes first", () => {
    render(
      <StorefrontCheckoutStep step={3} total={3} title="Pagamento" state="locked" hint="Escolha como receber para continuar.">
        <p>os campos</p>
      </StorefrontCheckoutStep>,
    )

    expect(screen.getByText("Escolha como receber para continuar.")).toBeInTheDocument()
    expect(screen.queryByText("os campos")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCheckoutStep step={1} total={3} title="Seus dados" state="done" summary={<p>Bia</p>} edit={<a href="/conta">Alterar</a>} />)
    await expectNoA11yViolations(container)
  })
})
