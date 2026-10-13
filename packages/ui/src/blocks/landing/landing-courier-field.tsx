"use client"

// React
import type { ComponentProps } from "react"

// Block
import { maskField } from "./landing-courier-masks"
import { LANDING_FIELD, LANDING_FIELD_LABEL, LANDING_INPUT, LANDING_REFUSAL } from "./landing-styles"

export interface LandingCourierFieldProps extends ComponentProps<"input"> {
  id: string
  label: string
  /** What is wrong with it, in a sentence. */
  refusal?: string
  /** Written over what is typed or pasted, before the form reads the field. */
  mask?: (typed: string) => string
}

/**
 * One typed field of the courier's form: its label, the field and, once there is one, its refusal.
 * The refusal sits beside the label and not in it — inside, it would be read as part of the field's
 * name and again as its description.
 *
 * A mask is written into the field itself and the change is passed on after: whoever listens — the
 * form library — reads what the person sees.
 */
export function LandingCourierField({ id, label, refusal, mask, onChange, ...field }: LandingCourierFieldProps) {
  return (
    <div className={LANDING_FIELD}>
      <label htmlFor={id} className={LANDING_FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        {...field}
        onChange={(event) => {
          if (mask) maskField(event.currentTarget, mask)
          return onChange?.(event)
        }}
        aria-invalid={refusal ? true : undefined}
        aria-describedby={refusal ? `${id}-refusal` : undefined}
        className={LANDING_INPUT}
      />
      {refusal ? (
        <span id={`${id}-refusal`} className={LANDING_REFUSAL}>
          {refusal}
        </span>
      ) : null}
    </div>
  )
}
