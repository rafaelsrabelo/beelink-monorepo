// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignEditTag } from "./design-edit-tag"

describe("DesignEditTag", () => {
  it("names the pencil after what it opens", () => {
    render(
      <DesignEditTag label="Novidades da semana" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    expect(screen.getByRole("button", { name: "Editar componente: Novidades da semana" })).toBeInTheDocument()
  })

  /**
   * The preview wraps everything in a capture handler that cancels clicks, so the shop's own links
   * stay inert. This is the one click that must get through it.
   */
  it("reaches its handler through a parent that cancels clicks", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const parent = vi.fn()

    render(
      <div onClickCapture={parent}>
        <DesignEditTag label="Banner" onEdit={onEdit}>
          <p>bloco</p>
        </DesignEditTag>
      </div>,
    )

    await user.click(screen.getByRole("button", { name: "Editar componente: Banner" }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  /**
   * The point of the change: the cover spans the block instead of a 36px circle in its corner —
   * 0.9% of a block 928 by 160, drawn invisible until hovered. A target you find by accident is
   * the whole of what "não dá para saber que dá para clicar" was describing.
   */
  it("makes the whole block the target, not a corner of it", () => {
    render(
      <DesignEditTag label="Banner" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    const cover = screen.getByRole("button", { name: "Editar componente: Banner" })

    expect(cover.className).toContain("inset-0")
  })

  /** The panel truncates a name to fit its row; the block has room for the word. */
  it("says which block it is", () => {
    render(
      <DesignEditTag label="Banner" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    expect(screen.getByRole("button", { name: "Editar componente: Banner" })).toHaveTextContent("Banner")
  })

  /** The open form and the block it belongs to are the same thing seen twice. */
  it("draws itself as selected while its form is the open one", () => {
    const { rerender } = render(
      <DesignEditTag label="Banner" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    expect(screen.getByRole("button", { name: /Banner/ })).not.toHaveAttribute("aria-current")

    rerender(
      <DesignEditTag label="Banner" onEdit={vi.fn()} selected>
        <p>bloco</p>
      </DesignEditTag>,
    )

    expect(screen.getByRole("button", { name: /Banner/ })).toHaveAttribute("aria-current", "true")
  })

  /**
   * The surface paints the shop small with `transform`, and that shrinks this chip with it: near a
   * scale of 0.5, a 12px name reaches the owner at 6px. The chip undoes it from the number the
   * surface publishes, rather than measuring the same thing a second time.
   */
  it("undoes the surface's scale so the name keeps its size", () => {
    render(
      <DesignEditTag label="Banner" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    const chip = screen.getByRole("button", { name: /Banner/ }).querySelector("span")

    expect(chip).not.toBeNull()
    expect(chip!.style.transform).toContain("--design-scale")
  })

  // The chosen block's actions sit where its name was, beside the cover and not inside it.
  it("draws the selection's bar in the chip's place, outside the cover", () => {
    render(
      <DesignEditTag label="Banner" onEdit={vi.fn()} selected nodeId="band-1" bar={<button type="button">Subir Banner</button>}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    const cover = screen.getByRole("button", { name: /Editar.*Banner/ })
    expect(cover).toHaveAttribute("data-design-node", "band-1")
    expect(cover.querySelector("span")).toBeNull()
    expect(cover).not.toContainElement(screen.getByRole("button", { name: "Subir Banner" }))
  })

  it("keeps the bar away while the block is not the chosen one", () => {
    render(
      <DesignEditTag label="Banner" onEdit={vi.fn()} bar={<button type="button">Subir Banner</button>}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    expect(screen.queryByRole("button", { name: "Subir Banner" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DesignEditTag label="Banner" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    await expectNoA11yViolations(container)
  })
})
