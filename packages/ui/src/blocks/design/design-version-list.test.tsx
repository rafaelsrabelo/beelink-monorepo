// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignVersionList } from "./design-version-list"

const versions = [
  { id: "v2", number: 2, when: "26/09/2026 14:30", author: "Ana", note: "Black Friday", live: true },
  { id: "v1", number: 1, when: "10/09/2026 18:00", author: null, note: null, live: false },
]

describe("DesignVersionList", () => {
  it("lists the versions newest first, the served one marked, with when, who and the note", () => {
    render(<DesignVersionList versions={versions} onRestore={vi.fn()} restoring={false} />)

    const [newest, oldest] = screen.getAllByRole("listitem")
    expect(newest).toHaveTextContent("Versão 2")
    expect(newest).toHaveTextContent("No ar")
    expect(newest).toHaveTextContent("26/09/2026 14:30 · Ana")
    expect(newest).toHaveTextContent("Black Friday")
    expect(within(oldest!).queryByText("No ar")).not.toBeInTheDocument()
  })

  it("asks before restoring, saying the shop changes only when published", async () => {
    const onRestore = vi.fn()
    render(<DesignVersionList versions={versions} onRestore={onRestore} restoring={false} />)

    await userEvent.click(screen.getByRole("button", { name: "Restaurar Versão 1" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Restaurar a versão 1?" })
    expect(dialog).toHaveTextContent("A loja só muda quando você publicar.")
    expect(onRestore).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Restaurar" }))
    expect(onRestore).toHaveBeenCalledWith("v1")
  })

  it("says when there is none yet, and why a restore failed", () => {
    render(<DesignVersionList versions={[]} onRestore={vi.fn()} restoring={false} error="Não foi possível restaurar. Tente de novo." />)

    expect(screen.getByText("Nenhuma versão publicada ainda.")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível restaurar")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <DesignVersionList versions={versions} onRestore={vi.fn()} restoring={false} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
