// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TablePager } from "./table-pager"

function renderPager(overrides: Partial<Parameters<typeof TablePager>[0]> = {}) {
  return render(
    <TablePager page={2} pageSize={20} total={137} onPageChange={() => {}} {...overrides} />,
  )
}

describe("TablePager", () => {
  it("says the range and the total, which is the question the reader actually has", () => {
    renderPager()

    expect(screen.getByText("21–40 de 137")).toBeInTheDocument()
  })

  it("does not round the last page up past the total", () => {
    renderPager({ page: 7 })

    expect(screen.getByText("121–137 de 137")).toBeInTheDocument()
  })

  /** Furniture that asks to be clicked and then does nothing is worse than no furniture. */
  it("draws nothing when everything fits on one page", () => {
    const { container } = renderPager({ total: 12 })

    expect(container).toBeEmptyDOMElement()
  })

  it("closes the two ends, so neither button walks off the list", async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()

    const first = renderPager({ page: 1, onPageChange })
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Próxima" }))
    expect(onPageChange).toHaveBeenCalledWith(2)
    first.unmount()

    renderPager({ page: 7, onPageChange })
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled()
  })

  /** A second click while a page is in flight would skip one. */
  it("goes quiet in both directions while a page is loading", () => {
    renderPager({ busy: true })

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderPager()

    await expectNoA11yViolations(container)
  })
})
