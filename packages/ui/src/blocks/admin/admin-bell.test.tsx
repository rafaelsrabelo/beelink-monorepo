// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminBell } from "./admin-bell"

describe("AdminBell", () => {
  it("says only that there are notifications when none are unread", () => {
    render(<AdminBell />)

    expect(screen.getByRole("button", { name: "Notificações" })).toBeInTheDocument()
  })

  // The dot carries no meaning to a screen reader, so the count has to be in the name.
  it("puts the count in the accessible name, not only in the dot", () => {
    render(<AdminBell unread={3} />)

    expect(screen.getByRole("button", { name: "Notificações (3 não lidas)" })).toBeInTheDocument()
  })

  it("has a sentence of its own for one, which the plural would get wrong", () => {
    render(<AdminBell unread={1} />)

    expect(screen.getByRole("button", { name: "Notificações (1 não lida)" })).toBeInTheDocument()
  })

  it("tells the screen it was pressed", async () => {
    const onClick = vi.fn()
    render(<AdminBell onClick={onClick} />)

    await userEvent.click(screen.getByRole("button"))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("speaks the other language", () => {
    render(<AdminBell unread={3} messages={en} />)

    expect(screen.getByRole("button", { name: "Notifications (3 unread)" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AdminBell unread={2} />)

    await expectNoA11yViolations(container)
  })
})
