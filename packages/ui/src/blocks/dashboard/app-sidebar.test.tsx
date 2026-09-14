// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AppSidebar } from "./app-sidebar"
import { sampleNavMain, sampleUser } from "./dashboard.fixtures"

function renderSidebar(props: Partial<Parameters<typeof AppSidebar>[0]> = {}) {
  return render(
    <SidebarProvider>
      <AppSidebar user={sampleUser} onSignOut={vi.fn()} navMain={sampleNavMain} {...props} />
    </SidebarProvider>,
  )
}

describe("AppSidebar", () => {
  it("shows who is signed in", () => {
    renderSidebar()

    expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ana@exemplo.com").length).toBeGreaterThan(0)
  })

  it("falls back to initials when there is no picture", () => {
    renderSidebar()

    expect(screen.getAllByText("AS").length).toBeGreaterThan(0)
  })

  it("signs out through the callback the app passes", async () => {
    const onSignOut = vi.fn()
    renderSidebar({ onSignOut })

    await userEvent.click(screen.getByRole("button", { name: /Ana Souza/ }))
    await userEvent.click(await screen.findByText("Sair"))

    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it("marks the current page for a screen reader", () => {
    renderSidebar({ activeHref: "/dashboard" })

    expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Relatórios" })).not.toHaveAttribute("aria-current")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSidebar()

    await expectNoA11yViolations(container)
  })
})
