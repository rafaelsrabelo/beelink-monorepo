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

  it("speaks the language it is handed", () => {
    render(<BeeflowBanner href={HREF} image={art(en.integrations.upcoming.beeflow.banner.alt)} messages={en} />)

    expect(screen.getByRole("link")).toHaveAccessibleName(/Beelink on WhatsApp.*automatic replies\..*See BeeFlow in Integrations$/)
  })
})
