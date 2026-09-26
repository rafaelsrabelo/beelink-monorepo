// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignVersionList, type DesignVersionListProps } from "./design-version-list"

const versions = [
  { id: "v2", number: 2, when: "26/09/2026 14:30", author: "Ana", note: "Black Friday", live: true },
  { id: "v1", number: 1, when: "10/09/2026 18:00", author: null, note: null, live: false },
]

function renderList(overrides: Partial<DesignVersionListProps> = {}) {
  const props: DesignVersionListProps = {
    versions,
    asking: null,
    onAsk: vi.fn(),
    onConfirm: vi.fn(),
    restoring: false,
    ...overrides,
  }
  return { ...render(<DesignVersionList {...props} />), props }
}

describe("DesignVersionList", () => {
  it("lists the versions newest first, the served one marked, with when, who and the note", () => {
    renderList()

    const [newest, oldest] = screen.getAllByRole("listitem")
    expect(newest).toHaveTextContent("Versão 2")
    expect(newest).toHaveTextContent("No ar")
    expect(newest).toHaveTextContent("26/09/2026 14:30 · Ana")
    expect(newest).toHaveTextContent("Black Friday")
    expect(within(oldest!).queryByText("No ar")).not.toBeInTheDocument()
  })

  it("asks about the version a row names", async () => {
    const { props } = renderList()

    await userEvent.click(screen.getByRole("button", { name: "Restaurar Versão 1" }))
    expect(props.onAsk).toHaveBeenCalledWith("v1")
  })

  it("asks before restoring, saying the shop changes only when published", async () => {
    const { props } = renderList({ asking: "v1" })

    const dialog = await screen.findByRole("alertdialog", { name: "Restaurar a versão 1?" })
    expect(dialog).toHaveTextContent("A loja só muda quando você publicar.")
    await userEvent.click(within(dialog).getByRole("button", { name: "Restaurar" }))
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
  })

  it("keeps the question while the restore runs, and says why one failed inside it", async () => {
    const { props, rerender } = renderList({ asking: "v1", restoring: true })

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByRole("button", { name: "Restaurando…" })).toBeDisabled()
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled()
    await userEvent.keyboard("{Escape}")
    expect(props.onAsk).not.toHaveBeenCalled()

    rerender(<DesignVersionList {...props} restoring={false} error="Não foi possível restaurar. Tente de novo." />)
    expect(within(screen.getByRole("alertdialog")).getByRole("alert")).toHaveTextContent("Não foi possível restaurar")
  })

  it("says what the draft now holds once a restore landed", () => {
    renderList({ restored: 1 })

    expect(screen.getByRole("status")).toHaveTextContent("Versão 1 restaurada no rascunho. Publique para a loja mudar.")
  })

  it("says when there is none yet", () => {
    renderList({ versions: [] })

    expect(screen.getByText("Nenhuma versão publicada ainda.")).toBeInTheDocument()
  })

  it("says the versions could not be read, never that there are none, and asks again", async () => {
    const onRetry = vi.fn()
    renderList({ versions: null, loadFailed: true, onRetry })

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as versões.")
    expect(screen.queryByText("Nenhuma versão publicada ainda.")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <DesignVersionList versions={versions} asking={null} onAsk={vi.fn()} onConfirm={vi.fn()} restoring={false} restored={2} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
