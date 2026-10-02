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
    expect(home.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument()
  })

  it("stands on the brand's ground in the light theme, and on the panel's in the dark one", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)

    expect(container.firstElementChild).toHaveClass("bg-brand-ground", "dark:bg-muted")
  })

  /** The logo is a picture of the name: the link says it once, and the forms keep the panel's typeface. */
  it("draws the official logo, named by the link around it", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)

    expect(screen.getByRole("link").querySelector("svg")).toHaveAttribute("viewBox", "0 0 1938 542")
    expect((container.firstElementChild as HTMLElement).style.fontFamily).toBe("")
  })

  it("puts a photo beside the form on a wide screen, as a picture that says nothing to a reader", () => {
    const photo = { src: "/foto-1024.webp", srcSet: "/foto-640.webp 640w, /foto-1024.webp 1024w", width: 1024, height: 1536 }
    const { container } = render(<AuthShell photo={photo}>conteúdo</AuthShell>)

    const picture = container.querySelector("img")
    expect(picture).toHaveAttribute("alt", "")
    expect(picture).toHaveAttribute("srcset", photo.srcSet)
    // Hidden on a phone: a lazy picture that is never shown is never downloaded.
    expect(picture).toHaveAttribute("loading", "lazy")
    expect(picture?.parentElement).toHaveClass("hidden", "lg:block")
  })

  it("is the form alone when no photo is handed", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)
    expect(container.querySelector("img")).toBeNull()
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
