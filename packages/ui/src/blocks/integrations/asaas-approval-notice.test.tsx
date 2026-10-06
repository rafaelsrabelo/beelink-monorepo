// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AsaasApprovalNotice, type AsaasApprovalNoticeProps } from "./asaas-approval-notice"

function show(props: Partial<AsaasApprovalNoticeProps> = {}) {
  const onRecheck = vi.fn()
  return { ...render(<AsaasApprovalNotice approval="AWAITING_APPROVAL" onRecheck={onRecheck} {...props} />), onRecheck }
}

describe("AsaasApprovalNotice (BEELINK-278)", () => {
  it("says the account is under review, that paying on the site is off until Asaas approves it, and that the shop sells as before", async () => {
    const { container } = show()

    expect(screen.getByRole("region", { name: "A sua conta no Asaas está em análise" })).toBeInTheDocument()
    expect(screen.getByText(/é só aguardar a aprovação/)).toBeInTheDocument()
    expect(screen.getByText(/o pagamento pelo site \(Pix e cartão\) fica desligado/)).toBeInTheDocument()
    expect(screen.getByText(/A loja continua vendendo como antes: o pagamento é combinado direto com o cliente/)).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("tells a registration left incomplete and one rejected apart from one under review, each with what to do", () => {
    const { rerender, onRecheck } = show({ approval: "PENDING" })
    expect(screen.getByRole("heading", { name: "Falta completar o cadastro da sua conta no Asaas" })).toBeInTheDocument()
    expect(screen.getByText(/complete o cadastro e aguarde a aprovação/)).toBeInTheDocument()

    rerender(<AsaasApprovalNotice approval="REJECTED" onRecheck={onRecheck} />)
    expect(screen.getByRole("heading", { name: "O Asaas recusou o cadastro da sua conta" })).toBeInTheDocument()
    expect(screen.getByText(/ver o motivo e corrigir o cadastro, ou fale com o suporte do Asaas/)).toBeInTheDocument()
    // Whichever the standing, what it means for the shop is the same.
    expect(screen.getByText(/A loja continua vendendo como antes/)).toBeInTheDocument()
  })

  it("asks Asaas again, held while it answers, and says when it was last asked", async () => {
    const { rerender, onRecheck } = show({ checkedAt: "06/10/2026, 18:40" })
    expect(screen.getByText("Última verificação: 06/10/2026, 18:40")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Verificar de novo" }))
    expect(onRecheck).toHaveBeenCalledOnce()

    rerender(<AsaasApprovalNotice approval="AWAITING_APPROVAL" onRecheck={onRecheck} rechecking />)
    expect(screen.getByRole("button", { name: "Verificando…" })).toBeDisabled()
  })

  it("says that nothing changed, or why the asking did not go through — never both, and neither while asking", () => {
    const { rerender, onRecheck } = show({ unchanged: true })
    expect(screen.getByRole("status")).toHaveTextContent("O Asaas ainda não aprovou a conta.")
    expect(screen.queryByRole("alert")).toBeNull()

    rerender(<AsaasApprovalNotice approval="AWAITING_APPROVAL" onRecheck={onRecheck} unchanged error="O Asaas não respondeu. Tente de novo em instantes." />)
    expect(screen.getByRole("alert")).toHaveTextContent("O Asaas não respondeu.")
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    rerender(<AsaasApprovalNotice approval="AWAITING_APPROVAL" onRecheck={onRecheck} unchanged rechecking error="O Asaas não respondeu." />)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("reads in another language when handed one", () => {
    show({ approval: "REJECTED", messages: en })

    expect(screen.getByRole("heading", { name: "Asaas rejected your account's registration" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument()
  })
})
