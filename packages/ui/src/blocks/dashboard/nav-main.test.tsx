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

describe("NavMain, nested", () => {
  const nested = [
    { title: "Dashboard", href: "/dashboard" },
    {
      title: "Minhas lojas",
      href: "/admin",
      items: [
        { title: "Padaria da Ana", href: "/admin/padaria-da-ana" },
        { title: "Configurações", href: "/admin/padaria-da-ana/store" },
      ],
    },
  ]

  /**
   * The defect this replaced: the shell appended a shop's pages to the top-level list, so an
   * account item and a shop item sat at the same indent with nothing naming which shop the shop
   * ones belonged to. Nesting is what says "these are inside that".
   */
  it("puts a shop's pages inside the item they belong to", () => {
    renderNav({ items: nested })

    const parent = screen.getByRole("link", { name: "Minhas lojas" })
    const child = screen.getByRole("link", { name: "Configurações" })

    expect(parent.closest("li")).toContainElement(child)
  })

  it("shows the children without anything to open first", () => {
    renderNav({ items: nested })

    expect(screen.getByRole("link", { name: "Padaria da Ana" })).toBeVisible()
    // Nothing collapses: a menu that opens is a menu with state to remember.
    expect(screen.queryByRole("button", { name: /Minhas lojas/ })).not.toBeInTheDocument()
  })

  it("marks the child that is the current page, and not its parent", () => {
    renderNav({ items: nested, activeHref: "/admin/padaria-da-ana/store" })

    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Minhas lojas" })).not.toHaveAttribute("aria-current")
  })

  /**
   * `/admin/<slug>` is a prefix of every page inside that shop, so a blanket prefix rule would
   * mark the overview current on the settings page too. Exact is the default for that reason.
   */
  it("keeps an exact item from claiming the pages beneath it", () => {
    renderNav({ items: nested, activeHref: "/admin/padaria-da-ana/store" })

    expect(screen.getByRole("link", { name: "Padaria da Ana" })).not.toHaveAttribute("aria-current")
  })

  // An item whose page has children of its own — a product list that opens a product — asks for
  // prefix, or an exact rule lights nothing and the aria-current silently stops being written.
  it("lets an item claim its own detail pages when it asks to", () => {
    renderNav({
      items: [{ title: "Produtos", href: "/admin/ana/produtos", match: "prefix" }],
      activeHref: "/admin/ana/produtos/123",
    })

    expect(screen.getByRole("link", { name: "Produtos" })).toHaveAttribute("aria-current", "page")
  })

  it("does not mistake a sibling whose address merely starts the same way", () => {
    renderNav({
      items: [{ title: "Produtos", href: "/admin/ana/produtos", match: "prefix" }],
      activeHref: "/admin/ana/produtos-arquivados",
    })

    expect(screen.getByRole("link", { name: "Produtos" })).not.toHaveAttribute("aria-current")
  })
})
