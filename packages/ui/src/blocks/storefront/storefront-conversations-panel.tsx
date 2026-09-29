"use client"

// React
import type { CSSProperties, ReactNode } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@harness-monorepo/ui/components/sheet"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useShopPalette } from "./shop-palette-context"

export interface StorefrontConversationsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** The shop's typeface, which a portal leaves behind with the window: the web names it. */
  className?: string
  style?: CSSProperties
  messages?: UiMessages
}

/**
 * The conversations' panel: from the right on a computer, the whole screen on a phone. Portaled out
 * of the window, so the shop's palette comes along. Base UI closes it on Esc and gives focus back.
 */
export function StorefrontConversationsPanel({ open, onOpenChange, children, className, style, messages = defaultMessages }: StorefrontConversationsPanelProps) {
  const text = messages.storefront
  const palette = useShopPalette()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{ ...palette, ...style }}
        className={cn("gap-0 bg-shop-background text-shop-on-background data-[side=right]:w-full data-[side=right]:sm:max-w-md", className)}
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-shop-line px-4 py-3">
          <SheetTitle className="text-lg font-extrabold text-shop-on-background">{text.conversationsTitle}</SheetTitle>
          <SheetClose render={<button type="button" aria-label={text.conversationsClose} className="rounded-md p-1.5 text-shop-muted hover:bg-shop-fill" />}>
            <XIcon aria-hidden="true" className="size-5" />
          </SheetClose>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
