"use client"

// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// App
import { ComponentEditor } from "./component-editor"
import type { Shelves } from "./design-draft-preview"

export interface DesignInspectorProps {
  slug: string
  /** The block whose fields are open, or null while none is chosen. */
  editing: StoreComponent | null
  saved: readonly Section[]
  pageBackground: string
  categoriesShown: number
  shelves: Shelves
  onClose: () => void
  onSaved: (component: StoreComponent) => void
  messages: UiMessages
  web: WebMessages
}

/** The editor's right-hand column: the chosen block's fields, or how to choose one. */
export function DesignInspector({ slug, editing, saved, shelves, messages, ...props }: DesignInspectorProps) {
  if (!editing) return <p className="text-muted-foreground p-2 text-sm">{messages.design.frame.inspectorEmpty}</p>

  return (
    <ComponentEditor
      slug={slug}
      component={editing}
      bandBackground={saved.find((section) => section.id === editing.sectionId)?.background ?? null}
      shelfEmpty={shelves.get(editing.id)?.items.length === 0}
      messages={messages}
      {...props}
    />
  )
}
