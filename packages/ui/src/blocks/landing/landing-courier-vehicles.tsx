"use client"

// React
import type { ComponentProps } from "react"

// Locales
import type { LandingVehicleValue } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_VEHICLES } from "./landing-courier-schema"
import { LANDING_FIELD_LABEL, LANDING_REFUSAL } from "./landing-styles"

export interface LandingCourierVehiclesProps {
  id: string
  legend: string
  labels: Record<LandingVehicleValue, string>
  /** The one chosen while the page has no script: the form library marks a choice only once it runs. */
  initial: LandingVehicleValue
  /** What every radio of the group is given: its name and the form library's handlers. */
  radio: ComponentProps<"input">
  refusal?: string
}

/**
 * "Como vai fazer suas entregas?": the four ways side by side, one always chosen. Drawn as buttons and
 * built as a real radio group, so the arrow keys move the choice and a reader hears one of four.
 *
 * 44px tall at every width: a thumb's target. On the narrowest phones four in a row leave the longest
 * word no room, and they stand two by two.
 */
export function LandingCourierVehicles({ id, legend, labels, initial, radio, refusal }: LandingCourierVehiclesProps) {
  return (
    <fieldset aria-describedby={refusal ? `${id}-refusal` : undefined} className="flex flex-col gap-1.5">
      <legend className={`mb-1.5 ${LANDING_FIELD_LABEL}`}>{legend}</legend>
      <div className="grid grid-cols-2 gap-1.5 min-[22.5rem]:grid-cols-4">
        {LANDING_VEHICLES.map((vehicle) => (
          // The whole button is the radio's label: it reads as chosen, and a key reaches it.
          <label
            key={vehicle}
            className="flex h-11 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-brand-line-strong bg-brand-surface px-1 text-xs font-semibold hover:border-brand-ink has-checked:border-2 has-checked:border-brand-ink has-checked:bg-brand-yellow has-checked:font-extrabold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-ink lg:text-[13px]"
          >
            <input type="radio" value={vehicle} defaultChecked={vehicle === initial} {...radio} className="sr-only" />
            {labels[vehicle]}
          </label>
        ))}
      </div>
      {refusal ? (
        <span id={`${id}-refusal`} className={LANDING_REFUSAL}>
          {refusal}
        </span>
      ) : null}
    </fieldset>
  )
}
