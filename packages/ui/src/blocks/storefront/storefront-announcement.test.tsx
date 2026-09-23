// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAnnouncement } from "./storefront-announcement"

describe("StorefrontAnnouncement", () => {
  it("says the sentence once to a screen reader, however many copies scroll", () => {
    render(<StorefrontAnnouncement left="Frete grátis" right="acima de R$ 199" />)

    const copies = screen.getAllByText("Frete grátis · acima de R$ 199", { ignore: false })
    expect(copies.length).toBeGreaterThanOrEqual(4)
    expect(copies.length % 2).toBe(0)
    expect(copies.filter((copy) => copy.getAttribute("aria-hidden") !== "true")).toHaveLength(1)
  })

  it("keeps a constant speed: a longer sentence takes proportionally longer", () => {
    const { container: short } = render(<StorefrontAnnouncement left="Oi" />)
    const { container: long } = render(<StorefrontAnnouncement left={"Entrega em todo o Brasil ".repeat(6)} />)

    const durationOf = (root: HTMLElement) =>
      Number(root.querySelector<HTMLElement>(".animate-marquee")!.style.getPropertyValue("--marquee-duration").replace("s", ""))

    // Both tracks cover the same page width, so the time to cross it is the same order of magnitude
    // — what changes with length is the number of copies, not the speed.
    expect(durationOf(short)).toBeGreaterThan(10)
    expect(Math.abs(durationOf(long) - durationOf(short))).toBeLessThan(durationOf(short))
  })

  it("paints itself in its band's colour, with the ink derived from it", () => {
    const dark = sampleColorPresets[5]!.colors.header
    const { container } = render(<StorefrontAnnouncement left="Oi" background={dark} />)

    const strip = container.firstElementChild as HTMLElement
    expect(strip.style.backgroundColor).not.toBe("")
    expect(strip.style.color).toMatch(/oklch/)
  })

  it("falls back to the page's ink when the band has no colour", () => {
    const { container } = render(<StorefrontAnnouncement left="Oi" />)

    expect((container.firstElementChild as HTMLElement).style.backgroundColor).toBe("var(--shop-text)")
  })

  it("is one link, the whole strip, when it leads somewhere — and none when it does not", () => {
    const { rerender } = render(<StorefrontAnnouncement left="Frete grátis" href="/lessari/frete" />)

    const link = screen.getByRole("link", { name: "Frete grátis" })
    expect(link).toHaveAttribute("href", "/lessari/frete")
    expect(link).not.toHaveAttribute("target")

    rerender(<StorefrontAnnouncement left="Frete grátis" href="https://wa.me/55" external />)
    expect(screen.getByRole("link", { name: "Frete grátis" })).toHaveAttribute("target", "_blank")

    rerender(<StorefrontAnnouncement left="Frete grátis" />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("runs the width of the window, not the shop's measure", () => {
    const { container } = render(<StorefrontAnnouncement left="Oi" />)

    expect(container.querySelector("[class*='max-w-']")).toBeNull()
    expect(container.querySelector(".animate-marquee")!.className).not.toContain("paused")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAnnouncement left="Frete grátis" right="acima de R$ 199" />)

    await expectNoA11yViolations(container)
  })
})
