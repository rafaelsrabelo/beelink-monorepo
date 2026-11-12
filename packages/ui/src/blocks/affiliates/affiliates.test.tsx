// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateSettingsForm } from "./affiliate-settings-form"
import { AffiliatesFailed } from "./affiliates-failed"
import { AffiliatesSkeleton } from "./affiliates-skeleton"
import { AffiliatesTabs } from "./affiliates-tabs"
import { calendar, categoryRates, rates, settings, tables } from "./affiliates.fixtures"
import { CommissionCategoryRateList } from "./commission-category-rate-list"
import { CommissionGeneralRate } from "./commission-general-rate"
import { CommissionRateList } from "./commission-rate-list"
import { CommissionTableDialog } from "./commission-table-dialog"
import { CommissionTableList } from "./commission-table-list"

const noop = () => {}

describe("AffiliatesTabs (IMPULSEIA-102)", () => {
  it("links the four sections and marks the one on screen", async () => {
    const { container } = render(<AffiliatesTabs active="tables" affiliatesHref="/a" owedHref="/a/owed" settingsHref="/a/settings" tablesHref="/a/tables" />)

    const nav = within(screen.getByRole("navigation", { name: "Seções de afiliados" }))
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual(["Afiliados", "A pagar", "Configurações", "Tabelas"])
    expect(nav.getByRole("link", { name: "A pagar" })).toHaveAttribute("href", "/a/owed")
    expect(nav.getByRole("link", { name: "Afiliados" })).toHaveAttribute("href", "/a")
    expect(nav.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/a/settings")
    expect(nav.getByRole("link", { name: "Tabelas" })).toHaveAttribute("aria-current", "page")
    expect(nav.getByRole("link", { name: "Configurações" })).not.toHaveAttribute("aria-current")
    await expectNoA11yViolations(container)
  })
})

describe("AffiliateSettingsForm", () => {
  it("edits every rule, reporting each change with the rest of the value as it was", async () => {
    const onChange = vi.fn()
    const { container } = render(<AffiliateSettingsForm value={settings} onChange={onChange} onSubmit={noop} calendar={calendar} />)

    await userEvent.click(screen.getByRole("switch", { name: "Programa ligado" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, enabled: false })
    await userEvent.type(screen.getByLabelText("Prazo para pagar"), "5")
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, payoutDelayDays: "105" })
    await userEvent.type(screen.getByLabelText("Termos do programa"), "!")
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, termsText: `${settings.termsText}!` })
    expect(screen.getByText("Grátis durante o teste. Avisaremos antes de começar a cobrar por afiliado.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("shows the month's calendar, period by period", () => {
    render(<AffiliateSettingsForm value={settings} onChange={noop} onSubmit={noop} calendar={calendar} />)

    const month = within(screen.getByRole("region", { name: "Calendário deste mês" }))
    expect(month.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Entregues de 1º de nov. a 10 de nov. → pagar em 20 de nov.",
      "Entregues de 11 de nov. a 20 de nov. → pagar em 30 de nov.",
      "Entregues de 21 de nov. a 30 de nov. → pagar em 10 de dez.",
    ])
  })

  it("says what to correct under each field, and the API's refusal, and submits", async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <AffiliateSettingsForm value={settings} onChange={noop} onSubmit={onSubmit} calendar={[]} issues={{ payoutDelayDays: "Informe de 0 a 60 dias." }} error="Alguma configuração está fora do permitido." />,
    )

    expect(screen.getByLabelText("Prazo para pagar")).toHaveAccessibleDescription("Informe de 0 a 60 dias.")
    expect(screen.queryByLabelText("A visita pelo link vale por")).toBeNull()
    expect(screen.getByText(/compra pelas páginas do link dele/)).toBeInTheDocument()
    expect(screen.getByText("Alguma configuração está fora do permitido.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })
})

describe("CommissionTableList", () => {
  it("lists each table with its rate and what has its own, the default one marked, editable and never deletable", async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const { container } = render(<CommissionTableList tables={tables} hrefOf={(id) => `/t/${id}`} onCreate={noop} onEdit={onEdit} onDelete={onDelete} />)

    expect(screen.getByText("Padrão", { selector: "[data-slot=badge]" })).toBeInTheDocument()
    expect(screen.getByText(/10% em todos os produtos/)).toHaveTextContent("1 categoria com percentual próprio · 2 produtos com percentual próprio")
    expect(screen.getByText(/15% em todos os produtos/)).toHaveTextContent("nenhuma categoria com percentual próprio · nenhum produto com percentual próprio")
    expect(screen.getByRole("link", { name: "Personalizar os percentuais de Influencers" })).toHaveTextContent("Personalizar")
    expect(screen.getByRole("link", { name: "Personalizar os percentuais de Padrão" })).toHaveAttribute("href", "/t/t-padrao")
    expect(screen.getByRole("button", { name: "Editar Padrão" })).toHaveTextContent("Editar")
    expect(screen.queryByRole("button", { name: "Apagar Padrão" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Apagar Influencers" }))
    expect(onDelete).toHaveBeenCalledWith(tables[1])
    await userEvent.click(screen.getByRole("button", { name: "Editar Padrão" }))
    expect(onEdit).toHaveBeenCalledWith(tables[0])
    await expectNoA11yViolations(container)
  })
})

describe("CommissionTableDialog", () => {
  it("edits the name and rate, says the refusal, and creates", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(<CommissionTableDialog open onOpenChange={noop} mode="create" value={{ name: "", rate: "" }} onChange={onChange} onSubmit={onSubmit} issues={{ rate: "Informe um percentual de 0% a 100%." }} error="Já existe uma tabela com esse nome." />)

    const dialog = within(screen.getByRole("dialog", { name: "Nova tabela" }))
    await userEvent.type(dialog.getByLabelText("Nome"), "I")
    expect(onChange).toHaveBeenLastCalledWith({ name: "I", rate: "" })
    expect(dialog.getByLabelText("Comissão em todos os produtos (%)")).toHaveAccessibleDescription("Informe um percentual de 0% a 100%.")
    expect(dialog.getByText("Já existe uma tabela com esse nome.")).toHaveAttribute("role", "alert")
    await userEvent.click(dialog.getByRole("button", { name: "Criar tabela" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    await expectNoA11yViolations(document.body)
  })

  it("says it edits a table that exists", () => {
    render(<CommissionTableDialog open onOpenChange={noop} mode="edit" value={{ name: "Padrão", rate: "10" }} onChange={noop} onSubmit={noop} messages={en} />)

    expect(screen.getByRole("dialog", { name: "Edit table" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })
})

describe("CommissionRateList", () => {
  it("shows each product's own rate, or the table's it follows, and saves only what changed", async () => {
    const onSave = vi.fn()
    const onReset = vi.fn()
    const onType = vi.fn()
    const { container } = render(
      <CommissionRateList rows={rates} search="" onSearch={noop} onType={onType} onSave={onSave} onReset={onReset} emptyText="Nada" status="Comissão de BCAA salva." />,
    )

    expect(screen.getByRole("heading", { name: "Por produto" })).toBeInTheDocument()
    expect(screen.getByLabelText("Whey Concentrado")).toHaveValue("25")
    expect(screen.getByLabelText("Creatina")).toHaveAccessibleDescription("Segue a categoria Suplementos: 15%")
    expect(screen.getByLabelText("Creatina")).toHaveAttribute("placeholder", "15")
    expect(screen.getByLabelText("Camiseta")).toHaveAccessibleDescription("Segue o geral: 10%")
    expect(screen.getByRole("button", { name: "Salvar comissão de Whey Concentrado" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Usar o da categoria em Creatina" })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Creatina"), "8")
    expect(onType).toHaveBeenLastCalledWith("p-creatina", "8")
    await userEvent.click(screen.getByRole("button", { name: "Salvar comissão de BCAA" }))
    expect(onSave).toHaveBeenCalledWith("p-bcaa")
    // Whey's category has a rate: dropping its own goes back to the category's, and the button says so.
    await userEvent.click(screen.getByRole("button", { name: "Usar o da categoria em Whey Concentrado" }))
    expect(onReset).toHaveBeenCalledWith("p-whey")
    expect(screen.getByText("Comissão de BCAA salva.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says why there is no row", () => {
    render(<CommissionRateList rows={[]} search="xyz" onSearch={noop} onType={noop} onSave={noop} onReset={noop} emptyText="Nenhum produto encontrado." />)

    expect(screen.getByText("Nenhum produto encontrado.")).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Buscar produto" })).toHaveValue("xyz")
  })
})

describe("CommissionCategoryRateList", () => {
  it("lists every category with its own rate or the general one it follows, with no photo and no search", async () => {
    const onType = vi.fn()
    const onSave = vi.fn()
    const { container } = render(<CommissionCategoryRateList rows={categoryRates} onType={onType} onSave={onSave} onReset={noop} status="Comissão de Roupas salva." />)

    expect(screen.getByRole("heading", { name: "Por categoria" })).toBeInTheDocument()
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Suplementos")).toHaveValue("15")
    expect(screen.getByLabelText("Roupas")).toHaveAccessibleDescription("Segue o geral: 10%")
    await userEvent.type(screen.getByLabelText("Roupas"), "12")
    expect(onType).toHaveBeenLastCalledWith("c-roupas", "2")
    expect(screen.getByText("Comissão de Roupas salva.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says when the shop has no categories", () => {
    render(<CommissionCategoryRateList rows={[]} onType={noop} onSave={noop} onReset={noop} />)

    expect(screen.getByText("A loja ainda não tem categorias.")).toBeInTheDocument()
  })
})

describe("CommissionGeneralRate", () => {
  it("edits the table's general rate in place, and says what to correct or that it saved", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const { container, rerender } = render(<CommissionGeneralRate value="10" onChange={onChange} onSubmit={onSubmit} />)

    expect(screen.getByRole("heading", { name: "Percentual geral" })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Comissão em todos os produtos (%)"), "5")
    expect(onChange).toHaveBeenLastCalledWith("105")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)

    rerender(<CommissionGeneralRate value="105" onChange={onChange} onSubmit={onSubmit} issue="Informe um percentual de 0% a 100%." />)
    expect(screen.getByLabelText("Comissão em todos os produtos (%)")).toHaveAccessibleDescription("Informe um percentual de 0% a 100%.")
    rerender(<CommissionGeneralRate value="12" onChange={onChange} onSubmit={onSubmit} pristine status="Percentual geral salvo: 12%." />)
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
    expect(screen.getByText("Percentual geral salvo: 12%.")).toBeInTheDocument()
  })
})

describe("AffiliatesSkeleton and AffiliatesFailed", () => {
  it("hold the place while reading, and say a failed read with the way to ask again", async () => {
    const onRetry = vi.fn()
    const { container } = render(
      <>
        <AffiliatesSkeleton />
        <AffiliatesFailed onRetry={onRetry} />
      </>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o programa de afiliados.")
    await expectNoA11yViolations(container)
  })
})
