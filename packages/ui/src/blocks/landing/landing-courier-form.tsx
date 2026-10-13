"use client"

// React
import { useEffect, useId, useMemo, useRef } from "react"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { LandingCourierCityValue, LandingCourierFieldValue, LandingLegalValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LandingCourierConsent } from "./landing-courier-consent"
import { LandingCourierField } from "./landing-courier-field"
import { maskCpf, maskMobile } from "./landing-courier-masks"
import { createCourierSchema, missingCourierFields, type LandingCourierValues } from "./landing-courier-schema"
import { LandingCourierSent } from "./landing-courier-sent"
import { LandingCourierVehicles } from "./landing-courier-vehicles"
import { LANDING_COURIER_CARD, LANDING_CTA, LANDING_FIELD, LANDING_FIELD_LABEL, LANDING_FIELDS, LANDING_FOCUS_ON_GROUND, LANDING_INPUT, LANDING_REFUSAL } from "./landing-styles"

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
  /** Where the send is. `sent` puts the confirmation where the form stood, so it cannot go twice. */
  status?: "idle" | "sending" | "sent"
  problem?: LandingCourierProblem | null
  /** A form with nothing left to fix. The screen owns the send: this block reaches no network. */
  onSubmit: (application: LandingCourierValues) => void
  /** The form was typed in again: what was said of the last send is not about it any more. */
  onEdit?: () => void
  /** "Enviar outro cadastro", once one was taken. */
  onAgain?: () => void
  /** A plain click on one of the two legal links, when the screen reads them over the form; without it they lead to their pages. */
  onRead?: (document: LandingLegalValue, link: HTMLElement) => void
  /** What the form starts with. Nothing, on the page; a story and a test start it filled in. */
  initial?: Partial<LandingCourierValues>
}

/**
 * "Comece seu cadastro": the form that puts a person on the list of those who asked to deliver with
 * Beelink (BEELINK-322). Today for one city, so the city is a choice of one.
 *
 * **The button is locked until nothing is missing**, by the same check that writes the sentence
 * under it — the two cannot disagree — and that sentence is the button's description. A field shows
 * its own refusal only once the person left it. Unlocking is said once, in the status line; the list
 * of what is missing is not read out at every key.
 *
 * Until the script arrives the page holds a locked button and a form whose `method` sends nothing:
 * a form's default is a GET that writes the name, the CPF and the phone into the address.
 *
 * Native controls dressed in the brand's tokens, the city's `<select>` included, and not the design
 * system's primitives: those draw nothing before their script, and wear the panel's tokens.
 */
