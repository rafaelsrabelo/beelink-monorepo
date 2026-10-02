// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingCouriers } from "./landing-couriers"
import { LandingPosters } from "./landing-posters"

const photo = (name: string, alt = "") => <img src={`/${name}.jpg`} alt={alt} />

describe("LandingPosters", () => {
  it("frames both posters it is handed, under its heading", async () => {
    const { container } = render(<LandingPosters busStop={photo("ponto", "Pôster no ponto")} wall={photo("muro", "Pôster no muro")} />)

    expect(screen.getByRole("heading", { level: 2, name: "Sua loja vai mais longe" })).toBeInTheDocument()
    const frames = screen.getAllByRole("listitem")
    expect(frames.map((frame) => frame.querySelector("img")?.getAttribute("src"))).toEqual(["/ponto.jpg", "/muro.jpg"])
    // The image fills the frame: the frame is what is positioned, and what sets the shape.
    expect(frames[0]).toHaveClass("relative", "aspect-3/4", "overflow-hidden")
    await expectNoA11yViolations(container)
  })

  it("titles them in the language it is handed, and carries what each poster says for the app to read out", () => {
    render(<LandingPosters busStop={photo("ponto")} wall={photo("muro")} messages={en} />)

    expect(screen.getByRole("heading", { level: 2, name: "Your shop goes further" })).toBeInTheDocument()
    expect(en.landing.posters.busStopAlt).toMatch(/connected to go further/)
    expect(en.landing.posters.wallAlt).toMatch(/with those who understand it/)
  })
})

describe("LandingCouriers, over a photo", () => {
  it("lays the courier under the section as a picture that says nothing to a reader", async () => {
    const { container } = render(<LandingCouriers photo={photo("moto")} termsHref="/termos" privacyHref="/privacidade" />)

    const picture = container.querySelector("img")
    expect(picture?.closest("[aria-hidden]")).not.toBeNull()
    expect(screen.getByRole("form", { name: "Comece seu cadastro" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("is the black alone without one", () => {
    const { container } = render(<LandingCouriers termsHref="/termos" privacyHref="/privacidade" />)
    expect(container.querySelector("img")).toBeNull()
  })
})
