"use client"

// Libs
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductRowActionsProps {
  /** The product's name, which each control is named by. */
  name: string
  /** A draft has no page on the shop window, which is what the eye says when it does nothing. */
  draft: boolean
  /** The product's own page on the shop window; null when it has none, or the shop is not read yet. */
  viewHref: string | null
  onEdit: () => void
  onDelete: () => void
  /** The row is being deleted: its buttons go quiet rather than take a second click. */
  busy?: boolean
  messages?: UiMessages
}

/** What a shopkeeper does to a row of the products' list: see it on the shop window, edit it, delete it. */
export function ProductRowActions({ name, draft, viewHref, onEdit, onDelete, busy = false, messages = defaultMessages }: ProductRowActionsProps) {
  const text = messages.catalog.products

  return (
    <div className="flex items-center justify-end gap-1">
      {/*
        An anchor, not a button calling `window.open`. This navigates, so it belongs in the tab
        order as a link, opens on a middle click and offers "copy address" on a right click — none
        of which a button does. It opens elsewhere because the shop window is elsewhere: a
        shopkeeper checking a page wants their list still behind it.
      */}
      {viewHref ? (
        <a href={viewHref} target="_blank" rel="noreferrer" aria-label={`${text.view}: ${name}`} className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <EyeIcon aria-hidden="true" className="size-4" />
        </a>
      ) : (
        // Kept in place rather than left out: a column that loses a control on some rows moves the
        // two beside it, and the name says why this one does nothing.
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          // The reason comes from the row, not from the missing address. A published product whose
          // shop has not loaded yet also has no href, and announcing it as a draft tells a screen
          // reader the one thing about it that is false.
          aria-label={`${draft ? text.viewDraft : text.view}: ${name}`}
        >
          <EyeIcon aria-hidden="true" className="size-4" />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" aria-label={`${text.edit}: ${name}`} onClick={onEdit} disabled={busy}>
        <PencilIcon aria-hidden="true" className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={`${text.delete}: ${name}`} onClick={onDelete} disabled={busy}>
        <Trash2Icon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}
