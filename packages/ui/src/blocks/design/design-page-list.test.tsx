// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { samplePageRows } from "./design-page.fixtures"
import { DesignPageList } from "./design-page-list"

function renderList(overrides: Partial<Parameters<typeof DesignPageList>[0]> = {}) {
  return render(
    <main>
      <DesignPageList pages={samplePageRows} currentId="lp-1" {...overrides} />
    </main>,
  )
}

describe("DesignPageList", () => {
  it("links every page to its editor, marks the one being edited and says where each lives", () => {
    renderList()

    expect(screen.getByRole("link", { name: /Página inicial/ })).toHaveAttribute("href", "/admin/mutante/design")
    const current = screen.getByRole("link", { name: /Lançamento Whey/ })
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current).toHaveTextContent("/lp/lancamento-whey")
    expect(current).toHaveTextContent("No menu")
    expect(screen.getByRole("link", { name: /Black Friday/ })).toHaveTextContent("Rascunho")
  })

  it("folds the archived pages under their count", () => {
    renderList()

    const archived = screen.getByText("Arquivadas (1)").closest("details") as HTMLElement
    expect(archived).not.toHaveAttribute("open")
    expect(within(archived).getByRole("link", { hidden: true, name: /Dia das Mães/ })).toBeInTheDocument()
  })

  it("offers to put a draft up and to archive it, and to take a published one back to draft", async () => {
    const onStatus = vi.fn()
    renderList({ onStatus })

    await userEvent.click(screen.getByRole("button", { name: "Ações de Black Friday" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Publicar" }))
    expect(onStatus).toHaveBeenLastCalledWith("lp-2", "PUBLISHED")

    await userEvent.click(screen.getByRole("button", { name: "Ações de Lançamento Whey" }))
    expect(await screen.findByRole("menuitem", { name: /Ver na loja/ })).toHaveAttribute("href", "/mutante/lp/lancamento-whey")
    await userEvent.click(screen.getByRole("menuitem", { name: "Voltar para rascunho" }))
    expect(onStatus).toHaveBeenLastCalledWith("lp-1", "DRAFT")
  })

  it("gives the home no menu: it is the shop's own address", () => {
    renderList({ onStatus: vi.fn() })

    expect(screen.queryByRole("button", { name: "Ações de Página inicial" })).not.toBeInTheDocument()
  })

  it("invites the first landing when the home is all there is", async () => {
    const onCreate = vi.fn()
    renderList({ pages: samplePageRows.slice(0, 1), currentId: "home", onCreate })

    expect(screen.getByText(/Nenhuma landing page ainda/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Nova landing page" }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it("says why a change was refused", () => {
    renderList({ error: "Não foi possível mudar a página. Tente de novo." })

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível mudar a página")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList({ onStatus: vi.fn(), onCreate: vi.fn() })

    await expectNoA11yViolations(container)
  })
})
