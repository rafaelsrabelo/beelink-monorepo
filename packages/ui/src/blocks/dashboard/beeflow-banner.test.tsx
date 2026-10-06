// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import type { LinkComponent } from "../auth/auth-link"
import { BeeflowBanner } from "./beeflow-banner"

const HREF = "/admin/lessari/integrations"
const AppLink: LinkComponent = ({ href, ...props }) => <a href={href} data-app-link="" {...props} />
const art = (alt: string) => <img src="/beeflow-banner.jpg" alt={alt} />

describe("BeeflowBanner", () => {
  /** Whoever cannot see the artwork is told what it draws, and then where the link leads. */
  it("is one link to the Integrations page, read out as what the art says and where it leads", async () => {
    const { container } = render(<BeeflowBanner href={HREF} image={art(ptBR.integrations.upcoming.beeflow.banner.alt)} linkComponent={AppLink} />)

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", HREF)
    expect(link).toHaveAttribute("data-app-link")
    expect(link).toHaveAccessibleName(/Beelink no WhatsApp.*atendimento automático\..*Conheça o BeeFlow em Integrações$/)
    expect(screen.queryByRole("button")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("frames the art in its own proportion, so nothing of it is cut and its place is held", () => {
    render(<BeeflowBanner href={HREF} image={art("")} />)

    expect(screen.getByRole("link")).toHaveClass("aspect-[2103/748]", "overflow-hidden", "rounded-xl")
  })

  /**
   * The owner's report: on a wide monitor the banner was most of the screen. The column it fills has
   * no measure, so the frame stops at a height instead, and the art's own edges fill the sides.
   */
  it("stops growing taller on a wide column, its sides drawn from the art's edges and said to nobody", () => {
    const { container } = render(<BeeflowBanner href={HREF} image={art("A arte")} backdrop={art("")} />)

    expect(screen.getByRole("link")).toHaveClass("max-h-80")
    const sides = container.querySelectorAll("[aria-hidden='true']")
    expect(sides).toHaveLength(2)
    expect(sides[0]!.querySelector(".origin-left img")).not.toBeNull()
    expect(sides[1]!.querySelector(".origin-right img")).not.toBeNull()
    expect(screen.getByRole("link")).toHaveAccessibleName(/^A arte/)
  })

  it("speaks the language it is handed", () => {
    render(<BeeflowBanner href={HREF} image={art(en.integrations.upcoming.beeflow.banner.alt)} messages={en} />)

    expect(screen.getByRole("link")).toHaveAccessibleName(/Beelink on WhatsApp.*automatic replies\..*See BeeFlow in Integrations$/)
  })
})
