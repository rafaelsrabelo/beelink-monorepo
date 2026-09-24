// UI
import { EmptyStateNotice } from "@harness-monorepo/ui/blocks/design/empty-state-notice"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { EmptyState } from "./empty-state"

export interface EmptyStateNoteProps {
  state: EmptyState
  slug: string
  messages: UiMessages
}

/** An empty block's cause in the owner's words, and the panel screen where it is fixed. */
export function EmptyStateNote({ state, slug, messages }: EmptyStateNoteProps) {
  const text = messages.design.emptyStates
  const admin = `/admin/${encodeURIComponent(slug)}`

  switch (state.kind) {
    case "categoriesUnlinked":
      return (
        <EmptyStateNotice
          title={text.categoriesUnlinked.title}
          body={
            state.count === 1
              ? text.categoriesUnlinked.bodyOne
              : format(text.categoriesUnlinked.body, { count: String(state.count) })
          }
          // Where a product is given its category.
          action={{ label: text.categoriesUnlinked.action, href: `${admin}/products` }}
          messages={messages}
        />
      )
    case "categoriesNone":
      return (
        <EmptyStateNotice
          title={text.categoriesNone.title}
          body={text.categoriesNone.body}
          action={{ label: text.categoriesNone.action, href: `${admin}/categories` }}
          messages={messages}
        />
      )
    case "productsNone":
      return (
        <EmptyStateNotice
          title={text.productsNone.title}
          body={text.productsNone.body}
          action={{ label: text.productsNone.action, href: `${admin}/products/new` }}
          messages={messages}
        />
      )
    case "sourceEmpty":
      // The fix is the source field right below it, in this same sheet.
      return <EmptyStateNotice title={text.sourceEmpty.title} body={text.sourceEmpty.body} messages={messages} />
  }
}
