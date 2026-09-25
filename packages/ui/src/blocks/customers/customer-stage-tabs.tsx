"use client"

// React
import type { ReactNode } from "react"

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CUSTOMER_STAGES, type CustomerStageValue } from "./customer-types"

/** Base UI's tabs need a value for "no stage"; the wire has none, so it never leaves this file. */
const ALL = "ALL"

function stageOf(value: unknown): CustomerStageValue | null {
  return CUSTOMER_STAGES.find((stage) => stage === value) ?? null
}

export interface CustomerStageTabsProps {
  /** Null is "Todos". */
  value: CustomerStageValue | null
  onValueChange: (stage: CustomerStageValue | null) => void
  /** How many match the search in each stage; absent until the first answer, and the tabs say no number. */
  counts?: Readonly<Record<CustomerStageValue, number>>
  /** The list the chosen tab shows. */
  children: ReactNode
  messages?: UiMessages
}

/**
 * Todos · Leads · Clientes · Inativos, each with how many there are. Real tabs, with the list in the
 * one panel the chosen tab controls: a screen reader hears "tab, 2 of 4, selected" and reaches the
 * list through its panel. The choice is the screen's, not this block's — it lives in the address.
 */
export function CustomerStageTabs({ value, onValueChange, counts, children, messages = defaultMessages }: CustomerStageTabsProps) {
  const text = messages.customers
  const current = value ?? ALL
  const tabs: { value: string; label: string; count: number | undefined }[] = [
    { value: ALL, label: text.all, count: counts ? CUSTOMER_STAGES.reduce((sum, stage) => sum + counts[stage], 0) : undefined },
    ...CUSTOMER_STAGES.map((stage) => ({ value: stage, label: text.tabs[stage], count: counts?.[stage] })),
  ]

  return (
    <Tabs value={current} onValueChange={(next: unknown) => onValueChange(stageOf(next))} className="gap-4">
      {/* A phone can be narrower than four tabs with their numbers: the row scrolls rather than
          wraps. The scroll sits on a wrapper whose padding holds the active tab's underline, which
          hangs below the list and an overflow on the list itself would cut off. */}
      <div className="max-w-full overflow-x-auto pb-1.5">
        <TabsList variant="line" aria-label={text.stageFilterLabel}>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-none px-2.5">
              {tab.label}{" "}
              {tab.count === undefined ? null : <span className="text-muted-foreground text-xs tabular-nums">{tab.count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={current} className="flex flex-col gap-4">
        {children}
      </TabsContent>
    </Tabs>
  )
}
