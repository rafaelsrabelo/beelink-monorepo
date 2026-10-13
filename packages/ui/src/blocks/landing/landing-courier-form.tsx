"use client"

// React
import { useEffect, useId, useMemo, useRef } from "react"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { LandingCourierFieldValue, LandingLegalValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LandingCourierConsent } from "./landing-courier-consent"
import { LandingCourierField } from "./landing-courier-field"
import { maskCpf, maskMobile } from "./landing-courier-masks"
import { createCourierSchema, missingCourierFields, type LandingCourierValues } from "./landing-courier-schema"
import { LandingCourierSent } from "./landing-courier-sent"
import { LandingCourierVehicles } from "./landing-courier-vehicles"
import { LANDING_COURIER_CARD, LANDING_CTA, LANDING_FIELDS, LANDING_FOCUS_ON_GROUND } from "./landing-styles"

/** What the last send met, in a sentence the screen made: this block never sees an `errorCode`. */
export interface LandingCourierProblem {
  /** The field the API refused; null when the trouble is no field's — too many sends, or a failure. */
  field: LandingCourierFieldValue | null
  message: string
  /** A failure may pass by itself, so the same form is offered again; a refusal and the limit are not. */
  retry?: boolean
}

export interface LandingCourierFormProps {
  termsHref: string
  privacyHref: string
  /**
   * The form's own sentences, and only them. This is a Client Component: what it is handed is
   * written into the page for the browser to read back, and the whole dictionary would be.
   */
  text: UiMessages["landing"]["couriers"]["form"]
  /**
   * Where the send is. `sent` puts the confirmation where the form stood, so it cannot go twice;
   * `already` puts there that the CPF is on the list — nothing was kept, and there is nothing to fix.
   */
  status?: "idle" | "sending" | "sent" | "already"
  problem?: LandingCourierProblem | null
  /** A form with nothing left to fix. The screen owns the send: this block reaches no network. */
  onSubmit: (application: LandingCourierValues) => void
  /** The form was typed in again: what was said of the last send is not about it any more. */
  onEdit?: () => void
  /** "Enviar outro cadastro", once one was taken or found on the list. */
  onAgain?: () => void
  /** A plain click on one of the two legal links, when the screen reads them over the form; without it they lead to their pages. */
  onRead?: (document: LandingLegalValue, link: HTMLElement) => void
  /** What the form starts with. Nothing, on the page; a story and a test start it filled in. */
  initial?: Partial<LandingCourierValues>
}

/**
 * The first step of a courier's sign-up (BEELINK-329): a name, a CPF, a WhatsApp and how the person
 * delivers, which puts them on the list of those who asked to deliver with Beelink. It asks for no
 * e-mail and no city: the e-mail and the documents are a step still to come, which the line under
 * the button says, and the one city open is the section's to name and the sender's to add.
 *
 * **The button is locked until nothing is missing**, by the same check that writes the sentence
 * under it — the two cannot disagree — and that sentence is the button's description. A field shows
 * its own refusal only once the person left it. Unlocking is said once, in the status line; the list
 * of what is missing is not read out at every key.
 *
 * Until the script arrives the page holds a locked button and a form whose `method` sends nothing:
 * a form's default is a GET that writes the name, the CPF and the phone into the address.
 *
 * Native controls dressed in the brand's tokens, and not the design system's primitives: those draw
 * nothing before their script, and wear the panel's tokens.
 */
