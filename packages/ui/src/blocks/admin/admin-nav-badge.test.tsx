// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminNavBadge, navBadgeText } from "./admin-nav-badge"

const badgeOf = (container: HTMLElement) => container.querySelector('[data-slot="nav-badge"]')

describe("AdminNavBadge", () => {
  it.each([0, -1, Number.NaN])("draws nothing at %s: a badge is the presence of something", (count) => {
    const { container } = render(<AdminNavBadge count={count} />)

    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    [1, "1"],
    [9, "9"],
    [10, "10"],
    [99, "99"],
    [100, "99+"],
    [4321, "99+"],
  ])("writes %i as %s", (count, text) => {
    const { container } = render(<AdminNavBadge count={count} />)

    expect(badgeOf(container)).toHaveTextContent(text)
    expect(navBadgeText(count)).toBe(text)
  })

  // The item's own name says the number in words; read twice, or as a bare digit, it is noise.
  it("is hidden from a screen reader, and is no live region", () => {
    const { container } = render(<AdminNavBadge count={3} />)

    expect(badgeOf(container)).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelector("[aria-live], [role=status], [role=alert]")).toBeNull()
  })

  // jsdom lays nothing out, so what is asserted is the contract the layout rests on: a box whose
  // height and least width are fixed, in digits that all take the same room.
  it("keeps one box for one digit and for three characters", () => {
    const one = badgeOf(render(<AdminNavBadge count={1} />).container)
    const many = badgeOf(render(<AdminNavBadge count={100} />).container)

    expect(one?.className).toBe(many?.className)
    expect(one).toHaveClass("h-[18px]", "min-w-[18px]", "shrink-0", "tabular-nums")
  })

  it("stays when the rail collapses, on the icon's corner and only above lg", () => {
    const { container } = render(<AdminNavBadge count={12} collapsed />)

    expect(badgeOf(container)).toHaveTextContent("12")
    expect(badgeOf(container)).toHaveClass("lg:absolute")
    expect(badgeOf(container)?.className).not.toMatch(/(^|\s)(lg:)?hidden(\s|$)/)
    // Below `lg` the rail is a drawer with its names showing: the badge stays in the row.
    expect(badgeOf(container)).not.toHaveClass("absolute")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AdminNavBadge count={3} />)

    await expectNoA11yViolations(container)
  })
})
