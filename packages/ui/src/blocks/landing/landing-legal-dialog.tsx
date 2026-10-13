"use client"

// React
import type { CSSProperties, RefObject } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LegalDocument, type LegalDocumentContent } from "../legal/legal-document"
import { LANDING_CTA, LANDING_FOCUS_RING } from "./landing-styles"

export interface LandingLegalDialogProps {
  open: boolean
  /** Asked to close — by the "×", Escape or a press outside. */
  onOpenChange: (open: boolean) => void
  /** The text's name while the text itself is on its way: the dialog is never without one. */
  title: string
  /** The text, once it arrived; null until then. It is fetched when the dialog opens, never before. */
  content: LegalDocumentContent | null
  /** The text did not arrive. */
  failed?: boolean
  onRetry?: () => void
  /** The page the same text stands on, for when it will not load here. */
  href: string
  /** Where the focus goes back to once closed: the link that opened it. */
  returnFocus?: RefObject<HTMLElement | null>
  text: UiMessages["landing"]["couriers"]["form"]["legal"]
  /** The brand's typeface, which the page hands over: the dialog is drawn outside the element that carries it. */
  className?: string
  style?: CSSProperties
}

/** No animation for whoever asked for none: the dialog and its backdrop are simply there, and then not. */
const STILL = "motion-reduce:animate-none motion-reduce:transition-none motion-reduce:duration-0"

/** The widths of a text's first lines, standing in for it: a heading, then a paragraph that ends short. */
const WAITING = ["w-2/5", "w-full", "w-full", "w-11/12", "w-3/5", "w-1/3", "w-full", "w-full", "w-4/5"]

/**
 * Bee-link's terms of use or its privacy policy, read over the landing (BEELINK-322): the courier's
 * form asks for both to be accepted, and a page of its own would take the person away from a form
 * half filled in. Nothing behind it moves or is lost — it is a dialog, not a navigation.
 *
 * The primitive's dialog, so the hard parts are the ones already debugged: the focus moves in and
 * stays in, Escape and a press outside close it, the page behind is inert, and closing returns the
 * focus — here to the link that opened it, which the screen names.
 *
 * The text is the same data the two pages draw, by the same block. It arrives after the dialog
 * opens, so the dialog has three faces: lines standing in for the text, the text, and — when it did
 * not come — a sentence, a way to ask again and the way to the page. Named by the text's title, and
 * described by the day it took effect once that is known. The text binds in its own language: its
 * title and its day are written in it and say so, whatever language the page is read in.
 *
 * Never taller than the screen: the title stays, and the text scrolls under it. The scrolling part
 * is a stop of the keyboard's own, so the keys that scroll a page scroll it.
 */
export function LandingLegalDialog({ open, onOpenChange, title, content, failed = false, onRetry, href, returnFocus, text, className, style }: LandingLegalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-modal="true"
        finalFocus={returnFocus}
        style={{ fontFamily: "var(--font-brand, inherit)", ...style }}
        overlayClassName={cn("bg-brand-ink/60", STILL)}
        className={cn(LANDING_FOCUS_RING, "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl bg-brand-ground p-0 text-base text-brand-ink ring-0 sm:max-w-2xl", STILL, className)}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b-[1.5px] border-brand-line px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-1">
            <DialogTitle lang={content?.lang} className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">
              {content?.title ?? title}
            </DialogTitle>
            {content ? (
              <DialogDescription lang={content.lang} className="text-sm text-brand-muted">
                {content.effective}
              </DialogDescription>
            ) : null}
          </div>
          <DialogClose aria-label={text.close} className="-mt-1 -mr-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-brand-sand">
            <XIcon aria-hidden="true" className="size-5" />
          </DialogClose>
        </header>

        <div tabIndex={0} aria-busy={!content && !failed ? true : undefined} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 focus-visible:-outline-offset-2 sm:px-8">
          {content ? (
            <LegalDocument content={content} headless className="max-w-none text-brand-ink" />
          ) : failed ? (
            <div role="alert" className="flex flex-col items-start gap-4">
              <p className="font-semibold">{text.failed}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button type="button" onClick={onRetry} className={cn(LANDING_CTA, "h-11 cursor-pointer bg-brand-ink px-6 text-[15px] font-bold text-brand-on-ink")}>
                  {text.retry}
                </button>
                {/* A new tab: this one holds a form the person has started. */}
                <a href={href} target="_blank" rel="noreferrer" className="text-[15px] font-bold underline">
                  {text.openPage}
                </a>
              </div>
            </div>
          ) : (
            <div aria-hidden="true" className="flex flex-col gap-3">
              {WAITING.map((width, line) => (
                <Skeleton key={line} className={cn("h-4 bg-brand-sand", width, line % 5 === 0 && "mt-3 h-5 first:mt-0")} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