export function LandingCourierForm({ termsHref, privacyHref, text, status = "idle", problem = null, onSubmit, onEdit, onAgain, onRead, initial }: LandingCourierFormProps) {
  const id = useId()
  const schema = useMemo(() => createCourierSchema(text), [text])
  const empty = { name: "", document: "", whatsapp: "", vehicle: "MOTORCYCLE", acceptedTerms: false, website: "" } satisfies LandingCourierValues
  const form = useForm<LandingCourierValues>({ resolver: zodResolver(schema), mode: "onTouched", defaultValues: { ...empty, ...initial } })
  const missing = missingCourierFields(schema, useWatch({ control: form.control }))
  const locked = missing.length > 0
  const sending = status === "sending"
  // Nothing left to send: the confirmation stands where the form did, saying which of the two it was.
  const closed = status === "sent" || status === "already"
  const confirmation = status === "already" ? text.already : text.sent
  const errors = form.formState.errors
  const refusalOf = (field: LandingCourierFieldValue) => errors[field]?.message ?? (problem?.field === field ? problem.message : undefined)
  // Set by "Enviar outro cadastro": the form that comes back takes the focus the button had.
  const returning = useRef(false)

  // The API refused a field the browser had let through: the person is taken to it.
  useEffect(() => {
    if (problem?.field) form.setFocus(problem.field)
  }, [problem?.field, problem?.message, form])

  useEffect(() => {
    if (closed || !returning.current) return
    returning.current = false
    form.setFocus("name")
  }, [closed, form])

  return (
    <>
      {closed ? (
        <LandingCourierSent
          text={confirmation}
          onAgain={() => {
            // The next one is another person's: nothing of the last is left in the fields.
            form.reset(empty)
            returning.current = true
            onAgain?.()
          }}
        />
      ) : (
        <form noValidate method="dialog" aria-labelledby={`${id}-title`} onSubmit={form.handleSubmit(onSubmit)} onChange={() => onEdit?.()} className={cn(LANDING_FOCUS_ON_GROUND, LANDING_COURIER_CARD)}>
          <h3 id={`${id}-title`} className="text-lg leading-tight font-extrabold tracking-[-0.01em] lg:text-xl">
            {text.title}
          </h3>

          <div className={LANDING_FIELDS}>
            <LandingCourierField id={`${id}-name`} label={text.name} refusal={refusalOf("name")} autoComplete="name" placeholder={text.namePlaceholder} {...form.register("name")} />
            <LandingCourierField id={`${id}-document`} label={text.document} refusal={refusalOf("document")} mask={maskCpf} inputMode="numeric" autoComplete="off" placeholder={text.documentPlaceholder} {...form.register("document")} />
            <LandingCourierField id={`${id}-whatsapp`} label={text.whatsapp} refusal={refusalOf("whatsapp")} mask={maskMobile} inputMode="numeric" autoComplete="tel-national" placeholder={text.whatsappPlaceholder} {...form.register("whatsapp")} />
          </div>

          <LandingCourierVehicles id={`${id}-vehicle`} legend={text.vehicle} labels={text.vehicles} initial={initial?.vehicle ?? empty.vehicle} radio={form.register("vehicle")} refusal={refusalOf("vehicle")} />
          <LandingCourierConsent id={`${id}-terms`} termsHref={termsHref} privacyHref={privacyHref} text={text} checkbox={form.register("acceptedTerms")} refusal={refusalOf("acceptedTerms")} onRead={onRead} />

          {/* The trap, as a site's contact form draws it: out of sight and out of the accessibility tree, so only a robot fills it in. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${id}-website`}>{text.trap}</label>
            <input id={`${id}-website`} type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
          </div>

          {problem && !problem.field ? (
            <p role="alert" className="rounded-[14px] border-[1.5px] border-brand-danger bg-brand-surface px-4 py-3 text-sm font-semibold text-brand-danger">
              {problem.message}
            </p>
          ) : null}

          {/* Only its rise is eased. Its colours change at once: faded, the unlocking passes through a grey on a grey nobody can read. */}
          <button
            type="submit"
            disabled={locked || sending}
            aria-describedby={locked ? `${id}-missing` : undefined}
            className={cn(LANDING_CTA, "h-[52px] cursor-pointer bg-brand-ink text-base font-extrabold text-brand-on-ink transition-[translate,box-shadow] disabled:pointer-events-none disabled:bg-brand-line-strong disabled:text-brand-muted")}
          >
            {sending ? text.sending : problem?.retry ? text.retry : text.submit}
            {sending ? null : <ArrowRightIcon aria-hidden="true" className="size-4" />}
          </button>
          {locked ? (
            <p id={`${id}-missing`} className="text-center text-xs leading-[1.45] text-brand-text">
              {withParts(text.missing, { fields: missing.map((field) => text.missingNames[field]).join(", ") })}
            </p>
          ) : null}
          <p className="text-center text-xs text-brand-muted">{text.next}</p>
        </form>
      )}
      {/* In the page before there is anything to say, so a reader hears the sentence arrive: that the button unlocked, and what became of the form. */}
      <p role="status" className="sr-only">
        {closed ? `${confirmation.title} ${confirmation.text}` : status === "idle" && !locked ? text.ready : ""}
      </p>
    </>
  )
}
