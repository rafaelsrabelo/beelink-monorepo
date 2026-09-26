// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAnnouncement } from "./storefront-announcement"

describe("StorefrontAnnouncement", () => {
  it("says the messages once to a screen reader, however many copies scroll on a phone", () => {
    const { container } = render(<StorefrontAnnouncement messages={["Frete grátis", "5% off no Pix"]} />)

    const copies = [...container.querySelectorAll("p")]
    expect(copies.length).toBeGreaterThanOrEqual(4)
    expect(copies.length % 2).toBe(0)
    expect(copies.filter((copy) => copy.getAttribute("aria-hidden") !== "true")).toHaveLength(1)
    // Two messages, two spans: never one sentence with a dot in it.
    expect([...copies[0]!.querySelectorAll("span")].map((span) => span.textContent)).toEqual(["Frete grátis", "5% off no Pix"])
    expect(container.textContent).not.toContain("·")
  })

  it("stands still and centred from the tablet up, and hides the extra copies there", () => {
    const { container } = render(<StorefrontAnnouncement messages={["Frete grátis"]} />)

    expect(container.querySelector(".animate-marquee")).toHaveClass("shop-sm:animate-none", "shop-sm:justify-center")
    expect(container.querySelectorAll("p")[1]).toHaveClass("shop-sm:hidden")
  })

  it("draws nothing when every message is blank", () => {
    const { container } = render(<StorefrontAnnouncement messages={["  ", ""]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("keeps a constant speed on a phone: a longer track takes proportionally longer to cross", () => {
    const { container: short } = render(<StorefrontAnnouncement messages={["Oi"]} />)
    const { container: long } = render(<StorefrontAnnouncement messages={["Entrega em todo o Brasil ".repeat(6)]} />)

    const durationOf = (root: HTMLElement) =>
      Number(root.querySelector<HTMLElement>(".animate-marquee")!.style.getPropertyValue("--marquee-duration").replace("s", ""))

    // The speed is the constant, not the time: a short message is copied until half the track
    // covers a phone, and a long one is its own width, so the long one takes longer — never faster.
    expect(durationOf(short)).toBeGreaterThan(5)
    expect(durationOf(long)).toBeGreaterThan(durationOf(short))
  })

  it("paints itself in its band's colour, with the ink derived from it", () => {
    const dark = sampleColorPresets[5]!.colors.header
    const { container } = render(<StorefrontAnnouncement messages={["Oi"]} background={dark} />)

    const strip = container.firstElementChild as HTMLElement
    expect(strip.style.backgroundColor).not.toBe("")
    expect(strip.style.color).toMatch(/oklch/)
  })

  it("falls back to the page's ink when the band has no colour", () => {
    const { container } = render(<StorefrontAnnouncement messages={["Oi"]} />)

    expect((container.firstElementChild as HTMLElement).style.backgroundColor).toBe("var(--shop-text)")
  })

  it("is one link, the whole strip, when it leads somewhere — and none when it does not", () => {
    const { rerender } = render(<StorefrontAnnouncement messages={["Frete grátis"]} href="/lessari/frete" />)

    const link = screen.getByRole("link", { name: "Frete grátis" })
    expect(link).toHaveAttribute("href", "/lessari/frete")
    expect(link).not.toHaveAttribute("target")

    rerender(<StorefrontAnnouncement messages={["Frete grátis"]} href="https://wa.me/55" external />)
    expect(screen.getByRole("link", { name: "Frete grátis" })).toHaveAttribute("target", "_blank")

    rerender(<StorefrontAnnouncement messages={["Frete grátis"]} />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("runs the width of the window, not the shop's measure", () => {
    const { container } = render(<StorefrontAnnouncement messages={["Oi"]} />)

    expect(container.querySelector("[class*='max-w-']")).toBeNull()
    expect(container.querySelector(".animate-marquee")!.className).not.toContain("paused")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAnnouncement messages={["Frete grátis", "acima de R$ 199"]} />)

    await expectNoA11yViolations(container)
  })

  // The same messages, another motion: "Fixa" never moves and wraps; "Rolando" moves on every width.
  it("holds the messages still and lets them wrap when it is Fixa", () => {
    const { container } = render(<StorefrontAnnouncement messages={["Frete grátis", "Pix com desconto"]} motion="STATIC" />)

    expect(container.querySelector(".animate-marquee")).toBeNull()
    expect(screen.getAllByText("Frete grátis")).toHaveLength(1)
  })

  it("scrolls on every width when it is Rolando", () => {
    const { container } = render(<StorefrontAnnouncement messages={["Frete grátis"]} motion="MARQUEE" />)

    expect(container.querySelector(".animate-marquee")?.className).not.toContain("shop-sm:animate-none")
  })
})
