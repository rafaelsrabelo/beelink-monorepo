// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ChartAreaInteractive } from "./chart-area-interactive"
import { sampleChartData } from "./dashboard.fixtures"

/**
 * Recharts draws only once it has been measured, and the shared setup's ResizeObserver never
 * reports a size — jsdom has no layout. This one answers with a viewport, so the axis and the
 * areas exist to assert on; without it the chart renders an empty frame and every test passes
 * for the wrong reason.
 */
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        this.callback(
          [{ contentRect: { width: 640, height: 250 } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe("ChartAreaInteractive", () => {
  it("names itself from the screen's dictionary, and steps aside when the screen has its own words", () => {
    const { rerender } = render(<ChartAreaInteractive data={sampleChartData} />)
    expect(screen.getByText("Visitantes")).toBeInTheDocument()
    expect(screen.getByText("Total dos últimos 3 meses")).toBeInTheDocument()

    rerender(
      <ChartAreaInteractive
        data={sampleChartData}
        title="Pedidos"
        description="Total dos últimos 3 meses na sua loja"
      />,
    )
    expect(screen.getByText("Pedidos")).toBeInTheDocument()
    expect(screen.getByText("Total dos últimos 3 meses na sua loja")).toBeInTheDocument()
  })

  it("opens on the widest range", () => {
    render(<ChartAreaInteractive data={sampleChartData} />)

    expect(screen.getByRole("button", { name: "3 meses" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "7 dias" })).toHaveAttribute("aria-pressed", "false")
  })

  it("measures the range back from the newest point, not from today", () => {
    // The fixture ends months before any day this test runs. Counting back from the clock would
    // leave the chart empty — which is what the registry block did with a date hardcoded in 2024.
    render(<ChartAreaInteractive data={sampleChartData} />)

    // An axis tick is a <text> wrapping a <tspan>, so the label matches twice.
    expect(screen.getAllByText("4 de abr.").length).toBeGreaterThan(0)
    expect(screen.getAllByText("28 de jun.").length).toBeGreaterThan(0)
  })

  it("narrows the window to the last days when a shorter range is picked", async () => {
    render(<ChartAreaInteractive data={sampleChartData} />)

    await userEvent.click(screen.getByRole("button", { name: "7 dias" }))

    expect(screen.getByRole("button", { name: "7 dias" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getAllByText("21 de jun.").length).toBeGreaterThan(0)
    expect(screen.queryAllByText("4 de abr.")).toHaveLength(0)
  })

  it("draws nothing when there is nothing to draw, and still says why", () => {
    const { container } = render(
      <ChartAreaInteractive data={[]} description="Ainda não há dados para este período" />,
    )

    expect(screen.getByText("Ainda não há dados para este período")).toBeInTheDocument()
    expect(container.querySelector(".recharts-area")).toBeNull()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<ChartAreaInteractive data={sampleChartData} messages={en} />)

    expect(screen.getByText("Visitors")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ChartAreaInteractive data={sampleChartData} />)

    await expectNoA11yViolations(container)
  })
})
