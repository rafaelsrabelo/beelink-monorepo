"use client"

// React
import { useRef, type CSSProperties } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { POPUP_CLOSE, POPUP_TEXT, POPUP_TITLE, StorefrontPopupCard, type PopupCardCode } from "./storefront-popup-card"

export interface StorefrontPopupProps {
  open: boolean
  /** Asked to close — by the "×", Escape or a press outside. The screen decides what closing means. */
  onOpenChange: (open: boolean) => void
  /** The three sentences and the conditions, ready: built by the screen from the API's benefit. */
  title: string
  text: string
  detail?: string | null
  imageUrl?: string | null
  /** A customer's coupon code, with its copy button's words (BEELINK-310); never given for a visitor. */
  code?: PopupCardCode | null
  /** The shop's sign-up carrying the way back, or the cart with the coupon; with no `href`, a button that only tells `onAction`. */
  action: { label: string; href?: string }
  /** The button was pressed. The screen decides what that means — and, with no `href`, it is what closes. */
  onAction?: () => void
  /** The shop's `--shop-*` variables and typeface: the dialog is drawn outside the element that carries them. */
  style?: CSSProperties
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** No animation for whoever asked for none: the dialog and its backdrop are simply there, and then not. */
const STILL = "motion-reduce:animate-none motion-reduce:transition-none motion-reduce:duration-0"

/**
 * A shop's first-purchase pop-up (BEELINK-306): a modal dialog that calls a visitor to open an
 * account. It says what it is handed and collects nothing — its one action is a link to the shop's
 * own sign-up. To a signed-in customer who never ordered (BEELINK-310) it is the same dialog saying
 * their first-order benefit: a coupon's code with a way to copy it and the way to the cart, or — for
 * a promotion, which applies by itself — one button that closes.
 *
 * The primitive's dialog, so the hard parts are the ones already debugged: the focus moves in and
 * stays in, Escape and a press outside close it, the page behind is inert, and closing returns the
 * focus to where it was. It is named by its title and described by its text.
 *
 * The focus lands on the close control and not on the button: a pop-up opens by itself, and an
 * Enter already on its way to the page must close it, never follow a link the visitor did not read.
 *
 * Fixed over the page and never in its flow, so nothing behind it moves; never taller than the
 * screen — it scrolls inside. Wide with a picture, narrow without.
 */
export function StorefrontPopup({ open, onOpenChange, title, text, detail = null, imageUrl = null, code = null, action, onAction, style, linkComponent, messages = defaultMessages }: StorefrontPopupProps) {
  const copy = messages.storefront.popup
  const close = useRef<HTMLButtonElement>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-modal="true"
        initialFocus={close}
        style={style}
        overlayClassName={cn("bg-black/50", STILL)}
        className={cn("block max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-transparent p-0 ring-0", imageUrl ? "sm:max-w-[45rem]" : "sm:max-w-md", STILL)}
      >
        <StorefrontPopupCard
          heading={<DialogTitle className={POPUP_TITLE}>{title}</DialogTitle>}
          body={<DialogDescription className={POPUP_TEXT}>{text}</DialogDescription>}
          detail={detail}
          imageUrl={imageUrl}
          code={code}
          action={action}
          onAction={onAction}
          linkComponent={linkComponent}
          close={
            <DialogClose ref={close} aria-label={copy.close} className={POPUP_CLOSE}>
              <XIcon aria-hidden="true" className="size-5" />
            </DialogClose>
          }
        />
      </DialogContent>
    </Dialog>
  )
}
