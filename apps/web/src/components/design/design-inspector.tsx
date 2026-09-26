"use client"

// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"
import type { InspectorTab } from "@harness-monorepo/ui/blocks/design/inspector-tabs"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// App
import { ComponentEditor } from "./component-editor"
import { heldLayoutOf, layoutOf, type HeldLayout } from "./component-layout"
import type { SectionDraft } from "./design-draft"
import type { Shelves } from "./design-draft-preview"
import { editedOf, type SelectionTarget } from "./design-selection"

export interface DesignInspectorProps {
  slug: string
  /** What is chosen, or null while nothing is. */
  target: SelectionTarget | null
  /** The draft, which holds each block's layout until Publicar. */
  rows: readonly SectionDraft[]
  saved: readonly Section[]
  tab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
  /** A change from the Layout tab, as the draft holds it. */
  onLayoutChange: (componentId: string, patch: Partial<Omit<HeldLayout, "kind">>) => void
  pageBackground: string
  categoriesShown: number
  shelves: Shelves
  onClose: () => void
  /** Whether the panel's heading takes the focus as it opens: not when the editor's keys chose. */
  takeFocus?: boolean
  onSaved: (component: StoreComponent) => void
  messages: UiMessages
  web: WebMessages
}

/** The editor's right-hand column: the chosen block's or band's panel, or how to choose one. */
export function DesignInspector({ target, rows, saved, shelves, onLayoutChange, messages, ...props }: DesignInspectorProps) {
  const edited = editedOf(target)
  const section = edited ? saved.find((row) => row.id === edited.sectionId) : undefined
  const component = edited?.componentId ? (section?.components.find((row) => row.id === edited.componentId) ?? null) : null
  const drafted = edited?.componentId ? rows.flatMap((row) => row.components).find((row) => row.id === edited.componentId) : undefined

  // A block the server no longer has — deleted from another tab — is not an invitation to edit its band.
  if (!edited || !section || (edited.componentId && !component)) {
    return <p className="text-muted-foreground p-2 text-sm">{messages.design.frame.inspectorEmpty}</p>
  }

  return (
    <ComponentEditor
      key={`${section.id}:${component?.id ?? ""}`}
      section={section}
      position={rows.findIndex((row) => row.id === section.id) + 1}
      component={component}
      layout={drafted ? layoutOf(drafted) : null}
      onLayoutChange={(next) => (component ? onLayoutChange(component.id, heldLayoutOf(next)) : undefined)}
      {...(component && shelves.has(component.id) ? { shelf: shelves.get(component.id)!.items } : {})}
      {...(target ? { nodeId: target.id } : {})}
      messages={messages}
      {...props}
    />
  )
}
