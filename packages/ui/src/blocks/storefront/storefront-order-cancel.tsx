"use client"

// React
import { useRef, useState } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useShopPalette } from "./shop-palette-context"

export interface StorefrontOrderCancelProps {
  number: number
  onConfirm: () => void
  /** The request is in flight: the dialog holds and neither of its buttons answers. */
  pending?: boolean
  /**
   * The cancel went through and the page is being read again. The dialog goes, and focus moves to
   * the order around the button — an `article` that takes focus, as the card is — since the redraw
   * takes the button away with it.
   */
  done?: boolean
  /** Why it was not cancelled, already a sentence. The dialog holds it until the shopper closes it. */
  error?: string | null
  /** The dialog was closed with the order kept, by any of its ways out. */
  onClose?: () => void
  /** Where focus lands once the cancel went through, when the screen has a better place than the order around the button. */
  landingFocus?: () => HTMLElement | null
  messages?: UiMessages
}

/**
 * "Cancelar pedido" on an order the shop has not accepted yet, behind a confirmation: it takes the
 * order out of the shop's queue and cannot be undone. The button on the card, the dialog over the page.
 */
export function StorefrontOrderCancel({
  number,
  onConfirm,
  pending = false,
  done = false,
  error,
  onClose,
  landingFocus,
  messages = defaultMessages,
}: StorefrontOrderCancelProps) {
  const text = messages.storefront
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  // Portaled out of the window, so the shop's variables have to come along.
  const palette = useShopPalette()
  const busy = pending || done

  function change(next: boolean) {
    if (busy) return
    setOpen(next)
    if (!next) onClose?.()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        disabled={done}
        className="flex h-10 items-center rounded-full border border-shop-line-strong bg-shop-background px-4 text-sm font-semibold text-shop-on-background hover:bg-shop-fill disabled:opacity-60"
      >
        {text.orderCancel}
      </button>

      <Dialog open={open && !done} onOpenChange={change}>
        <DialogContent closeLabel={text.orderCancelClose} style={palette} finalFocus={() => (done ? (landingFocus?.() ?? trigger.current?.closest("article") ?? null) : null)}>
          <DialogHeader>
            <DialogTitle>{format(text.orderCancelTitle, { number: String(number) })}</DialogTitle>
            <DialogDescription>{text.orderCancelBody}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => change(false)} disabled={busy}>
              {text.orderCancelKeep}
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
              {busy ? text.orderCancelling : text.orderCancelConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
