// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { InspectorTabs, type InspectorTab, type InspectorTabsProps } from "./inspector-tabs"

type Harness = Partial<Omit<InspectorTabsProps, "tab" | "onTabChange">> & { start?: InspectorTab }

/** The screen's part: it holds the tab. */
function Inspector({ start = "content", ...props }: Harness) {
  const [tab, setTab] = useState<InspectorTab>(start)

  return (
    <InspectorTabs
      tab={tab}
      onTabChange={setTab}
      name="Banner"
      content={<input aria-label="Título" defaultValue="Verão" />}
      layout={<p>Largura do bloco</p>}
      style={<p>Cor de fundo da faixa</p>}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  )
}

describe("InspectorTabs", () => {
  it("names the tabs by what is being edited, and opens on the one asked for", () => {
    render(<Inspector />)

    expect(screen.getByRole("tablist", { name: "Editar Banner" })).toBeInTheDocument()
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Conteúdo", "Layout", "Estilo"])
    expect(screen.getByRole("tab", { name: "Conteúdo", selected: true })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Título" })).toBeVisible()
  })

  // A picture on its way lands in the field that asked for it, and what was typed is still there.
  it("keeps the content mounted while another tab shows", async () => {
    const user = userEvent.setup()
    render(<Inspector />)

    await user.type(screen.getByRole("textbox", { name: "Título" }), " 2026")
    await user.click(screen.getByRole("tab", { name: "Layout" }))

    expect(screen.getByText("Largura do bloco")).toBeVisible()
    expect(screen.getByDisplayValue("Verão 2026")).not.toBeVisible()

    await user.click(screen.getByRole("tab", { name: "Conteúdo" }))
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Verão 2026")
  })

  // A band chosen on its own has only its style: a tab bar of one would be a control that does nothing.
  it("shows a band chosen on its own without tabs", () => {
    render(<Inspector content={undefined} layout={undefined} start="content" />)

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
    expect(screen.getByText("Cor de fundo da faixa")).toBeVisible()
  })

  // The strip has nothing to lay out: asked for its layout, the panel shows what it has.
  it("falls back to the first tab it has when the one asked for is not there", () => {
    render(<Inspector layout={undefined} start="layout" />)

    expect(screen.getAllByRole("tab")).toHaveLength(2)
    expect(screen.getByRole("tab", { name: "Conteúdo", selected: true })).toBeInTheDocument()
  })

  // Salvar is off for a reason in another tab — a contact form nobody can answer — and says where.
  it("marks the tab that keeps Salvar off while another one shows", async () => {
    const user = userEvent.setup()
    render(<Inspector start="style" attention="content" submitDisabled />)

    expect(screen.getByRole("tab", { name: "Conteúdo (precisa de atenção)" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()

    await user.click(screen.getByRole("tab", { name: /Conteúdo/ }))
    expect(screen.getByRole("tab", { name: "Conteúdo", selected: true })).toBeInTheDocument()
  })

  it("saves from any tab, and cancels", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<Inspector start="style" onSubmit={onSubmit} onCancel={onCancel} />)

    await user.click(screen.getByRole("button", { name: "Salvar" }))
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("says it is saving, and takes no second save meanwhile", () => {
    render(<Inspector pending />)

    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Inspector attention="style" />)

    await expectNoA11yViolations(container)
  })
})
