// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { StorefrontRelatedSkeleton } from "./storefront-related-skeleton"

describe("StorefrontRelatedSkeleton", () => {
  it("holds the rail's shape — a title and six cards — hidden from a reader", () => {
    const { container } = render(<StorefrontRelatedSkeleton />)

    const frame = container.firstElementChild as HTMLElement
    expect(frame).toHaveAttribute("aria-hidden", "true")
    expect(frame).toHaveClass("border-t", "py-7")
    expect(frame.querySelectorAll(".h-\\[180px\\]")).toHaveLength(6)
  })
})
