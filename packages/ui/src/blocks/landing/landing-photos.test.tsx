// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingCouriers } from "./landing-couriers"
import { LandingPicture } from "./landing-picture"
import { LandingPosters } from "./landing-posters"

const photo = (name: string) => ({ src: `/${name}-1024.webp`, srcSet: `/${name}-640.webp 640w, /${name}-1024.webp 1024w`, width: 1024, height: 1536 })

describe("LandingPicture", () => {
  it("offers every width there is a file for, holds its place, and waits to be near the screen", () => {
    render(<LandingPicture photo={photo("moto")} alt="Entregador" sizes="100vw" />)

    const picture = screen.getByRole("img", { name: "Entregador" })
    expect(picture).toHaveAttribute("srcset", "/moto-640.webp 640w, /moto-1024.webp 1024w")
    expect(picture).toHaveAttribute("sizes", "100vw")
    expect(picture).toHaveAttribute("width", "1024")
    expect(picture).toHaveAttribute("height", "1536")
    expect(picture).toHaveAttribute("loading", "lazy")
  })
})

describe("LandingPosters", () => {
  it("shows both posters, each read out by what it says", async () => {
    const { container } = render(<LandingPosters busStop={photo("ponto")} wall={photo("muro")} />)

    expect(screen.getByRole("heading", { level: 2, name: "Sua loja vai mais longe" })).toBeInTheDocument()
    const posters = screen.getAllByRole("img")
    expect(posters.map((poster) => poster.getAttribute("src"))).toEqual(["/ponto-1024.webp", "/muro-1024.webp"])
    expect(posters[0]).toHaveAccessibleName(/Seu e-commerce conectado para ir mais longe/)
    expect(posters[1]).toHaveAccessibleName(/com quem entende/)
    await expectNoA11yViolations(container)
  })

  it("says them in the language it is handed", () => {
    render(<LandingPosters busStop={photo("ponto")} wall={photo("muro")} messages={en} />)

    expect(screen.getByRole("heading", { level: 2, name: "Your shop goes further" })).toBeInTheDocument()
    expect(screen.getAllByRole("img")[0]).toHaveAccessibleName(en.landing.posters.busStopAlt)
  })
})

describe("LandingCouriers, over a photo", () => {
  it("lays the courier under the section as a picture that says nothing to a reader", async () => {
    const { container } = render(<LandingCouriers photo={photo("moto")} termsHref="/termos" privacyHref="/privacidade" />)

    const picture = container.querySelector("img")
    expect(picture).toHaveAttribute("alt", "")
    expect(picture?.closest("[aria-hidden]")).not.toBeNull()
    expect(screen.getByRole("form", { name: "Comece seu cadastro" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("is the black alone without one", () => {
    const { container } = render(<LandingCouriers termsHref="/termos" privacyHref="/privacidade" />)
    expect(container.querySelector("img")).toBeNull()
  })
})
