// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// UI
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher"

const workspaces: WorkspaceOption[] = [
  { slug: "lessari", name: "Lessari", logoUrl: null, href: "/admin/lessari" },
  { slug: "bewave-store", name: "Bewave Store", logoUrl: null, href: "/admin/bewave-store" },
]

function renderSwitcher(overrides: Partial<Parameters<typeof WorkspaceSwitcher>[0]> = {}) {
  return render(
    <SidebarProvider>
      <WorkspaceSwitcher
        current={workspaces[0]}
        workspaces={workspaces}
        createHref="/create-store"
        {...overrides}
      />
    </SidebarProvider>,
  )
}

describe("WorkspaceSwitcher", () => {
  it("says which shop is being worked in, before anything is opened", () => {
    renderSwitcher()

    expect(screen.getByText("Lessari")).toBeInTheDocument()
  })

  /**
   * The bug this test exists for: the group label renders as Base UI's `Menu.GroupLabel`, which
   * reads the group's context. Outside a group it throws the moment the menu opens — and a block
   * that is never opened in a test is a block whose menu nobody has ever rendered.
   */
  it("opens without throwing, and names the list", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole("button", { name: "Trocar de loja" }))

    expect(await screen.findByRole("menu")).toBeInTheDocument()
    // The group label, which is the part that used to throw: it reads the group's context.
    expect(screen.getByText("Trocar de loja")).toBeInTheDocument()
  })

  /**
   * Switching is a link and not a handler: the scope lives in the URL, which is what makes a panel
   * page bookmarkable and lets two tabs hold two different shops.
   */
  it("switches by navigating, so the address is the scope", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole("button", { name: "Trocar de loja" }))

    expect(await screen.findByRole("menuitem", { name: /Bewave Store/ })).toHaveAttribute(
      "href",
      "/admin/bewave-store",
    )
  })

  /**
   * The shop you are in stays listed, marked. A list that drops it makes a three-shop switcher
   * show two, and you count to work out which one you are in.
   */
  it("keeps the current shop in the list, marked", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole("button", { name: "Trocar de loja" }))

    expect(await screen.findByRole("menuitem", { name: /Lessari/ })).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  /**
   * The list is the change. A second control leading back to a screen that offers the same list is
   * a step that shows you a link to where you were already going.
   */
  it("offers no way to switch other than the list itself", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole("button", { name: "Trocar de loja" }))

    // The shops, and the way to make another. Nothing else — in particular nothing that leads back
    // to a screen offering the same list.
    expect(await screen.findAllByRole("menuitem")).toHaveLength(3)
    expect(screen.queryByRole("menuitem", { name: /Trocar de loja/ })).not.toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Nova loja" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderSwitcher()

    await expectNoA11yViolations(container)
  })
})
