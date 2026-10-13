"use client"

// React
import { useRef, useState, type CSSProperties } from "react"

// UI
import { LandingCourierForm } from "@harness-monorepo/ui/blocks/landing/landing-courier-form"
import { LandingLegalDialog } from "@harness-monorepo/ui/blocks/landing/landing-legal-dialog"
import type { LandingLegalValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { CourierApplicationPayload, CourierCity } from "@harness-monorepo/contracts"

// App
import { courierProblemOf, type CourierApplicationCopy } from "./courier-application-copy"
import { useSiteTrack } from "@/components/site-analytics/use-site-track"
import { useSendCourierApplication } from "@/services/couriers/courier-application-hooks"
import { useLegalText } from "@/services/legal/legal-text-hooks"

export interface LandingCourierFormLiveProps {
  termsHref: string
  privacyHref: string
  /**
   * The form's own sentences, and only them: what a Client Component is handed is written into the
   * page. Its cities are held to the contract's here — the design system restates the type and
   * cannot import it — so a city the API opens with no label in the dictionary does not compile.
   */
  text: UiMessages["landing"]["couriers"]["form"] & { cities: Record<CourierCity, string> }
  /** The refusals a person can meet, already sentences — the page picks them from the dictionary. */
  copy: CourierApplicationCopy
  /** The brand's typeface, for the dialog: it is drawn outside the element of the page that carries it. */
  dialogClassName?: string
  dialogStyle?: CSSProperties
}

/**
 * The landing's courier form, sending for real (BEELINK-322), and the dialog its two legal texts
 * are read in.
 *
 * The blocks draw; this owns the send and the texts' loading, because a design-system block may not
 * reach the network. An application the API took is told as a lead to whoever measures the page
 * (`useSiteTrack`) — the event's name and nothing of the form: no field of it is ever handed to
 * `track`. On a page nobody measures, or for a visitor who gave no yes, that tells no one.
 *
 * A legal text is asked for when its link is pressed and not before, and is read over the form:
 * nothing navigates, so nothing typed is lost. The link that opened the dialog is kept, and gets the
 * focus back when it closes.
 */
export function LandingCourierFormLive({ termsHref, privacyHref, text, copy, dialogClassName, dialogStyle }: LandingCourierFormLiveProps) {
  const application = useSendCourierApplication()
  const track = useSiteTrack()
  // Which text, apart from whether it is open: the dialog keeps its name while it closes.
  const [reading, setReading] = useState<{ document: LandingLegalValue; open: boolean }>({ document: "terms", open: false })
  const opener = useRef<HTMLElement | null>(null)
  const legal = useLegalText(reading.document, reading.open)

  return (
    <>
      <LandingCourierForm
        termsHref={termsHref}
        privacyHref={privacyHref}
        text={text}
        status={application.isSuccess ? "sent" : application.isPending ? "sending" : "idle"}
        problem={courierProblemOf(application.error, copy)}
        // `satisfies`: what the form hands over is the wire's own shape, field for field — the API refuses a body with one more.
        onSubmit={(values) => application.mutate(values satisfies CourierApplicationPayload, { onSuccess: () => track({ name: "generate_lead" }) })}
        // Only a problem is taken back by typing: a send on its way is left to arrive.
        onEdit={() => {
          if (application.isError) application.reset()
        }}
        onAgain={application.reset}
        onRead={(document, link) => {
          opener.current = link
          setReading({ document, open: true })
        }}
      />
      <LandingLegalDialog
        open={reading.open}
        onOpenChange={(open) => setReading((last) => ({ ...last, open }))}
        title={text.legal.titles[reading.document]}
        content={legal.data ?? null}
        failed={legal.isError}
        onRetry={() => void legal.refetch()}
        href={reading.document === "terms" ? termsHref : privacyHref}
        returnFocus={opener}
        text={text.legal}
        className={dialogClassName}
        style={dialogStyle}
      />
    </>
  )
}
