// React
import type { ComponentProps } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleNavSecondary } from "./dashboard.fixtures"
import { NavSecondary } from "./nav-secondary"

function renderNav(overrides: Partial<Parameters<typeof NavSecondary>[0]> = {}) {
  return render(
    <SidebarProvider>
      <NavSecondary items={sampleNavSecondary} {...overrides} />
    </SidebarProvider>,
  )
}

describe("NavSecondary", () => {
  it("renders one link per item, each pointing where the screen said", () => {
    renderNav()

    expect(screen.getAllByRole("link")).toHaveLength(sampleNavSecondary.length)
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/configuracoes",
    )
    expect(screen.getByRole("link", { name: "Ajuda" })).toHaveAttribute("href", "/ajuda")
  })

  it("marks no item as the current page — these sit beside the panel, not inside it", () => {
    renderNav()

    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current")
    }
  })

  it("passes the group's own props down, which is how the shell pushes it to the foot", () => {
    // The class lands on the group element itself; dropping the spread would lose the layout
    // silently, since every link would still render in the right place.
    const { container } = renderNav({ className: "mt-auto" })

    expect(container.querySelector("[data-slot=sidebar-group]")).toHaveClass("mt-auto")
  })

  it("navigates through the link the app injects, not one of its own", () => {
    const AppLink = ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
      <a href={href} data-app-link="" {...props} />
    )
    renderNav({ linkComponent: AppLink })

    expect(screen.getByRole("link", { name: "Ajuda" })).toHaveAttribute("data-app-link")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderNav()

    await expectNoA11yViolations(container)
  })
})
