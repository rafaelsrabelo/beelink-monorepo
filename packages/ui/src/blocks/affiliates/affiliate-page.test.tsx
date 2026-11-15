// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateAcceptanceForm } from "./affiliate-acceptance-form"
import { AffiliateApplicationApproveDialog } from "./affiliate-application-approve-dialog"
import { AffiliateApplicationsList } from "./affiliate-applications-list"
import { acceptance } from "./affiliate-invite.fixtures"
import { AffiliatePageCard } from "./affiliate-page-card"
import { AffiliatePageEditor } from "./affiliate-page-editor"
import { applications, decided, filterHrefs, pageCard, pageContent, pagePreview, pageTables } from "./affiliate-page.fixtures"

const noop = () => {}
const live = { live: true, message: "No ar: os visitantes já veem a página." }

function card(props: Partial<Parameters<typeof AffiliatePageCard>[0]> = {}) {
  return render(
    <AffiliatePageCard value={pageCard} onChange={noop} onSubmit={noop} address="lessari.com.br/seja-afiliado" viewHref="/lessari/seja-afiliado" editHref="/admin/lessari/affiliates/join-page" tables={pageTables} status={live} onCopy={noop} {...props} />,
  )
}

describe("AffiliatePageCard (plan 2026-11-14)", () => {
  it("opens the page, chooses where it shows and how an application is decided, each change with the rest as it was", async () => {
    const onChange = vi.fn()
    const { container } = card({ onChange, value: { ...pageCard, open: false } })

    await userEvent.click(screen.getByRole("switch", { name: "Receber candidaturas pela loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...pageCard, open: true })
    await userEvent.click(screen.getByRole("checkbox", { name: "Faixa fina no topo de todas as páginas" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...pageCard, open: false, topStrip: true })
    await userEvent.click(screen.getByRole("radio", { name: "Convidar na hora" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...pageCard, open: false, approval: "AUTO" })
    await expectNoA11yViolations(container)
  })

  it("says the address, copies it, and leads to the page and to its texts", async () => {
    const onCopy = vi.fn()
    card({ onCopy })

    expect(screen.getByText("lessari.com.br/seja-afiliado")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copiar link" }))
    expect(onCopy).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: "Ver página" })).toHaveAttribute("href", "/lessari/seja-afiliado")
    expect(screen.getByRole("link", { name: "Editar conteúdo" })).toHaveAttribute("href", "/admin/lessari/affiliates/join-page")
    expect(screen.getByText(live.message)).toBeInTheDocument()
  })

  it("saves, and says the answer where a reader hears it", async () => {
    const onSubmit = vi.fn()
    const { rerender } = card({ onSubmit })

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    rerender(<AffiliatePageCard value={pageCard} onChange={noop} onSubmit={noop} address="a" viewHref="/v" editHref="/e" tables={pageTables} status={live} onCopy={noop} error="Essa tabela não existe mais. Escolha outra." />)
    expect(screen.getByText("Essa tabela não existe mais. Escolha outra.")).toBeInTheDocument()
  })
})

describe("AffiliatePageEditor", () => {
  it("edits every text, adds and removes the items of a list, and brings a part back to the product's own", async () => {
    const onChange = vi.fn()
    const onRestore = vi.fn()
    const { container } = render(<AffiliatePageEditor value={pageContent} onChange={onChange} onRestore={onRestore} onSubmit={noop} preview={pagePreview} backHref="/b" viewHref="/v" />)

    const top = within(screen.getByRole("region", { name: "Topo da página" }))
    await userEvent.type(top.getByRole("textbox", { name: "Selo" }), "!")
    expect(onChange).toHaveBeenLastCalledWith({ ...pageContent, badge: `${pageContent.badge}!` })

    const benefits = within(screen.getByRole("region", { name: "Benefícios" }))
    await userEvent.click(benefits.getByRole("button", { name: "Remover Benefício 1" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...pageContent, benefits: pageContent.benefits.slice(1) })
    await userEvent.click(benefits.getByRole("button", { name: "Adicionar" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...pageContent, benefits: [...pageContent.benefits, { title: "", text: "" }] })
    await userEvent.click(benefits.getByRole("button", { name: /Restaurar padrão/ }))
    expect(onRestore).toHaveBeenLastCalledWith("benefits")

    await userEvent.click(screen.getByRole("checkbox", { name: "Fazer uma pergunta a mais, opcional para quem preenche" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...pageContent, askExtraQuestion: false })
    await expectNoA11yViolations(container)
  })

  it("keeps the steps at one at least, and shows the top as a visitor will read it", () => {
    render(<AffiliatePageEditor value={{ ...pageContent, steps: pageContent.steps.slice(0, 1) }} onChange={noop} onRestore={noop} onSubmit={noop} preview={pagePreview} backHref="/b" viewHref="/v" />)

    const steps = within(screen.getByRole("region", { name: "Como funciona" }))
    expect(steps.queryByRole("button", { name: /Remover/ })).toBeNull()
    expect(within(screen.getByRole("complementary", { name: "Prévia do topo" })).getByText("Indique a Lessari e ganhe 10% em cada venda")).toBeInTheDocument()
  })

  it("says under a field why it does not hold, and the API's refusal by the button", () => {
    render(<AffiliatePageEditor value={pageContent} onChange={noop} onRestore={noop} onSubmit={noop} preview={pagePreview} backHref="/b" viewHref="/v" issues={{ title: "Até 120 caracteres." }} error="Confira os campos marcados." />)

    expect(within(screen.getByRole("region", { name: "Topo da página" })).getByRole("textbox", { name: "Título" })).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Até 120 caracteres.")).toBeInTheDocument()
    expect(screen.getByText("Confira os campos marcados.")).toBeInTheDocument()
  })
})

describe("AffiliateApplicationsList", () => {
  it("lists the new ones with whom they are from and the two ways to decide each", async () => {
    const onApprove = vi.fn()
    const onRefuse = vi.fn()
    const { container } = render(<AffiliateApplicationsList status="PENDING" filterHrefs={filterHrefs} pendingCount={2} applications={applications} onApprove={onApprove} onRefuse={onRefuse} />)

    expect(screen.getByRole("link", { name: "Novas (2)" })).toHaveAttribute("aria-current", "page")
    const [ana] = screen.getAllByRole("listitem")
    expect(within(ana!).getByText("@ana.treinos no Instagram")).toBeInTheDocument()
    await userEvent.click(within(ana!).getByRole("button", { name: "Aprovar e convidar" }))
    expect(onApprove).toHaveBeenCalledWith(applications[0])
    await userEvent.click(within(ana!).getByRole("button", { name: "Recusar" }))
    expect(onRefuse).toHaveBeenCalledWith(applications[0])
    await expectNoA11yViolations(container)
  })

  it("says what became of a decided one, and when there is none", () => {
    const { rerender } = render(<AffiliateApplicationsList status="APPROVED" filterHrefs={filterHrefs} pendingCount={0} applications={decided} onApprove={noop} onRefuse={noop} />)
    expect(screen.getByText("Convite enviado")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aprovar e convidar" })).toBeNull()

    rerender(<AffiliateApplicationsList status="REFUSED" filterHrefs={filterHrefs} pendingCount={0} applications={[]} onApprove={noop} onRefuse={noop} />)
    expect(screen.getByText("Nenhuma candidatura recusada.")).toBeInTheDocument()
  })
})

describe("AffiliateApplicationApproveDialog", () => {
  it("says to whom the invite goes and sends it on the table chosen", async () => {
    const onConfirm = vi.fn()
    render(<AffiliateApplicationApproveDialog application={applications[0]!} tables={pageTables} tableId="padrao" onTableChange={noop} onConfirm={onConfirm} onCancel={noop} />)

    const dialog = within(screen.getByRole("dialog", { name: "Aprovar Ana Souza?" }))
    expect(dialog.getByText("O convite vai para ana.souza@exemplo.com, válido por 7 dias.")).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Enviar convite" }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await expectNoA11yViolations(document.body)
  })
})

describe("AffiliateAcceptanceForm, an application's invite", () => {
  it("asks the CPF, masked as it is typed, and says why it does not hold", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<AffiliateAcceptanceForm signUp value={acceptance} onChange={onChange} onSubmit={noop} slugHint={{ kind: "idle" }} hasTerms cpfRequired />)

    await userEvent.type(screen.getByRole("textbox", { name: "CPF" }), "1")
    expect(onChange).toHaveBeenLastCalledWith({ ...acceptance, cpf: "1" })
    rerender(<AffiliateAcceptanceForm signUp value={{ ...acceptance, cpf: "111.444" }} onChange={noop} onSubmit={noop} slugHint={{ kind: "idle" }} hasTerms cpfRequired issues={{ cpf: "Informe um CPF válido." }} />)
    expect(screen.getByRole("textbox", { name: "CPF" })).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Informe um CPF válido.")).toBeInTheDocument()
  })

  it("asks no CPF of an invite the shop filled in", () => {
    render(<AffiliateAcceptanceForm signUp value={acceptance} onChange={noop} onSubmit={noop} slugHint={{ kind: "idle" }} hasTerms />)
    expect(screen.queryByRole("textbox", { name: "CPF" })).toBeNull()
  })
})