export function LandingCourierForm({ termsHref, privacyHref, text, status = "idle", problem = null, onSubmit, onEdit, onAgain, onRead, initial }: LandingCourierFormProps) {
  const id = useId()
  const schema = useMemo(() => createCourierSchema(text), [text])
  const cities = Object.keys(text.cities) as LandingCourierCityValue[]
  const empty = { name: "", document: "", email: "", whatsapp: "", city: cities[0]!, vehicle: "MOTORCYCLE", acceptedTerms: false, website: "" } satisfies LandingCourierValues
  const form = useForm<LandingCourierValues>({ resolver: zodResolver(schema), mode: "onTouched", defaultValues: { ...empty, ...initial } })
  const missing = missingCourierFields(schema, useWatch({ control: form.control }))
  const locked = missing.length > 0
  const sending = status === "sending"
  const errors = form.formState.errors
  const refusalOf = (field: LandingCourierFieldValue) => errors[field]?.message ?? (problem?.field === field ? problem.message : undefined)
  // Set by "Enviar outro cadastro": the form that comes back takes the focus the button had.
  const returning = useRef(false)

  // The API refused a field the browser had let through: the person is taken to it.
  useEffect(() => {
    if (problem?.field) form.setFocus(problem.field)
  }, [problem?.field, problem?.message, form])

  useEffect(() => {
    if (status === "sent" || !returning.current) return
    returning.current = false
    form.setFocus("name")
  }, [status, form])

  return (
    <>
      {status === "sent" ? (
        <LandingCourierSent
          text={text.sent}
          onAgain={() => {
            // The next one is another person's: nothing of the last is left in the fields.
            form.reset(empty)
            returning.current = true
            onAgain?.()
          }}
        />
      ) : (
        <form noValidate method="dialog" aria-labelledby={`${id}-title`} onSubmit={form.handleSubmit(onSubmit)} onChange={() => onEdit?.()} className={cn(LANDING_FOCUS_ON_GROUND, LANDING_COURIER_CARD)}>
          <div className="flex flex-col gap-1.5">
            <h3 id={`${id}-title`} className="text-[28px] font-extrabold tracking-[-0.02em]">
              {text.title}
            </h3>
            <p className="text-[15px] text-brand-muted">{text.lead}</p>
          </div>

          <div className={LANDING_FIELDS}>
            <LandingCourierField id={`${id}-name`} label={text.name} refusal={refusalOf("name")} autoComplete="name" placeholder={text.namePlaceholder} {...form.register("name")} />
            <LandingCourierField id={`${id}-document`} label={text.document} refusal={refusalOf("document")} mask={maskCpf} inputMode="numeric" autoComplete="off" placeholder={text.documentPlaceholder} {...form.register("document")} />
            <LandingCourierField id={`${id}-email`} label={text.email} refusal={refusalOf("email")} type="email" inputMode="email" autoComplete="email" placeholder={text.emailPlaceholder} {...form.register("email")} />
            <LandingCourierField id={`${id}-whatsapp`} label={text.whatsapp} refusal={refusalOf("whatsapp")} mask={maskMobile} inputMode="numeric" autoComplete="tel-national" placeholder={text.whatsappPlaceholder} {...form.register("whatsapp")} />

            <div className={LANDING_FIELD}>
              <label htmlFor={`${id}-city`} className={LANDING_FIELD_LABEL}>
                {text.city}
              </label>
              <div className="relative flex flex-col">
                <select id={`${id}-city`} {...form.register("city")} aria-invalid={refusalOf("city") ? true : undefined} aria-describedby={`${id}-city-hint${refusalOf("city") ? ` ${id}-city-refusal` : ""}`} className={cn(LANDING_INPUT, "cursor-pointer appearance-none pr-11")}>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {text.cities[city]}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
              </div>
              <span id={`${id}-city-hint`} className="text-[13px] text-brand-muted">
                {text.cityHint}
              </span>
              {refusalOf("city") ? (
                <span id={`${id}-city-refusal`} className={LANDING_REFUSAL}>
                  {refusalOf("city")}
                </span>
              ) : null}
            </div>
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

          <button
            type="submit"
            disabled={locked || sending}
            aria-describedby={locked ? `${id}-missing` : undefined}
            className={cn(LANDING_CTA, "h-[58px] cursor-pointer bg-brand-ink text-[17px] font-extrabold text-brand-on-ink disabled:pointer-events-none disabled:bg-brand-line-strong disabled:text-brand-muted")}
          >
            {sending ? text.sending : problem?.retry ? text.retry : text.submit}
            {sending ? null : <ArrowRightIcon aria-hidden="true" className="size-[18px]" />}
          </button>
          {locked ? (
            <p id={`${id}-missing`} className="text-center text-[13px] leading-[1.45] text-brand-text">
              {withParts(text.missing, { fields: missing.map((field) => text.missingNames[field]).join(", ") })}
            </p>
          ) : null}
        </form>
      )}
      {/* In the page before there is anything to say, so a reader hears the sentence arrive: that the button unlocked, and that the form was taken. */}
      <p role="status" className="sr-only">
        {status === "sent" ? `${text.sent.title} ${text.sent.text}` : status === "idle" && !locked ? text.ready : ""}
      </p>
    </>
  )
}
