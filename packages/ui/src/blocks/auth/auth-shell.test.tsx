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

  /** The logo leads home, but not everyone takes a logo for a link: the way back is also said in words, before the form. */
  it("says the way back to the landing in words, over the form, in the language it is handed", () => {
    const { unmount } = render(<AuthShell>conteúdo</AuthShell>)

    const back = screen.getByRole("link", { name: "Voltar para o site" })
    expect(back).toHaveAttribute("href", "/")
    expect(back.compareDocumentPosition(screen.getByRole("link", { name: "Beelink, início" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    unmount()

    render(
      <AuthShell homeHref="/inicio" messages={en}>
        content
      </AuthShell>,
    )
    expect(screen.getByRole("link", { name: "Back to the site" })).toHaveAttribute("href", "/inicio")
  })

  it("stands on the brand's ground in the light theme, and on the panel's in the dark one", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)

    expect(container.firstElementChild).toHaveClass("bg-brand-ground", "dark:bg-muted")
  })

  /** The logo is a picture of the name: the link says it once, and the forms keep the panel's typeface. */
  it("draws the official logo, named by the link around it", () => {
    const { container } = render(<AuthShell>conteúdo</AuthShell>)

    expect(screen.getByRole("link", { name: "Beelink, início" }).querySelector("svg")).toHaveAttribute("viewBox", "0 0 1938 542")
    expect((container.firstElementChild as HTMLElement).style.fontFamily).toBe("")
  })

  it("puts the photo it is handed beside the form, on a wide screen only", () => {
    render(<AuthShell photos={[<img key="foto" src="/foto.jpg" alt="" />]}>conteúdo</AuthShell>)

    const panel = document.querySelector("img")?.parentElement?.parentElement
    expect(panel).toHaveClass("hidden", "lg:block", "sticky")
    // The image fills its parent: that box has to be positioned, and a sticky one is not.
    expect(document.querySelector("img")?.parentElement).toHaveClass("relative", "size-full")
    // One photo is a picture: nothing to pass, and no dots.
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("passes two or more as a carousel, named and with a dot for each, in the language it is handed", () => {
    const photos = [<img key="muro" src="/muro.jpg" alt="" />, <img key="moto" src="/moto.jpg" alt="" />]
    const { unmount } = render(<AuthShell photos={photos}>conteúdo</AuthShell>)

    const carousel = screen.getByRole("region", { name: "Fotos da Beelink" })
    expect(carousel.closest(".sticky")).toHaveClass("hidden", "lg:block")
    expect(carousel.querySelectorAll("img")).toHaveLength(2)
    expect(screen.getAllByRole("button").map((dot) => dot.getAttribute("aria-label"))).toEqual(["Foto 1 de 2", "Foto 2 de 2"])
    unmount()

    render(
      <AuthShell photos={photos} messages={en}>
        content
      </AuthShell>,
    )
    expect(screen.getByRole("region", { name: en.landing.auth.label })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Photo 2 of 2" })).toBeInTheDocument()
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
