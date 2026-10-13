"use client"

// React
import type { ComponentProps } from "react"

// Libs
import { BikeIcon, CarIcon, MotorbikeIcon, TruckIcon, type LucideIcon } from "lucide-react"

// Locales
import type { LandingVehicleValue } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_VEHICLES } from "./landing-courier-schema"
import { LANDING_REFUSAL } from "./landing-styles"

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

const VEHICLE_ICON: Record<LandingVehicleValue, LucideIcon> = { MOTORCYCLE: MotorbikeIcon, BICYCLE: BikeIcon, CAR: CarIcon, VAN: TruckIcon }

/** "Como você entrega?": the four ways, one always chosen. A real radio group, so the arrow keys move the choice. */
export function LandingCourierVehicles({ id, legend, labels, initial, radio, refusal }: LandingCourierVehiclesProps) {
  return (
    <fieldset aria-describedby={refusal ? `${id}-refusal` : undefined} className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LANDING_VEHICLES.map((vehicle) => {
          const Icon = VEHICLE_ICON[vehicle]
          return (
            // The whole card is the radio's label: it reads as chosen, and a key reaches it.
            <label
              key={vehicle}
              className="flex h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-brand-line-strong bg-brand-surface text-[13px] font-semibold hover:border-brand-ink has-checked:border-2 has-checked:border-brand-ink has-checked:bg-brand-yellow has-checked:font-bold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-ink"
            >
              <input type="radio" value={vehicle} defaultChecked={vehicle === initial} {...radio} className="sr-only" />
              <Icon aria-hidden="true" className="size-[22px]" />
              {labels[vehicle]}
            </label>
          )
        })}
      </div>
      {refusal ? (
        <span id={`${id}-refusal`} className={LANDING_REFUSAL}>
          {refusal}
        </span>
      ) : null}
    </fieldset>
  )
}
