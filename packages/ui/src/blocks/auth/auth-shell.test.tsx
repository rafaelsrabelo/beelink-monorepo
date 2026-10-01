// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AuthShell } from "./auth-shell"

describe("AuthShell", () => {
  it("puts Beelink's mark over the screen, leading back to the landing page", () => {
    render(
      <AuthShell>
        <h1>Entrar</h1>
      </AuthShell>,
    )

    const home = screen.getByRole("link", { name: "Beelink, início" })
    expect(home).toHaveAttribute("href", "/")
    expect(home).toHaveTextContent("Beelink")
    expect(home.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument()
  })

  it("stands on the brand's ground in the light theme, and on the panel's in the dark one", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)

    expect(container.firstElementChild).toHaveClass("bg-brand-ground", "dark:bg-muted")
  })

  it("wears the brand's typeface on the name only: the forms stay in the panel's", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)

    expect((screen.getByRole("link") as HTMLElement).style.fontFamily).toBe("var(--font-brand, inherit)")
    expect((container.firstElementChild as HTMLElement).style.fontFamily).toBe("")
  })

  it("names the way home in the language it is handed, and goes where it is told", () => {
    render(
      <AuthShell homeHref="/inicio" messages={en}>
        content
      </AuthShell>,
    )

    expect(screen.getByRole("link", { name: en.landing.homeLabel })).toHaveAttribute("href", "/inicio")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AuthShell>
        <main>
          <h1>Entrar</h1>
        </main>
      </AuthShell>,
    )

    await expectNoA11yViolations(container)
  })
})
