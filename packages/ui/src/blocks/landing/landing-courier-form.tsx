"use client"

// React
import { useId, useState } from "react"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, BikeIcon, CarIcon, FootprintsIcon, MotorbikeIcon, type LucideIcon } from "lucide-react"
import { useForm } from "react-hook-form"

// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { LandingVehicleValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { createCourierSchema, LANDING_VEHICLES, type CourierValues } from "./landing-courier-schema"
import { LANDING_CTA } from "./landing-styles"

export interface LandingCourierFormProps {
  termsHref: string
  privacyHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const VEHICLE_ICON: Record<LandingVehicleValue, LucideIcon> = { MOTORCYCLE: MotorbikeIcon, BICYCLE: BikeIcon, CAR: CarIcon, ON_FOOT: FootprintsIcon }
const LABEL = "flex flex-col gap-1.5 text-sm font-bold"
const INPUT = "h-[52px] rounded-[14px] border-[1.5px] border-brand-line-strong bg-brand-surface px-4 text-base font-normal aria-invalid:border-brand-danger"
const REFUSAL = "text-[13px] font-semibold text-brand-danger"
const TEXT_FIELDS = [
  { name: "name", autoComplete: "name", inputMode: "text" },
  { name: "whatsapp", autoComplete: "tel", inputMode: "tel" },
  { name: "city", autoComplete: "address-level2", inputMode: "text" },
] as const

/**
 * "Comece seu cadastro": the courier's first step, as the design draws it — and for now only that.
 * The couriers' app does not exist yet, so the form checks what was typed and sends nothing
 * (decided on 01/10/2026): a valid one is answered with a sentence saying so, rather than with a
 * silence that would read as "received".
 */
export function LandingCourierForm({ termsHref, privacyHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingCourierFormProps) {
  const text = messages.landing.couriers.form
  const id = useId()
  const [checked, setChecked] = useState(false)
  const form = useForm<CourierValues>({
    resolver: zodResolver(createCourierSchema(text)),
    defaultValues: { name: "", whatsapp: "", city: "", vehicle: "MOTORCYCLE", consent: false },
  })
  const errors = form.formState.errors
  const labels = { name: text.name, whatsapp: text.whatsapp, city: text.city }
  const placeholders = { name: text.namePlaceholder, whatsapp: text.whatsappPlaceholder, city: text.cityPlaceholder }

  return (
    <form
      noValidate
      aria-labelledby={`${id}-title`}
      onSubmit={form.handleSubmit(() => setChecked(true))}
      // Typed again, it is another form: the sentence said of the last one is not about it.
      onChange={() => setChecked(false)}
      className="relative flex w-full flex-col gap-[18px] self-center rounded-[32px] bg-brand-ground p-6 text-brand-ink shadow-2xl shadow-brand-ink/40 sm:p-9 xl:w-[460px] xl:shrink-0"
    >
      <div className="flex flex-col gap-1.5">
        <h3 id={`${id}-title`} className="text-[28px] font-extrabold tracking-[-0.02em]">
          {text.title}
        </h3>
        <p className="text-[15px] text-brand-muted">{text.lead}</p>
      </div>

      {TEXT_FIELDS.map(({ name, autoComplete, inputMode }) => (
        <label key={name} className={LABEL}>
          {labels[name]}
          <input
            {...form.register(name)}
            autoComplete={autoComplete}
            inputMode={inputMode}
            placeholder={placeholders[name]}
            aria-invalid={errors[name] ? true : undefined}
            aria-describedby={errors[name] ? `${id}-${name}` : undefined}
            className={INPUT}
          />
          {errors[name] ? (
            <span id={`${id}-${name}`} className={REFUSAL}>
              {errors[name].message}
            </span>
          ) : null}
        </label>
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">{text.vehicle}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANDING_VEHICLES.map((vehicle) => {
            const Icon = VEHICLE_ICON[vehicle]
            return (
              // The whole card is the radio's label: it reads as chosen, and a key reaches it.
              <label
                key={vehicle}
                className="flex h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-brand-line-strong bg-brand-surface text-[13px] font-semibold hover:border-brand-ink has-checked:border-2 has-checked:border-brand-ink has-checked:bg-brand-yellow has-checked:font-bold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-ink"
              >
                <input type="radio" value={vehicle} {...form.register("vehicle")} className="sr-only" />
                <Icon aria-hidden="true" className="size-[22px]" />
                {text.vehicles[vehicle]}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-brand-text">
          <input
            type="checkbox"
            {...form.register("consent")}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${id}-consent` : undefined}
            className="mt-px size-[18px] shrink-0 accent-brand-ink"
          />
          <span>
            {withParts(text.consent, {
              terms: (
                <Link href={termsHref} className="font-bold underline">
                  {text.terms}
                </Link>
              ),
              privacy: (
                <Link href={privacyHref} className="font-bold underline">
                  {text.privacy}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.consent ? (
          <span id={`${id}-consent`} className={REFUSAL}>
            {errors.consent.message}
          </span>
        ) : null}
      </div>

      <button type="submit" className={cn(LANDING_CTA, "h-[58px] bg-brand-ink text-[17px] font-extrabold text-brand-on-ink")}>
        {text.submit}
        <ArrowRightIcon aria-hidden="true" className="size-[18px]" />
      </button>
      {/* In the page before there is anything to say, so a reader hears the sentence arrive; the margin takes back the gap an empty line would leave. */}
      <p aria-live="polite" className="text-center text-sm font-semibold empty:-mt-[18px]">
        {checked ? text.notOpen : null}
      </p>
    </form>
  )
}
