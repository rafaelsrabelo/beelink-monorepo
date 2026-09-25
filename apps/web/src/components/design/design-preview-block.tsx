"use client"

// React
import type { ReactNode } from "react"

// Types
import type { PublicComponent } from "@harness-monorepo/contracts"

// UI
import { DesignBlockPlaceholder } from "@harness-monorepo/ui/blocks/design/design-block-placeholder"
import { DesignEditTag } from "@harness-monorepo/ui/blocks/design/design-edit-tag"
import { StorefrontShelfSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-shelf-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { isEmptyComponent } from "../storefront/empty-component"
import { labelOf } from "./design-draft"
import type { Shelves } from "./design-draft-preview"

export interface DesignPreviewBlockProps {
  component: PublicComponent
  /** What the shop window draws for it. */
  block: ReactNode
  shelves: Shelves
  categoriesShown: number
  refreshing: boolean
  selected: boolean
  /** The selection's actions, drawn over the block while it is the chosen one. */
  bar?: ReactNode
  /** The key the editor's ↑↓ know it by: its band's when it is alone there. */
  nodeId: string
  onEdit: (componentId: string) => void
  messages: UiMessages
}

/**
 * One block of the shop in the preview, as the way into its fields — and, in its place, what the
 * shop window would draw nothing for: a showcase still loading, a block with nothing in it yet.
 */
export function DesignPreviewBlock({
  component,
  block,
  shelves,
  categoriesShown,
  refreshing,
  selected,
  bar,
  nodeId,
  onEdit,
  messages,
}: DesignPreviewBlockProps) {
  const text = messages.design
  const label = labelOf(component.kind, component.title ?? component.sourceCategory?.name ?? null, messages)
  const unserved = component.kind === "PRODUCTS" && !shelves.has(component.id)
  // No category on the shop window: the block would say the visitor's sentence here.
  const noCategories = component.kind === "CATEGORIES" && categoriesShown === 0
  // The one rule the renderer already answers, asked here so the page can hold a place for a block
  // the shop window would draw nothing for.
  const empty = noCategories || isEmptyComponent(component)

  return (
    <DesignEditTag
      label={label}
      selected={selected}
      {...(bar ? { bar } : {})}
      nodeId={nodeId}
      onEdit={() => onEdit(component.id)}
      messages={messages}
    >
      {refreshing ? (
        <StorefrontShelfSkeleton display={component.display === "GRID" ? "GRID" : "RAIL"} messages={messages} />
      ) : empty ? (
        <DesignBlockPlaceholder
          kind={component.kind}
          label={label}
          {...(unserved ? { action: text.showcaseOnPublish } : {})}
          {...(noCategories ? { action: text.categoriesHiddenAction } : {})}
          messages={messages}
        />
      ) : (
        block
      )}
    </DesignEditTag>
  )
}
