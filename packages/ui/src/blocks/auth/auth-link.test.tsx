// React
import type { ComponentProps } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AnchorLink } from "./auth-link"

describe("AnchorLink", () => {
  it("renders a plain anchor pointing where it was told", () => {
    render(<AnchorLink href="/cadastro">Criar conta</AnchorLink>)

    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro")
  })

  it("passes through what a primitive injects, since dropping it loses behaviour", async () => {
    const onClick = vi.fn()
    render(
      <AnchorLink
        href="#"
        aria-current="page"
        data-slot="sidebar-menu-button"
        className="w-full"
        onClick={onClick}
      >
        Painel
      </AnchorLink>,
    )

    const link = screen.getByRole("link", { name: "Painel" })
    expect(link).toHaveAttribute("aria-current", "page")
    expect(link).toHaveAttribute("data-slot", "sidebar-menu-button")
    expect(link).toHaveClass("w-full")

    await userEvent.click(link)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("is the shape a block's linkComponent prop expects, so an app can swap it whole", () => {
    // The app's own link takes the same props; the test proves the two are interchangeable.
    const AppLink = ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
      <a href={href} data-app-link="" {...props} />
    )
    const Link: typeof AnchorLink = AppLink

    render(
      <Link href="/painel" aria-current="page">
        Painel
      </Link>,
    )

    const link = screen.getByRole("link", { name: "Painel" })
    expect(link).toHaveAttribute("data-app-link")
    expect(link).toHaveAttribute("aria-current", "page")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AnchorLink href="/cadastro">Criar conta</AnchorLink>)

    await expectNoA11yViolations(container)
  })
})
