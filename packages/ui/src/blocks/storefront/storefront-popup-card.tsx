// React
import type { ReactNode } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** The title's and the text's look, for whoever supplies the elements: a dialog's own title and description, or plain ones in a preview. */
export const POPUP_TITLE = "text-2xl leading-tight font-extrabold tracking-tight text-balance break-words @xl:text-3xl"
export const POPUP_TEXT = "text-base leading-snug break-words text-shop-on-primary"

/** The close control's look: a solid disc in the page's own colours, readable over the panel and over a photograph alike. 44px to press. */
export const POPUP_CLOSE =
  "absolute end-2 top-2 z-10 flex size-11 items-center justify-center rounded-full bg-shop-background text-shop-on-background shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-on-primary"

const ACTION =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-shop-line bg-shop-background px-6 py-2 text-center text-base font-bold tracking-wide text-shop-on-background uppercase hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-on-primary"

export interface StorefrontPopupCardProps {
  /** The title's element, wearing `POPUP_TITLE`. */
  heading: ReactNode
  /** The text's element, wearing `POPUP_TEXT`. */
  body: ReactNode
  /** The benefit's own conditions, as the screen built them from the API's numbers; null or absent with none. */
  detail?: string | null
  /** The picture beside the call; null or absent draws the coloured panel alone. Decorative: the call is in the words. */
  imageUrl?: string | null
  /** Where the button leads: the shop's sign-up, carrying the way back. */
  action: { label: string; href: string }
  onAction?: () => void
  /** The close control, first in the card so it is the first thing reached. Absent in a preview, which draws its shape alone. */
  close?: ReactNode
  /**
   * Draws the card with nothing to operate: the button is its shape, with no link behind it, and the
   * close is a mark. For the panel's preview — the words stay readable to anyone, and nothing in it
   * takes the focus or leads away.
   */
  preview?: boolean
  linkComponent?: LinkComponent
  className?: string
}

/**
 * A shop's first-purchase pop-up, as a card (BEELINK-306): a picture on one side and the call on the
 * other — a coloured panel in the shop's own primary — or the panel alone when the shop gave no
 * picture. The dialog around it is `StorefrontPopup`; the panel's preview draws this alone.
 *
 * It stacks by the room it is given and not by the screen's (`@container`): the dialog is as wide
 * as a phone on a phone, and the panel's preview is as wide as a phone inside a wide screen — one
 * rule draws both, so the preview cannot disagree with the shop window.
 *
 * The picture is a 3:2 band on top when stacked and the left half when side by side, cropped from
 * its centre either way. Its frame is reserved before the file arrives: nothing moves when it does.
 */
export function StorefrontPopupCard({ heading, body, detail = null, imageUrl = null, action, onAction, close, preview = false, linkComponent: Link = AnchorLink, className }: StorefrontPopupCardProps) {
  return (
    <div className={cn("@container w-full", className)}>
      <div className={cn("relative grid overflow-hidden rounded-2xl bg-shop-primary text-shop-on-primary", imageUrl ? "@xl:grid-cols-2" : null)}>
        {preview ? (
          <span aria-hidden="true" className={POPUP_CLOSE}>
            <XIcon className="size-5" />
          </span>
        ) : (
          close
        )}
        {imageUrl ? (
          <div className="relative aspect-[3/2] bg-shop-fill @xl:aspect-auto @xl:min-h-[26rem]">
            <img src={imageUrl} alt="" decoding="async" className="absolute inset-0 size-full object-cover" />
          </div>
        ) : null}
        <div className={cn("flex flex-col justify-center gap-4 p-6 pt-14 text-center @xl:p-10", imageUrl ? "@xl:pt-14" : "@xl:pt-16")}>
          {heading}
          {body}
          {detail ? <p className="text-sm leading-snug break-words">{detail}</p> : null}
          {preview ? (
            <span className={cn(ACTION, "mt-2")}>{action.label}</span>
          ) : (
            <Link href={action.href} onClick={onAction} className={cn(ACTION, "mt-2")}>
              {action.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
