// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { EmptyStateNotice } from "./empty-state-notice"

describe("EmptyStateNotice", () => {
  it("says what is missing and why", () => {
    render(<EmptyStateNotice title="Nenhuma categoria aparece na loja" body="4 categorias ainda não têm produto." />)

    expect(screen.getByText("Nenhuma categoria aparece na loja")).toBeInTheDocument()
    expect(screen.getByText("4 categorias ainda não têm produto.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  // The arrangement is a draft until published; leaving the page would leave it behind.
  it("leads to the fix in another tab, and says so", () => {
    render(
      <EmptyStateNotice
        title="Nenhuma categoria aparece na loja"
        body="4 categorias ainda não têm produto."
        action={{ label: "Vincular produtos às categorias", href: "/admin/loja/products" }}
      />,
    )

    const link = screen.getByRole("link", { name: /Vincular produtos às categorias \(abre em outra aba\)/ })
    expect(link).toHaveAttribute("href", "/admin/loja/products")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <EmptyStateNotice title="A loja ainda não tem produtos" body="Uma vitrine só aparece com produtos." action={{ label: "Cadastrar", href: "/x" }} />,
    )

    await expectNoA11yViolations(container)
  })
})
