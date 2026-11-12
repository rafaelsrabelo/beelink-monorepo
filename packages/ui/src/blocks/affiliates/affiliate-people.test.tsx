// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateConfirmDialog } from "./affiliate-confirm-dialog"
import { AffiliateListSection } from "./affiliate-list-section"
import { invitedRecord, people, record, recordValue, recordValueMissing, tableOptions } from "./affiliate-people.fixtures"
import { AffiliateRecordActions } from "./affiliate-record-actions"
import { AffiliateRecordDetails } from "./affiliate-record-details"
import { AffiliateRecordForm } from "./affiliate-record-form"
import { AffiliateRows } from "./affiliate-rows"
import { AffiliateStatusTabs } from "./affiliate-status-tabs"

const noop = () => {}

describe("the affiliates list (IMPULSEIA-104)", () => {
  it("lists who, where they stand, on which table and since when, each name leading to the record", async () => {
    const onInvite = vi.fn()
    const { container } = render(
      <AffiliateListSection onInvite={onInvite}>
        <AffiliateStatusTabs value={null} onValueChange={noop}>
          <AffiliateRows affiliates={people} hrefOf={(id) => `/r/${id}`} />
        </AffiliateStatusTabs>
      </AffiliateListSection>,
    )

    expect(screen.getByRole("link", { name: "João Silva" })).toHaveAttribute("href", "/r/a-joao")
    const rows = screen.getAllByRole("listitem")
    expect(within(rows[1]!).getByText("Convidado")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Convidado em 11 de nov.")).toBeInTheDocument()
    expect(within(rows[0]!).getByText("Influencers")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Convidar afiliado" }))
    expect(onInvite).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("filters by standing, null being every one", async () => {
    const onValueChange = vi.fn()
    render(
      <AffiliateStatusTabs value="ACTIVE" onValueChange={onValueChange}>
        <AffiliateRows affiliates={[]} hrefOf={(id) => id} filtered />
      </AffiliateStatusTabs>,
    )

    expect(screen.getByRole("tab", { name: "Ativos" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Nenhum afiliado nesta situação.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "Pausados" }))
    expect(onValueChange).toHaveBeenLastCalledWith("PAUSED")
    await userEvent.click(screen.getByRole("tab", { name: "Todos" }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("invites a shop that has none yet", () => {
    render(<AffiliateRows affiliates={[]} hrefOf={(id) => id} />)

    expect(screen.getByText("Nenhum afiliado ainda")).toBeInTheDocument()
  })
})

describe("an affiliate's record", () => {
  it("says who, the link, the Pix key, the terms accepted and what happened when", async () => {
    const { container } = render(<AffiliateRecordDetails affiliate={record} />)

    expect(screen.getByRole("heading", { name: "João Silva" })).toBeInTheDocument()
    expect(screen.getByText("https://beelink.com.br/lessari/joao")).toBeInTheDocument()
    expect(screen.getByText("Versão 2, aceita em 12 de nov.")).toBeInTheDocument()
    expect(screen.getByText("Aceitou em 12 de nov.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says, while invited, that the link comes with the acceptance, and until when the invite works", () => {
    render(<AffiliateRecordDetails affiliate={invitedRecord} />)

    expect(screen.getByText("O afiliado escolhe o nome do link ao aceitar o convite.")).toBeInTheDocument()
    expect(screen.getByText("Convite enviado em 11 de nov. O link vale até 18 de nov.")).toBeInTheDocument()
    // Phone, CPF and Pix key: an affiliate invited before the phone and the CPF were asked.
    expect(screen.getAllByText("Não informado")).toHaveLength(3)
  })

  it("edits the phone and the CPF — the CPF masked — and asks to complete them for one invited before", async () => {
    const onChange = vi.fn()
    const { container } = render(<AffiliateRecordForm value={recordValueMissing} onChange={onChange} onSubmit={noop} tables={tableOptions} identityMissing issues={{ cpf: "Informe um CPF válido." }} />)

    expect(screen.getByText("Convidado antes de o telefone e o CPF serem pedidos. Complete aqui.")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("CPF"), "5")
    expect(onChange).toHaveBeenLastCalledWith({ ...recordValueMissing, cpf: "5" })
    await userEvent.type(screen.getByLabelText("Telefone"), "8")
    expect(onChange).toHaveBeenLastCalledWith({ ...recordValueMissing, phone: "8" })
    expect(screen.getByText("Informe um CPF válido.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("edits the note, saves, and says it saved once nothing differs", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const { container, rerender } = render(<AffiliateRecordForm value={recordValue} onChange={onChange} onSubmit={onSubmit} tables={tableOptions} />)

    await userEvent.type(screen.getByLabelText("Anotação"), "!")
    expect(onChange).toHaveBeenLastCalledWith({ ...recordValue, note: `${recordValue.note}!` })
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalled()
    rerender(<AffiliateRecordForm value={recordValue} onChange={onChange} onSubmit={onSubmit} tables={tableOptions} pristine saved />)
    expect(screen.getByRole("status")).toHaveTextContent("Salvo.")
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
    await expectNoA11yViolations(container)
  })

  it.each([
    ["INVITED", ["Reenviar convite", "Cancelar convite"]],
    ["ACTIVE", ["Pausar", "Encerrar"]],
    ["PAUSED", ["Retomar", "Encerrar"]],
  ] as const)("offers, to %s, only what that standing allows", async (status, labels) => {
    const onAction = vi.fn()
    const { container } = render(<AffiliateRecordActions status={status} onAction={onAction} />)

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(labels)
    await userEvent.click(screen.getByRole("button", { name: labels[0] }))
    expect(onAction).toHaveBeenCalledWith({ INVITED: "resend", ACTIVE: "pause", PAUSED: "resume" }[status])
    await expectNoA11yViolations(container)
  })

  it("offers nothing to an ended affiliate, and waits while an action is in flight", () => {
    const { rerender } = render(<AffiliateRecordActions status="ENDED" onAction={noop} />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText(/Encerrado de vez/)).toBeInTheDocument()

    rerender(<AffiliateRecordActions status="ACTIVE" onAction={noop} busy="pause" error="A situação do afiliado mudou. Recarregue a página." />)
    expect(screen.getAllByRole("button").every((button) => button.hasAttribute("disabled"))).toBe(true)
    expect(screen.getByRole("alert")).toHaveTextContent("A situação do afiliado mudou.")
  })

  it("asks before what does not come back, keeping by default", async () => {
    const onConfirm = vi.fn()
    render(
      <AffiliateConfirmDialog
        text={{ title: "Encerrar o vínculo?", question: "João Silva deixa de vender pela loja.", detail: "É definitivo.", confirm: "Encerrar", confirming: "Encerrando…" }}
        keepLabel="Voltar"
        onConfirm={onConfirm}
        onCancel={noop}
      />,
    )

    const dialog = screen.getByRole("alertdialog")
    expect(within(dialog).getByText("É definitivo.")).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }))
    expect(onConfirm).toHaveBeenCalled()
    await expectNoA11yViolations(dialog)
  })
})
