// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminSidebar } from "./admin-sidebar"
import { sampleAdminFooterNav, sampleAdminNav } from "./admin.fixtures"

function renderSidebar(overrides: Partial<Parameters<typeof AdminSidebar>[0]> = {}) {
  return render(
    <AdminSidebar items={sampleAdminNav} footerItems={sampleAdminFooterNav} {...overrides} />,
  )
}

describe("AdminSidebar", () => {
  it("renders one link per item, pointing where the screen said", () => {
    renderSidebar()

    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute(
      "href",
      "/admin/lessari/orders",
    )
  })

  it("keeps the footer items in the same rail, at its foot", () => {
    renderSidebar()

    expect(screen.getByRole("link", { name: "Configurações da loja" })).toBeInTheDocument()
  })

  // /admin/<slug> is a prefix of every page in that shop, so a blanket prefix rule lights it on all
  // of them. Exact by default is what stops the shop's home claiming the products page.
  it("does not light the shop's home while a page inside it is open", () => {
    renderSidebar({ activeHref: "/admin/lessari/products" })

    expect(screen.getByRole("link", { name: "Produtos" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current")
  })

  it("lights a section from a page below it, when the item asks for prefix", () => {
    renderSidebar({ activeHref: "/admin/lessari/products/novo" })

    expect(screen.getByRole("link", { name: "Produtos" })).toHaveAttribute("aria-current", "page")
  })

  it("stops being links when there is no shop to point at", () => {
    renderSidebar({
      items: sampleAdminNav.map((item) => ({ ...item, disabled: true })),
      footerItems: [],
    })

    expect(screen.queryAllByRole("link")).toHaveLength(0)
    expect(screen.getByRole("button", { name: "Início" })).toHaveAttribute("aria-disabled", "true")
  })

  it("closes the drawer when a destination is chosen", async () => {
    const onClose = vi.fn()
    renderSidebar({ open: true, onClose })

    await userEvent.click(screen.getByRole("link", { name: "Pedidos" }))

    expect(onClose).toHaveBeenCalled()
  })

  it("names the rail, so it is not one unlabelled navigation among others", () => {
    renderSidebar({ messages: en })

    expect(screen.getByRole("complementary", { name: "Shop navigation" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSidebar({ activeHref: "/admin/lessari" })

    await expectNoA11yViolations(container)
  })
})
