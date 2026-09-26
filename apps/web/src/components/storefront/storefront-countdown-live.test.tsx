// Libs
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StorefrontCountdownLive } from "./storefront-countdown-live"

const START = Date.parse("2026-09-30T02:58:58.000Z")
const END = "2026-09-30T02:59:00.000Z"

function draw(editing = false) {
  return render(
    <StorefrontCountdownLive layout="BAND" title="A oferta termina em" subtitle={null} endsAt={END} bleed={false} editing={editing} messages={ptBR} />,
  )
}

describe("StorefrontCountdownLive", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(START)
  })

  afterEach(() => vi.useRealTimers())

  it("draws its end as a date first, then ticks the digits down", () => {
    const { container } = draw()
    expect(screen.getByRole("timer")).toHaveTextContent("--")

    act(() => vi.advanceTimersByTime(0))
    expect(container.querySelector("[aria-hidden]")).toHaveTextContent("00dias00horas00min02seg")

    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector("[aria-hidden]")).toHaveTextContent("01seg")
  })

  it("leaves the shop at zero, even from a page served before its end", () => {
    const { container } = draw()

    act(() => vi.advanceTimersByTime(2000))
    expect(container).toBeEmptyDOMElement()
  })

  it("stays drawn in the editor past its end, marked as ended", () => {
    draw(true)

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText("Encerrada")).toBeInTheDocument()
  })
})
