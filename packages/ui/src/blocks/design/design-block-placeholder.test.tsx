// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { en } from "../../locales/en"
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignBlockPlaceholder } from "./design-block-placeholder"

describe("DesignBlockPlaceholder", () => {
  it("names the block and what it is still missing", () => {
    render(<DesignBlockPlaceholder kind="BANNER" label="Banner" />)

    expect(screen.getByText("Banner")).toBeInTheDocument()
    expect(screen.getByText("Adicionar a imagem")).toBeInTheDocument()
  })

  it("says the right missing thing for each kind", () => {
    const { unmount } = render(<DesignBlockPlaceholder kind="HEADING" label="Título" />)
    expect(screen.getByText("Escrever o título")).toBeInTheDocument()
    unmount()

    render(<DesignBlockPlaceholder kind="BENEFITS" label="Vantagens" />)
    expect(screen.getByText("Adicionar a primeira vantagem")).toBeInTheDocument()
  })

  /**
   * The cover over the block is the one tab stop, so nothing here may take a second one — two
   * controls for one action is what the row beside it already got wrong.
   */
  it("offers no control of its own", () => {
    const { container } = render(<DesignBlockPlaceholder kind="BANNER" label="Banner" />)

    expect(container.querySelectorAll("button, a, input")).toHaveLength(0)
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<DesignBlockPlaceholder kind="BANNER" label="Banner" messages={en} />)

    expect(screen.getByText("Add the picture")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<DesignBlockPlaceholder kind="BANNER" label="Banner" />)

    await expectNoA11yViolations(container)
  })
})
