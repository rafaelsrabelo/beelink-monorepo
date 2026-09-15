"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@harness-monorepo/ui/hooks/use-mobile"
import { useReducedMotion } from "@harness-monorepo/ui/hooks/use-reduced-motion"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@harness-monorepo/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@harness-monorepo/ui/components/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harness-monorepo/ui/components/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@harness-monorepo/ui/components/toggle-group"

/** The series names follow the screen's language, so the config is built per render. */
function chartConfigFor(messages: UiMessages): ChartConfig {
  return {
    visitors: { label: messages.dashboard.seriesVisitors },
    desktop: { label: messages.dashboard.seriesDesktop, color: "var(--primary)" },
    mobile: { label: messages.dashboard.seriesMobile, color: "var(--primary)" },
  }
}

export interface ChartPoint {
  /** ISO date, so the axis can order and format it. */
  date: string
  desktop: number
  mobile: number
}

export interface ChartAreaInteractiveProps {
  data: ChartPoint[]
  title?: string
  description?: string
  messages?: UiMessages
}

export function ChartAreaInteractive({
  data,
  title,
  description,
  messages = defaultMessages,
}: ChartAreaInteractiveProps) {
  const text = messages.dashboard
  const chartConfig = chartConfigFor(messages)
  const isMobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  const [selectedRange, setSelectedRange] = React.useState("90d")

  // A phone hides the range toggle, so it always shows the last 7 days. Derived here rather than
  // pushed through an effect, which would render twice on every viewport change.
  const timeRange = isMobile ? "7d" : selectedRange

  // The registry block hardcoded a date in 2024, which silently empties the chart for any other
  // data. The range is measured back from the newest point instead.
  const referenceDate = new Date(data.at(-1)?.date ?? Date.now())

  const filteredData = data.filter((item) => {
    const date = new Date(item.date)
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title ?? text.chartTitle}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {description ?? text.chartDescription}
          </span>
          <span className="@[540px]/card:hidden">{text.chartShortDescription}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setSelectedRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">{text.range90}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{text.range30}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{text.range7}</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder={text.rangePlaceholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                {text.range90}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                {text.range30}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                {text.range7}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("pt-BR", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              isAnimationActive={!reducedMotion}
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              isAnimationActive={!reducedMotion}
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
