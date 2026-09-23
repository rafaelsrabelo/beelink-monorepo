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

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DesignEditTag label="Banner" onEdit={vi.fn()}>
        <p>bloco</p>
      </DesignEditTag>,
    )

    await expectNoA11yViolations(container)
  })
})
