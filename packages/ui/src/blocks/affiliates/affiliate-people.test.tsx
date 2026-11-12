// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateConfirmDialog } from "./affiliate-confirm-dialog"
import { AffiliateListSection } from "./affiliate-list-section"
import { AffiliateCommissionTab } from "./affiliate-commission-tab"
import { AffiliateGeneralTab } from "./affiliate-general-tab"
import { commission, invitedRecord, people, record, tableOptions } from "./affiliate-people.fixtures"
import { AffiliateRecordHeader } from "./affiliate-record-header"
import { AffiliateRecordTabs } from "./affiliate-record-tabs"
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

describe("an affiliate's record, in tabs (12/11/2026)", () => {
  const general = { editing: null, draft: "", onEdit: noop, onDraft: noop, onSave: noop, onCancel: noop, onRemovePhoto: noop, onRemoveTagline: noop }

  it("heads with who, where they stand, the e-mail and the link, and copies the link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const { container } = render(<AffiliateRecordHeader name={record.name} email={record.email} status="ACTIVE" link={record.link} photoUrl={null} backHref="#lista" onAction={noop} />)

    expect(screen.getByRole("heading", { name: "João Silva" })).toBeInTheDocument()
    expect(screen.getByText("Ativo")).toBeInTheDocument()
    expect(screen.getByText(/beelink\.com\.br\/lessari\/joao/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copiar link" }))
    expect(writeText).toHaveBeenCalledWith("https://beelink.com.br/lessari/joao")
    expect(await screen.findByRole("button", { name: "Link copiado" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it.each([
    ["INVITED", "Reenviar convite", "resend", "Cancelar convite", "cancel"],
    ["ACTIVE", "Pausar", "pause", "Encerrar", "end"],
    ["PAUSED", "Retomar", "resume", "Encerrar", "end"],
  ] as const)("offers %s its main act beside the copy, and the one that does not come back behind ⋯", async (status, main, mainAction, more, moreAction) => {
    const onAction = vi.fn()
    render(<AffiliateRecordHeader name="Maria Souza" email="maria@exemplo.com" status={status} link={null} photoUrl={null} backHref="#lista" onAction={onAction} />)

    await userEvent.click(screen.getByRole("button", { name: main }))
    expect(onAction).toHaveBeenLastCalledWith(mainAction)
    await userEvent.click(screen.getByRole("button", { name: "Mais ações" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: more }))
    expect(onAction).toHaveBeenLastCalledWith(moreAction)
  })

  it("offers nothing to an ended affiliate, and waits while an act is in flight", () => {
    const { rerender } = render(<AffiliateRecordHeader name="Ana" email="ana@exemplo.com" status="ENDED" link={null} photoUrl={null} backHref="#lista" onAction={noop} />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText(/Encerrado de vez/)).toBeInTheDocument()

    rerender(<AffiliateRecordHeader name="Ana" email="ana@exemplo.com" status="ACTIVE" link={null} photoUrl={null} backHref="#lista" onAction={noop} busy="pause" error="A situação do afiliado mudou. Recarregue a página." />)
    expect(screen.getAllByRole("button").every((button) => button.hasAttribute("disabled"))).toBe(true)
    expect(screen.getByRole("alert")).toHaveTextContent("A situação do afiliado mudou.")
  })

  it("lists the sections as addresses, marking the open one", async () => {
    const { container } = render(<AffiliateRecordTabs active="financeiro" hrefOf={(tab) => `?aba=${tab}`} />)

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Geral", "Comissão", "Documento", "Financeiro", "Pedidos"])
    expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute("href", "?aba=pedidos")
    await expectNoA11yViolations(container)
  })

  it("lays who they are out in rows, and takes the photo and the phrase off the window", async () => {
    const onRemovePhoto = vi.fn()
    const onRemoveTagline = vi.fn()
    const { container } = render(<AffiliateGeneralTab affiliate={record} {...general} onRemovePhoto={onRemovePhoto} onRemoveTagline={onRemoveTagline} />)

    expect(screen.getByRole("heading", { name: "Dados" })).toBeInTheDocument()
    expect(screen.getByText("Versão 2, aceita em 12 de nov.")).toBeInTheDocument()
    expect(screen.getByText("Indicou 3 amigas no lançamento.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Tirar a foto" }))
    await userEvent.click(screen.getByRole("button", { name: "Tirar a frase" }))
    expect(onRemovePhoto).toHaveBeenCalled()
    expect(onRemoveTagline).toHaveBeenCalled()
    // Telefone, CPF and Anotação change in place.
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(3)
    await expectNoA11yViolations(container)
  })

  it("edits the CPF in its own row — masked — saves it, and shows the refusal there", async () => {
    const onDraft = vi.fn()
    const onSave = vi.fn()
    const { container } = render(<AffiliateGeneralTab affiliate={invitedRecord} identityMissing {...general} editing="cpf" draft="" onDraft={onDraft} onSave={onSave} issue="Informe um CPF válido." />)

    expect(screen.getByText("Convidado antes de o telefone e o CPF serem pedidos. Complete aqui.")).toBeInTheDocument()
    expect(screen.getByText("O afiliado escolhe o nome do link ao aceitar o convite.")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("CPF"), "5")
    expect(onDraft).toHaveBeenLastCalledWith("5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSave).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um CPF válido.")
    // While one row is edited, no other Editar.
    expect(screen.getAllByRole("button", { name: "Editar" }).every((button) => button.hasAttribute("disabled"))).toBe(true)
    await expectNoA11yViolations(container)
  })

  it("shows the table and what it pays, and saves another table only once one was chosen", async () => {
    const onSaveTable = vi.fn()
    const { container, rerender } = render(<AffiliateCommissionTab tables={tableOptions} tableId="t-influ" onTable={noop} onSaveTable={onSaveTable} onMakeOwn={noop} tableHref="#tabela" commission={commission} />)

    expect(screen.getByText("15%")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Bolsas · 20%", "Acessórios · 5%"])
    expect(screen.getByText("2 com percentual próprio")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Personalizar a comissão deste afiliado" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull()
    await expectNoA11yViolations(container)

    rerender(<AffiliateCommissionTab tables={tableOptions} tableId="t-padrao" onTable={noop} onSaveTable={onSaveTable} own={{ editHref: "#editar" }} tableHref="#tabela" commission={null} tableChanged />)
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSaveTable).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "Editar comissão" })).toHaveAttribute("href", "#editar")
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
