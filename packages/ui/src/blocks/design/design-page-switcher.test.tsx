// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { samplePages } from "./design-page.fixtures"
import { DesignPageSwitcher } from "./design-page-switcher"

const pages = samplePages.filter((page) => page.status !== "ARCHIVED")

/** In a <header>, where it lives: see AdminStoreMenu's test for why axe needs the landmark. */
function renderSwitcher(overrides: Partial<Parameters<typeof DesignPageSwitcher>[0]> = {}) {
  return render(
    <header>
      <DesignPageSwitcher pages={pages} currentId="lp-1" currentTitle="Lançamento Whey" {...overrides} />
    </header>,
  )
}

describe("DesignPageSwitcher", () => {
  it("names the page being edited on its button", () => {
    renderSwitcher()

    expect(screen.getByRole("button", { name: "Trocar de página — Lançamento Whey" })).toHaveTextContent("Lançamento Whey")
  })

  // Opened, because a Base UI menu that is never opened in a test is a menu nobody has rendered.
  it("lists every page as a link to its editor, marks the current one and says which are not up", async () => {
    renderSwitcher()

    await userEvent.click(screen.getByRole("button", { name: /Trocar de página/ }))

    expect(await screen.findByRole("menuitem", { name: /Página inicial/ })).toHaveAttribute("href", "/admin/mutante/design")
    expect(screen.getByRole("menuitem", { name: /Lançamento Whey/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("menuitem", { name: /Black Friday/ })).toHaveTextContent("Rascunho")
  })

  it("hands every link's click to the screen, which may ask before leaving", async () => {
    const onNavigate = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    renderSwitcher({ onNavigate })

    await userEvent.click(screen.getByRole("button", { name: /Trocar de página/ }))
    await userEvent.click(await screen.findByRole("menuitem", { name: /Black Friday/ }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("offers a new landing only when the screen does", async () => {
    const onCreate = vi.fn()
    const { unmount } = renderSwitcher()
    await userEvent.click(screen.getByRole("button", { name: /Trocar de página/ }))
    expect(screen.queryByRole("menuitem", { name: /Nova landing page/ })).not.toBeInTheDocument()
    unmount()

    renderSwitcher({ onCreate })
    await userEvent.click(screen.getByRole("button", { name: /Trocar de página/ }))
    await userEvent.click(await screen.findByRole("menuitem", { name: /Nova landing page/ }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it("has no accessibility violations, closed and open", async () => {
    const { container } = renderSwitcher()
    await expectNoA11yViolations(container)

    await userEvent.click(screen.getByRole("button", { name: /Trocar de página/ }))
    // The menu's own subtree: the popup is portalled to <body>, where the harness has no landmark.
    await expectNoA11yViolations(await screen.findByRole("menu"))
  })
})
