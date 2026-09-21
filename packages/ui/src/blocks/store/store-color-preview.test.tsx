// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreColorPreview } from "./store-color-preview"
import { sampleStoreColors } from "./store.fixtures"

describe("StoreColorPreview", () => {
  it("applies the shop's colours as custom properties, holding none itself", () => {
    render(<StoreColorPreview colors={sampleStoreColors} />)

    const preview = screen.getByRole("img", { name: "Prévia das cores" })
    expect(preview.style.getPropertyValue("--store-background")).toBe(sampleStoreColors.background)
    expect(preview.style.getPropertyValue("--store-primary")).toBe(sampleStoreColors.primary)
    expect(preview.style.getPropertyValue("--store-text")).toBe(sampleStoreColors.text)
    expect(preview.style.getPropertyValue("--store-header")).toBe(sampleStoreColors.header)
  })

  it("names itself a preview in the screen's language", () => {
    render(<StoreColorPreview colors={sampleStoreColors} messages={en} />)

    expect(screen.getByRole("img", { name: "Colour preview" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StoreColorPreview colors={sampleStoreColors} />)

    await expectNoA11yViolations(container)
  })
})
