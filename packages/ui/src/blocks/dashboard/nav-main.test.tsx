// React
import type { ComponentProps } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleNavMain } from "./dashboard.fixtures"
import { NavMain } from "./nav-main"

function renderNav(overrides: Partial<Parameters<typeof NavMain>[0]> = {}) {
  return render(
    <SidebarProvider>
      <NavMain items={sampleNavMain} {...overrides} />
    </SidebarProvider>,
  )
}

describe("NavMain", () => {
  it("renders one link per item, each pointing where the screen said", () => {
    renderNav()

    expect(screen.getAllByRole("link")).toHaveLength(sampleNavMain.length)
    expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/dashboard")
    expect(screen.getByRole("link", { name: "Relatórios" })).toHaveAttribute("href", "/relatorios")
    expect(screen.getByRole("link", { name: "Equipe" })).toHaveAttribute("href", "/equipe")
  })

  it("says in words which item is the current page, not only in styling", () => {
    renderNav({ activeHref: "/relatorios" })

    expect(screen.getByRole("link", { name: "Relatórios" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Painel" })).not.toHaveAttribute("aria-current")
  })

  it("claims no current page when nothing matches the address", () => {
    renderNav({ activeHref: "/uma-pagina-que-nao-esta-no-menu" })

    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current")
    }
  })

  it("navigates through the link the app injects, and that link still receives aria-current", () => {
    const AppLink = ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
      <a href={href} data-app-link="" {...props} />
    )
    renderNav({ activeHref: "/dashboard", linkComponent: AppLink })

    const current = screen.getByRole("link", { name: "Painel" })
    expect(current).toHaveAttribute("data-app-link")
    expect(current).toHaveAttribute("aria-current", "page")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderNav({ activeHref: "/dashboard" })

    await expectNoA11yViolations(container)
  })
})
