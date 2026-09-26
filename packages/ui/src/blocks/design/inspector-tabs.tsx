"use client"

// React
import type { ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type InspectorTab = "content" | "layout" | "style"

const ORDER: readonly InspectorTab[] = ["content", "layout", "style"]

export interface InspectorTabsProps {
  /** Held by the screen, so the tab survives the column turning into a drawer and back. */
  tab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
  /** What is being edited, for the tabs' name: "Editar {name}". */
  name: string
  /** Absent when a band is chosen on its own: it has no content of its own to write. */
  content?: ReactNode
  /** Absent where a block has nothing to lay out, and when a band is chosen on its own. */
  layout?: ReactNode
  style: ReactNode
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  submitDisabled?: boolean
  /** The tab holding what keeps Salvar off, marked while another one shows. */
  attention?: InspectorTab | null
  messages?: UiMessages
}

/**
 * The chosen block's panel: what it says (Conteúdo), how it sits (Layout) and the band it is in
 * (Estilo), under one Salvar.
 *
 * One form around the three, so the footer is one and Enter in any field saves what Salvar would.
 * The panels stay mounted while another shows: a picture on its way lands in the field that asked
 * for it, and what was typed in one tab is there when the owner comes back to it.
 */
export function InspectorTabs({
  tab,
  onTabChange,
  name,
  content,
  layout,
  style,
  onSubmit,
  onCancel,
  pending = false,
  submitDisabled = false,
  attention = null,
  messages = defaultMessages,
}: InspectorTabsProps) {
  const text = messages.design.inspector
  const banner = messages.banners
  const panels: Record<InspectorTab, ReactNode> = { content, layout, style }
  const tabs = ORDER.filter((key) => panels[key] !== undefined)
  // A tab asked for that this choice does not have — the layout of the strip — shows the first one.
  const shown = tabs.includes(tab) ? tab : (tabs[0] ?? "style")

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {tabs.length > 1 ? (
        <Tabs
          value={shown}
          onValueChange={(next: string) => onTabChange(tabs.find((key) => key === next) ?? shown)}
        >
          <TabsList aria-label={format(text.tabsLabel, { name })} className="w-full">
            {tabs.map((key) => (
              <TabsTrigger key={key} value={key} className="flex-1">
                {text[key]}
                {attention === key && shown !== key ? (
                  <>
                    <span aria-hidden="true" className="bg-destructive size-1.5 rounded-full" />
                    {" "}
                    <span className="sr-only">({text.needsAttention})</span>
                  </>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((key) => (
            <TabsContent key={key} value={key} keepMounted className="flex flex-col gap-4 pt-3">
              {panels[key]}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex flex-col gap-4">{style}</div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {banner.cancel}
        </Button>
        <Button type="submit" disabled={pending || submitDisabled}>
          {pending ? banner.saving : banner.save}
        </Button>
      </div>
    </form>
  )
}
