"use client"

// React
import { useState } from "react"

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
  pending?: boolean
  /** Why it was not cancelled, already a sentence; shown inside the dialog. */
  error?: string | null
  messages?: UiMessages
}

/**
 * "Cancelar pedido" on an order the shop has not accepted yet, behind a confirmation: it takes the
 * order out of the shop's queue and cannot be undone. The button on the card, the dialog over the page.
 */
export function StorefrontOrderCancel({ number, onConfirm, pending = false, error, messages = defaultMessages }: StorefrontOrderCancelProps) {
  const text = messages.storefront
  const [open, setOpen] = useState(false)
  // Portaled out of the window, so the shop's variables have to come along.
  const palette = useShopPalette()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center rounded-full border border-shop-line-strong bg-shop-background px-4 text-sm font-semibold text-shop-on-background hover:bg-shop-fill"
      >
        {text.orderCancel}
      </button>

      <Dialog open={open} onOpenChange={(next: boolean) => !pending && setOpen(next)}>
        <DialogContent closeLabel={text.orderCancelClose} style={palette}>
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {text.orderCancelKeep}
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending} aria-busy={pending || undefined}>
              {pending ? text.orderCancelling : text.orderCancelConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
