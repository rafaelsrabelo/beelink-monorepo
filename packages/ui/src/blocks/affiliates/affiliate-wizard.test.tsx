// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateCommissionBase } from "./affiliate-commission-base"
import { AffiliateCommissionTree } from "./affiliate-commission-tree"
import { AffiliateDocumentFields } from "./affiliate-document-fields"
import { AffiliateDocumentSection } from "./affiliate-document-section"
import { AffiliateInviteSent } from "./affiliate-invite-sent"
import { AffiliatePersonFields } from "./affiliate-person-fields"
import { AffiliateReviewCards } from "./affiliate-review-cards"
import { AffiliateWizardFrame } from "./affiliate-wizard-frame"
import { chosenFiles, documentTypes, emptyFiles, person, review, starts, tree, wizardSteps } from "./affiliate-wizard.fixtures"

const noop = () => {}
const card = { icon: null, title: "Tabela de comissão", description: "De onde partir, valor base e exceções" }

describe("the step-by-step invite (the user's design, 12/11/2026)", () => {
  it("shows the steps — a done one is a way back, one ahead is not — the progress, and the step's two moves", async () => {
    const onStep = vi.fn()
    const onBack = vi.fn()
    const onPrimary = vi.fn()
    const { container } = render(
      <AffiliateWizardFrame steps={wizardSteps} onStep={onStep} title="Monte a tabela de comissão" subtitle="Escolha de onde partir." card={card} onBack={onBack} primary="Continuar" onPrimary={onPrimary}>
        <p>campos</p>
      </AffiliateWizardFrame>,
    )

    const steps = within(screen.getByRole("navigation", { name: "Passos do convite" }))
    await userEvent.click(steps.getByRole("button", { name: /Dados do afiliado/ }))
    expect(onStep).toHaveBeenCalledWith(0)
    expect(steps.queryByRole("button", { name: /Documento/ })).not.toBeInTheDocument()
    expect(screen.getAllByText("Passo 2/4").length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }))
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(onBack).toHaveBeenCalled()
    expect(onPrimary).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("masks the phone and the CPF as they are typed, marks what is required and says each error under its field", async () => {
    const onChange = vi.fn()
    const { container } = render(<AffiliatePersonFields value={{ ...person, phone: "" }} onChange={onChange} issues={{ cpf: "Esse CPF não é válido." }} />)

    await userEvent.type(screen.getByLabelText(/Telefone/), "1")
    expect(onChange).toHaveBeenLastCalledWith({ ...person, phone: "(1" })
    expect(screen.getByLabelText(/CPF/)).toHaveAccessibleDescription("Esse CPF não é válido.")
    expect(screen.getAllByText("(obrigatório)")).toHaveLength(4)
    await expectNoA11yViolations(container)
  })

  it("starts from a table, moves the base by a point, a preset or by typing", async () => {
    const onBase = vi.fn()
    const { container } = render(<AffiliateCommissionBase starts={starts} startId="t-padrao" onStart={noop} base={12} onBase={onBase} />)

    await userEvent.click(screen.getByRole("button", { name: "Aumentar" }))
    expect(onBase).toHaveBeenLastCalledWith(13)
    await userEvent.click(screen.getByRole("button", { name: "15%" }))
    expect(onBase).toHaveBeenLastCalledWith(15)
    expect(screen.getByRole("button", { name: "10%" })).toHaveAttribute("aria-pressed", "false")
    await expectNoA11yViolations(container)
  })

  it("lists the categories with their products, what each inherits, and customizes, rates and resets a row", async () => {
    const onCustomize = vi.fn()
    const onRate = vi.fn()
    const onReset = vi.fn()
    const onToggle = vi.fn()
    const { container } = render(<AffiliateCommissionTree categories={tree} search="" onSearch={noop} onToggle={onToggle} onCustomize={onCustomize} onRate={onRate} onReset={onReset} />)

    expect(screen.getByText("R$ 139,90 · afiliado ganha R$ 20,98 por venda")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Personalizar: Whey Concentrado 900 g" }))
    expect(onCustomize).toHaveBeenCalledWith({ kind: "product", id: "p-conc" })
    await userEvent.click(screen.getAllByRole("button", { name: "Aumentar" })[0]!)
    expect(onRate).toHaveBeenCalledWith({ kind: "category", id: "c-whey" }, 16)
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao herdado: Whey Isolado 900 g" }))
    expect(onReset).toHaveBeenCalledWith({ kind: "product", id: "p-iso" })
    await userEvent.click(screen.getByRole("button", { name: "Produtos de Creatina" }))
    expect(onToggle).toHaveBeenCalledWith("c-crea")
    await expectNoA11yViolations(container)
  })

  it("picks the document's type, takes a file per side and says when it is still uploading", async () => {
    const onType = vi.fn()
    const onFile = vi.fn()
    const { container } = render(<AffiliateDocumentFields types={documentTypes} type="RG" onType={onType} files={emptyFiles} accept="image/jpeg,application/pdf" onFile={onFile} onRemove={noop} showLater />)

    await userEvent.click(screen.getByRole("radio", { name: "Passaporte" }))
    expect(onType).toHaveBeenCalledWith("PASSPORT")
    const file = new File(["x"], "frente.jpg", { type: "image/jpeg" })
    await userEvent.upload(screen.getByLabelText(/Arraste a foto: frente/), file)
    expect(onFile).toHaveBeenCalledWith("front", file)
    expect(screen.getByText(/Dá para anexar depois/)).toBeInTheDocument()
    await expectNoA11yViolations(container)

    render(<AffiliateDocumentFields types={documentTypes} type="RG" onType={noop} files={chosenFiles} accept="image/jpeg" onFile={noop} onRemove={noop} />)
    expect(screen.getByText("Enviando…")).toBeInTheDocument()
  })

  it("says each step back in a card with its way back, and takes the note", async () => {
    const onEdit = vi.fn()
    const { container } = render(<AffiliateReviewCards view={review} onEdit={onEdit} note="" onNote={noop} />)

    expect(screen.getByText("Produto: Whey Isolado 900 g · 20%")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Editar Tabela de comissão" }))
    expect(onEdit).toHaveBeenCalledWith(1)
    await expectNoA11yViolations(container)
  })

  it("says where the invite went, and leads to the record or to another invite", async () => {
    const onAnother = vi.fn()
    const { container } = render(<AffiliateInviteSent email="joao@exemplo.com" recordHref="/afiliados/a-joao" onAnother={onAnother} />)

    expect(screen.getByRole("link", { name: "Ver afiliado" })).toHaveAttribute("href", "/afiliados/a-joao")
    await userEvent.click(screen.getByRole("button", { name: "Convidar outro afiliado" }))
    expect(onAnother).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("on the record, says the document is pending and offers the upload; once sent, shows it and lets it be replaced", async () => {
    const fields = { types: documentTypes, type: "RG", onType: noop, files: emptyFiles, accept: "image/jpeg", onFile: noop, onRemove: noop }
    const { container, unmount } = render(<AffiliateDocumentSection document={null} replacing={false} onReplace={noop} onCancel={noop} fields={fields} onSend={noop} canSend={false} sending={false} />)
    expect(screen.getByText("Documento pendente")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enviar documento" })).toBeDisabled()
    await expectNoA11yViolations(container)
    unmount()

    const onReplace = vi.fn()
    render(<AffiliateDocumentSection document={{ summary: "RG · enviado em 12/11/2026", files: [{ label: "Frente", url: "https://example.test/frente", pdf: false }, { label: "Verso", url: "https://example.test/verso", pdf: true }] }} replacing={false} onReplace={onReplace} onCancel={noop} fields={fields} onSend={noop} canSend={false} sending={false} />)
    expect(screen.getByRole("img", { name: "Frente do documento" })).toHaveAttribute("src", "https://example.test/frente")
    expect(screen.getByRole("link", { name: /Abrir PDF: Verso/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Trocar documento" }))
    expect(onReplace).toHaveBeenCalled()
  })
})
