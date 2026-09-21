// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SiteHeader } from "./site-header"

describe("SiteHeader", () => {
  it("names the page as its only first-level heading", () => {
    render(
      <SidebarProvider>
        <SiteHeader title="Minhas lojas" />
      </SidebarProvider>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Minhas lojas" })).toBeInTheDocument()
  })

  it("renders what the screen put on the right, and nothing when there is nothing", () => {
    const { rerender } = render(
      <SidebarProvider>
        <SiteHeader title="Minhas lojas" />
      </SidebarProvider>,
    )
    expect(screen.queryByRole("button", { name: "Criar loja" })).not.toBeInTheDocument()

    rerender(
      <SidebarProvider>
        <SiteHeader title="Minhas lojas" actions={<button type="button">Criar loja</button>} />
      </SidebarProvider>,
    )
    expect(screen.getByRole("button", { name: "Criar loja" })).toBeInTheDocument()
  })

  it("opens and closes the shell's sidebar, which is the only state it touches", async () => {
    const onOpenChange = vi.fn()
    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <SiteHeader title="Minhas lojas" />
      </SidebarProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SidebarProvider>
        <SiteHeader title="Minhas lojas" actions={<button type="button">Criar loja</button>} />
      </SidebarProvider>,
    )

    await expectNoA11yViolations(container)
  })
})
