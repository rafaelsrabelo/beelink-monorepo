// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreSettingsSkeleton } from "./store-settings-skeleton"

describe("StoreSettingsSkeleton", () => {
  it("stands in for the form with the same card, tabs and fields", () => {
    const { container } = render(<StoreSettingsSkeleton />)

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(5)
  })

  it("announces the wait in the screen's language", () => {
    render(<StoreSettingsSkeleton messages={en} />)

    expect(screen.getByRole("status")).toHaveTextContent("Loading the shop data")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StoreSettingsSkeleton />)

    await expectNoA11yViolations(container)
  })
})
