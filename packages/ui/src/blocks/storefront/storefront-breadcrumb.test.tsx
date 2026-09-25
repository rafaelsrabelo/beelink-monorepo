// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontBreadcrumb } from "./storefront-breadcrumb"

const items = [
  { label: "Todos os produtos", href: "/lessari/produtos" },
  { label: "Proteínas", href: "/lessari/proteinas" },
  { label: "Whey Protein Concentrado 900g" },
]

function renderTrail(overrides: Partial<Parameters<typeof StorefrontBreadcrumb>[0]> = {}) {
  return render(<StorefrontBreadcrumb items={items} homeHref="/lessari" {...overrides} />)
}

describe("StorefrontBreadcrumb", () => {
  /** Someone who arrived from Google or WhatsApp has no history; the trail is the only "where". */
  it("counts from the shop's front door, which the screen never has to pass in", () => {
    renderTrail()

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/lessari")
  })

  it("links every step except the one you are standing on", () => {
    renderTrail()

    expect(screen.getByRole("link", { name: "Proteínas" })).toHaveAttribute("href", "/lessari/proteinas")
    expect(screen.queryByRole("link", { name: /Whey Protein/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Whey Protein/)).toHaveAttribute("aria-current", "page")
  })

  it("keeps the order, because the order is the meaning", () => {
    const { container } = renderTrail()

    const labels = [...container.querySelectorAll("li")].map((item) => item.textContent?.replace("›", "").trim())
    expect(labels).toEqual(["Início", "Todos os produtos", "Proteínas", "Whey Protein Concentrado 900g"])
  })

  // The separator is furniture: drawn as the design draws it, and never read out between steps.
  it("draws a › between steps that a screen reader never hears", () => {
    const { container } = renderTrail()

    const separators = [...container.querySelectorAll("[aria-hidden='true']")]
    expect(separators.map((node) => node.textContent)).toEqual(["›", "›", "›"])
    expect(screen.getByRole("navigation", { name: "Você está em" })).toBeInTheDocument()
  })

  it("renders nothing on a page that is the front door itself", () => {
    const { container } = renderTrail({ items: [] })

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderTrail()

    await expectNoA11yViolations(container)
  })
})
