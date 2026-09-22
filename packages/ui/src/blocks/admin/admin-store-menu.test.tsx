// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminStoreMenu } from "./admin-store-menu"
import { sampleAdminUser, sampleWorkspaces } from "./admin.fixtures"

/**
 * Wrapped in a <header> because that is where the block lives. Without a landmark, axe reports
 * "all page content should be contained by landmarks" the moment the open menu is scanned from the
 * body — a true statement about the harness and nothing at all about this block.
 */
function renderMenu(overrides: Partial<Parameters<typeof AdminStoreMenu>[0]> = {}) {
  return render(
    <header>
      <AdminStoreMenu
        current={sampleWorkspaces[0]}
        workspaces={sampleWorkspaces}
        createHref="/create-store"
        user={sampleAdminUser}
        onSignOut={() => {}}
        {...overrides}
      />
    </header>,
  )
}

describe("AdminStoreMenu", () => {
  it("shows which shop is being worked in, on the trigger", () => {
    renderMenu()

    expect(screen.getByRole("button", { name: "Trocar de loja" })).toHaveTextContent("Lessari")
  })

  it("says so plainly when there is no shop", () => {
    renderMenu({ current: null, workspaces: [] })

    expect(screen.getByRole("button", { name: "Trocar de loja" })).toHaveTextContent("Nenhuma loja")
  })

  /*
    Opened in a test on purpose, and with `findBy` because the menu renders into a portal a tick
    later. Base UI's MenuGroupLabel reads a context only Menu.Group provides and throws the moment
    the menu opens — so a dropdown block that is never opened in a test is a dropdown nobody has
    ever rendered. workspace-switcher.test.tsx learned this first; this is the same guard.
  */
  it("lists every shop as a link, and marks the current one", async () => {
    renderMenu()

    await userEvent.click(screen.getByRole("button", { name: "Trocar de loja" }))

    expect(await screen.findByRole("menuitem", { name: /Doces da Ana/ })).toHaveAttribute(
      "href",
      "/admin/doces-da-ana",
    )
    expect(screen.getByRole("menuitem", { name: /Lessari/ })).toHaveAttribute("href", "/admin/lessari")
  })

  it("carries the account and the way out, which used to live in the sidebar's foot", async () => {
    renderMenu()

    await userEvent.click(screen.getByRole("button", { name: "Trocar de loja" }))

    expect(await screen.findByText(sampleAdminUser.name)).toBeInTheDocument()
    expect(screen.getByText(sampleAdminUser.email)).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Sair" })).toBeInTheDocument()
  })

  it("signs out when asked", async () => {
    const onSignOut = vi.fn()
    renderMenu({ onSignOut })

    await userEvent.click(screen.getByRole("button", { name: "Trocar de loja" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sair" }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("holds the way out while it is already happening", async () => {
    const onSignOut = vi.fn()
    renderMenu({ onSignOut, signingOut: true })

    await userEvent.click(screen.getByRole("button", { name: "Trocar de loja" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sair" }))

    expect(onSignOut).not.toHaveBeenCalled()
  })

  it("speaks the other language", () => {
    renderMenu({ messages: en })

    expect(screen.getByRole("button", { name: "Switch shop" })).toBeInTheDocument()
  })

  it("has no accessibility violations, closed", async () => {
    const { container } = renderMenu()

    await expectNoA11yViolations(container)
  })

  it("has no accessibility violations once the menu is open", async () => {
    renderMenu()

    await userEvent.click(screen.getByRole("button", { name: "Trocar de loja" }))
    const menu = await screen.findByRole("menu")

    /*
      The menu's own subtree, and not the document.

      Base UI portals the popup to <body>, so scanning from there reports "all page content should
      be contained by landmarks" — which is true of a test harness that is one button and a portal,
      and says nothing about this block. What is worth asserting is that the menu itself is sound:
      its items carry their roles, the label is tied to the group, and nothing inside it is
      unreachable.
    */
    await expectNoA11yViolations(menu)
  })
})
