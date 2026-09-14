// Types
import type { ChartPoint } from "@harness-monorepo/ui/blocks/dashboard/chart-area-interactive"

/**
 * Made-up traffic, so the starter's dashboard has something to draw. A real product swaps this for
 * a service call; the block itself only ever sees the array.
 */
export const sampleChartData: ChartPoint[] = Array.from({ length: 90 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 3, 1 + index))

  return {
    date: date.toISOString().slice(0, 10),
    desktop: 180 + ((index * 37) % 320),
    mobile: 120 + ((index * 53) % 260),
  }
})
