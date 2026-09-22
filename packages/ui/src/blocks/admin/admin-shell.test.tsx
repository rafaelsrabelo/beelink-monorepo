// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminShell } from "./admin-shell"

describe("AdminShell", () => {
  it("puts the three parts on the page, in the order the frame owns", () => {
    render(
      <AdminShell
        header={<header>Cabeçalho</header>}
        sidebar={<aside aria-label="Navegação da loja">Barra</aside>}
      >
        <p>Conteúdo</p>
      </AdminShell>,
    )

    expect(screen.getByRole("banner")).toBeInTheDocument()
    expect(screen.getByRole("complementary", { name: "Navegação da loja" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("Conteúdo")
  })

  // The frame holds no state and knows nothing about either part — whether the rail is open lives
  // in the screen, because the header's button and the rail both need it and neither owns the other.
  it("renders whatever it was handed, without knowing what it is", () => {
    render(
      <AdminShell header={<div>qualquer coisa</div>} sidebar={<div>outra</div>}>
        <span>terceira</span>
      </AdminShell>,
    )

    expect(screen.getByText("qualquer coisa")).toBeInTheDocument()
    expect(screen.getByText("outra")).toBeInTheDocument()
    expect(screen.getByText("terceira")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AdminShell
        header={<header>Cabeçalho</header>}
        sidebar={<aside aria-label="Navegação da loja">Barra</aside>}
      >
        <p>Conteúdo</p>
      </AdminShell>,
    )

    await expectNoA11yViolations(container)
  })
})
