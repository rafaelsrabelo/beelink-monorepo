// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleUser } from "./dashboard.fixtures"
import { NavUser } from "./nav-user"

function renderNavUser(overrides: Partial<Parameters<typeof NavUser>[0]> = {}) {
  const onSignOut = vi.fn()
  const result = render(
    <SidebarProvider>
      <NavUser user={sampleUser} onSignOut={onSignOut} {...overrides} />
    </SidebarProvider>,
  )
  return { ...result, onSignOut }
}

describe("NavUser", () => {
  it("shows who is signed in", () => {
    renderNavUser()

    expect(screen.getByRole("button", { name: /Ana Souza/ })).toHaveTextContent("ana@exemplo.com")
  })

  it("falls back to two initials when there is no picture", () => {
    renderNavUser()

    expect(screen.getByText("AS")).toBeInTheDocument()
  })

  it("takes the initials from the first and last names, not the first two", () => {
    renderNavUser({ user: { name: "Maria Aparecida do Nascimento Silva", email: "m@exemplo.com" } })

    expect(screen.getByText("MS")).toBeInTheDocument()
  })

  it("signs out through the callback the app passes", async () => {
    const { onSignOut } = renderNavUser()

    await userEvent.click(screen.getByRole("button", { name: /Ana Souza/ }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sair" }))

    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it("says it is working and refuses a second sign-out", async () => {
    const { onSignOut } = renderNavUser({ signingOut: true })

    await userEvent.click(screen.getByRole("button", { name: /Ana Souza/ }))
    const item = await screen.findByRole("menuitem", { name: "Saindo…" })

    expect(item).toHaveAttribute("aria-disabled", "true")
    expect(onSignOut).not.toHaveBeenCalled()
  })

  it("renders in English when the screen hands it the English dictionary", async () => {
    renderNavUser({ messages: en })

    await userEvent.click(screen.getByRole("button", { name: /Ana Souza/ }))

    expect(await screen.findByRole("menuitem", { name: "Sign out" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderNavUser()

    await expectNoA11yViolations(container)
  })
})
