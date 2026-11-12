// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateAcceptanceForm } from "./affiliate-acceptance-form"
import { acceptance, invitation } from "./affiliate-invite.fixtures"
import { AffiliateInviteDone } from "./affiliate-invite-done"
import { AffiliateInviteNotice } from "./affiliate-invite-notice"
import { AffiliateInviteSkeleton } from "./affiliate-invite-skeleton"
import { AffiliateInvitationSummary } from "./affiliate-invitation-summary"

const noop = () => {}
const available = { kind: "available", link: "beelink.com.br/lessari/joao" } as const

describe("the invite to sell (IMPULSEIA-104)", () => {
  it("says whom it is for, the commission, the products that pay their own, the terms and until when", async () => {
    const { container } = render(<AffiliateInvitationSummary invitation={invitation} />)

    expect(screen.getByText("Convite para joao@exemplo.com")).toBeInTheDocument()
    expect(screen.getByText("10% sobre o que o cliente pagar pelos produtos")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual(["Whey Concentrado25%", "Creatina0%"])
    expect(screen.getByText("Whey Concentrado")).toBeInTheDocument()
    expect(screen.getByText(/Não vale divulgar/)).toBeInTheDocument()
    expect(screen.getByText("O convite vale até 18/11/2026.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says so when the shop wrote no terms", () => {
    render(<AffiliateInvitationSummary invitation={{ ...invitation, termsText: null, products: [] }} />)

    expect(screen.getByText("A loja não escreveu termos próprios.")).toBeInTheDocument()
    expect(screen.queryByText("Produtos com percentual próprio")).toBeNull()
  })

  it("asks the name and a password when the account is made here, with bee-link's own terms under the button", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const { container } = render(<AffiliateAcceptanceForm signUp value={acceptance} onChange={onChange} onSubmit={onSubmit} slugHint={available} hasTerms />)

    await userEvent.type(screen.getByLabelText("Crie uma senha"), "x")
    expect(onChange).toHaveBeenLastCalledWith({ ...acceptance, password: "x" })
    await userEvent.click(screen.getByRole("checkbox", { name: "Li e aceito os termos da loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...acceptance, agreed: true })
    expect(screen.getByText("Disponível. Seu link fica beelink.com.br/lessari/joao")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    await userEvent.click(screen.getByRole("button", { name: "Criar conta e aceitar" }))
    expect(onSubmit).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("asks only the link, the Pix key and the agreement of someone signed in", () => {
    render(<AffiliateAcceptanceForm signUp={false} value={acceptance} onChange={noop} onSubmit={noop} slugHint={{ kind: "checking" }} hasTerms={false} />)

    expect(screen.queryByLabelText("Crie uma senha")).toBeNull()
    expect(screen.getByRole("checkbox", { name: "Aceito vender pela loja nesta condição" })).toBeInTheDocument()
    expect(screen.getByText("Verificando…")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aceitar convite" })).toBeInTheDocument()
  })

  it("says why a name does not serve, that the terms changed, and the API's refusal", () => {
    render(
      <AffiliateAcceptanceForm
        signUp={false}
        value={acceptance}
        onChange={noop}
        onSubmit={noop}
        slugHint={{ kind: "unavailable", message: "Esse nome já está em uso nesta loja. Escolha outro." }}
        hasTerms
        notice="A loja mudou os termos enquanto você lia. Leia de novo antes de aceitar."
        error="Sua conta já vende por esta loja."
      />,
    )

    expect(screen.getByLabelText("Seu nome no link")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Esse nome já está em uso nesta loja. Escolha outro.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("A loja mudou os termos")
    expect(screen.getByRole("alert")).toHaveTextContent("Sua conta já vende por esta loja.")
  })

  it("tells a state with nothing to fill in, and its way on", async () => {
    const { container } = render(<AffiliateInviteNotice title="Entre para aceitar" body="joao@exemplo.com já tem conta no bee-link." action={<a href="/login">Entrar e aceitar</a>} />)

    expect(screen.getByRole("heading", { name: "Entre para aceitar" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Entrar e aceitar" })).toHaveAttribute("href", "/login")
    await expectNoA11yViolations(container)
  })

  it("hands the link over to copy, and says it was copied", async () => {
    const onCopy = vi.fn()
    const { container, rerender } = render(<AffiliateInviteDone link="https://beelink.com.br/lessari/joao" onCopy={onCopy} />)

    expect(screen.getByText("https://beelink.com.br/lessari/joao")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copiar link" }))
    expect(onCopy).toHaveBeenCalled()
    rerender(<AffiliateInviteDone link="https://beelink.com.br/lessari/joao" onCopy={onCopy} copied />)
    expect(screen.getByRole("status")).toHaveTextContent("Link copiado.")
    await expectNoA11yViolations(container)
  })

  it("draws a skeleton out of a screen reader's way", () => {
    const { container } = render(<AffiliateInviteSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })
})
