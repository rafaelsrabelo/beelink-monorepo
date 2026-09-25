// React
import { useRef } from "react"

// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Hook
import { scrollToSlide, useSnapIndex } from "./use-snap-index"

function Strip() {
  const ref = useRef<HTMLDivElement>(null)
  const index = useSnapIndex(ref)
  return (
    <div ref={ref} data-testid="strip">
      <output>{index}</output>
    </div>
  )
}

describe("useSnapIndex", () => {
  it("reads 0 until the strip has a width, then the slide it rests on as it scrolls", () => {
    render(<Strip />)
    const strip = screen.getByTestId("strip")
    expect(screen.getByRole("status")).toHaveTextContent("0")

    Object.defineProperty(strip, "clientWidth", { configurable: true, value: 300 })
    strip.scrollLeft = 610
    fireEvent.scroll(strip)

    expect(screen.getByRole("status")).toHaveTextContent("2")
  })
})

describe("scrollToSlide", () => {
  it("moves to a slide, kept within the strip", () => {
    const node = document.createElement("div")
    Object.defineProperty(node, "clientWidth", { configurable: true, value: 300 })

    scrollToSlide(node, 9, 3)
    expect(node.scrollLeft).toBe(600)
    scrollToSlide(node, -2, 3)
    expect(node.scrollLeft).toBe(0)
  })
})
