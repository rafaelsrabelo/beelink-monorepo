"use client"

// React
import type { ReactNode } from "react"

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AFFILIATE_STATUS_VALUES, type AffiliateStatusValue } from "@harness-monorepo/ui/lib/affiliates"

/** Base UI's tabs need a value for "every standing"; the wire has none, so it never leaves this file. */
const ALL = "ALL"

function statusOf(value: unknown): AffiliateStatusValue | null {
  return AFFILIATE_STATUS_VALUES.find((status) => status === value) ?? null
}

export interface AffiliateStatusTabsProps {
  /** Null is "Todos". */
  value: AffiliateStatusValue | null
  onValueChange: (status: AffiliateStatusValue | null) => void
  /** The list the chosen tab shows. */
  children: ReactNode
  messages?: UiMessages
}

/**
 * Todos · Convidados · Ativos · Pausados · Encerrados (IMPULSEIA-104). Real tabs, with the list in the
 * panel the chosen one controls; the choice lives in the screen's address, not here.
 */
export function AffiliateStatusTabs({ value, onValueChange, children, messages = defaultMessages }: AffiliateStatusTabsProps) {
  const text = messages.affiliates.list
  const current = value ?? ALL
  const tabs = [{ value: ALL, label: text.all }, ...AFFILIATE_STATUS_VALUES.map((status) => ({ value: status, label: text.tabs[status] }))]

  return (
    <Tabs value={current} onValueChange={(next: unknown) => onValueChange(statusOf(next))} className="gap-4">
      {/* The row scrolls, with no bar drawn, where five tabs do not fit; the padding holds the underline an overflow would cut. */}
      <div className="max-w-full overflow-x-auto pb-1.5 [scrollbar-width:none]">
        <TabsList variant="line" aria-label={text.filterLabel}>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-2 text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={current}>{children}</TabsContent>
    </Tabs>
  )
}
