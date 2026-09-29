// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderStatus } from "./storefront-order-status"
import { StorefrontOrderTracking } from "./storefront-order-tracking"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("StorefrontOrderTracking", () => {
  it("says who brings it, copies the code, and leads to the carrier's site in a new tab", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<StorefrontOrderTracking by="Correios · SEDEX" code="AB123456789BR" href="https://rastreamento.correios.com.br/app/index.php" hrefLabel="Ver no site da transportadora" />)

    expect(screen.getByText("Correios · SEDEX")).toBeInTheDocument()
    const copy = screen.getByRole("button", { name: "Copiar" })
    expect(copy).toHaveAccessibleDescription("AB123456789BR")
    await user.click(copy)
    expect(writeText).toHaveBeenCalledWith("AB123456789BR")
    await waitFor(() => expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument())

    const link = screen.getByRole("link", { name: "Ver no site da transportadora" })
    expect(link).toHaveAttribute("href", "https://rastreamento.correios.com.br/app/index.php")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("draws no code and no link it was not given", () => {
    render(<StorefrontOrderTracking by="Entrega da própria loja" code={null} href={null} hrefLabel="Acompanhar a entrega" />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("sits beside the status's headline, and has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontOrderStatus
        headline="Saiu para entrega"
        detail="Chega entre qui., 24 e sex., 25 de set."
        tone="progress"
        steps={null}
        tracking={<StorefrontOrderTracking by="Correios · SEDEX" code="AB123456789BR" href="#" hrefLabel="Ver no site da transportadora" />}
      />,
    )
    expect(screen.getByText("Chega entre qui., 24 e sex., 25 de set.")).toBeInTheDocument()
    expect(screen.getByText("Correios · SEDEX")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
