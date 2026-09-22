// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SectionList, type SectionListItem } from "./section-list"

const banners: SectionListItem[] = [
  { id: "1", title: "Inverno", subtitle: null, imageUrl: "https://cdn/1.png", destination: "Categoria · Blusas", external: false, layoutLabel: "Largura cheia", isActive: true },
  { id: "2", title: "WhatsApp", subtitle: null, imageUrl: "https://cdn/2.png", destination: "https://wa.me/5585", external: true, layoutLabel: "Metade", isActive: false },
]

function renderList(overrides: Partial<Parameters<typeof SectionList>[0]> = {}) {
  return render(<SectionList banners={banners} onEdit={() => {}} onDelete={() => {}} {...overrides} />)
}

describe("SectionList", () => {
  it("says where each banner goes, since a picture cannot", () => {
    renderList()

    expect(screen.getByText(/Categoria · Blusas/)).toBeInTheDocument()
    expect(screen.getByText(/wa\.me/)).toBeInTheDocument()
  })

  /** Two states a shopkeeper cannot read off the photograph. */
  it("marks the hidden one and the one that leaves the shop", () => {
    renderList()

    expect(screen.getByText("Oculto")).toBeInTheDocument()
    expect(screen.getByText("Abre fora")).toBeInTheDocument()
  })

  it("names every action after the banner it acts on", async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    renderList({ onDelete })

    await user.click(screen.getByRole("button", { name: "Excluir: WhatsApp" }))

    expect(onDelete).toHaveBeenCalledWith("2")
  })

  /** The order is the point of this screen, so the ends must not offer a move that does nothing. */
  it("closes both ends of the order", () => {
    renderList({ onMove: () => {} })

    expect(screen.getByRole("button", { name: "Subir: Inverno" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Descer: WhatsApp" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Descer: Inverno" })).toBeEnabled()
  })

  it("draws no move controls at all when the screen cannot reorder", () => {
    renderList()

    expect(screen.queryByRole("button", { name: /Subir/ })).not.toBeInTheDocument()
  })

  it("says what to do when the shop has no poster yet", () => {
    renderList({ banners: [] })

    expect(screen.getByText("Nenhum banner ainda.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList({ onMove: () => {} })

    await expectNoA11yViolations(container)
  })
})
