// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AuthCard } from "./auth-card"

describe("AuthCard", () => {
  it("shows the title and the sentence under it", () => {
    render(
      <AuthCard title="Entrar" description="Use o e-mail e a senha da sua conta">
        <p>formulário</p>
      </AuthCard>,
    )

    expect(screen.getByText("Entrar")).toBeInTheDocument()
    expect(screen.getByText("Use o e-mail e a senha da sua conta")).toBeInTheDocument()
  })

  it("renders the screen's form inside the card", () => {
    render(
      <AuthCard title="Entrar" description="Use o e-mail e a senha da sua conta">
        <button type="submit">Entrar</button>
      </AuthCard>,
    )

    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument()
  })

  it("announces the server's answer, and says nothing when there is none", () => {
    const { rerender } = render(
      <AuthCard title="Entrar" description="Use o e-mail e a senha da sua conta">
        <p>formulário</p>
      </AuthCard>,
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    rerender(
      <AuthCard
        title="Entrar"
        description="Use o e-mail e a senha da sua conta"
        error="E-mail ou senha incorretos."
      >
        <p>formulário</p>
      </AuthCard>,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.")
  })

  it("keeps the footer out of the card, and out of the DOM when there is none", () => {
    const { rerender } = render(
      <AuthCard title="Entrar" description="Use o e-mail e a senha da sua conta">
        <p>formulário</p>
      </AuthCard>,
    )
    expect(screen.queryByRole("link", { name: "Criar conta" })).not.toBeInTheDocument()

    rerender(
      <AuthCard
        title="Entrar"
        description="Use o e-mail e a senha da sua conta"
        footer={<a href="/cadastro">Criar conta</a>}
      >
        <p>formulário</p>
      </AuthCard>,
    )

    const footerLink = screen.getByRole("link", { name: "Criar conta" })
    expect(footerLink.closest("[data-slot=card]")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AuthCard
        title="Entrar"
        description="Use o e-mail e a senha da sua conta"
        error="E-mail ou senha incorretos."
        footer={<a href="/cadastro">Criar conta</a>}
      >
        <button type="submit">Entrar</button>
      </AuthCard>,
    )

    await expectNoA11yViolations(container)
  })
})
