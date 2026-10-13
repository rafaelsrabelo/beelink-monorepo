// Libs
import { z } from "zod"

// Locales
import type { LandingCourierFieldValue, LandingVehicleValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { mobileDigitsOf } from "./landing-courier-masks"

type CourierFormText = UiMessages["landing"]["couriers"]["form"]

/** The four ways of delivering, in the order the form draws them. */
export const LANDING_VEHICLES = ["MOTORCYCLE", "BICYCLE", "CAR", "VAN"] as const satisfies readonly LandingVehicleValue[]

/** What the form asks for, in the order it asks: the order the missing ones are said in. */
export const LANDING_COURIER_FIELDS = ["name", "document", "email", "whatsapp", "vehicle", "acceptedTerms"] as const satisfies readonly LandingCourierFieldValue[]

/**
 * What the form holds: each field as the person left it, and the trap no person fills in. No city
 * (BEELINK-329): one is open, and whoever sends the form adds it.
 */
export interface LandingCourierValues {
  name: string
  /** The CPF, as the mask writes it. */
  document: string
  email: string
  /** A mobile with its area code, as the mask writes it. */
  whatsapp: string
  vehicle: LandingVehicleValue
  acceptedTerms: boolean
  website: string
}

const NAME_MAX_LENGTH = 120
const EMAIL_MAX_LENGTH = 254

/**
 * A first name and a surname at least, 120 characters at most, once the spaces around it are gone
 * and a run of them between words is read as one — which is how the API keeps it.
 */
export function isFullName(typed: string): boolean {
  const name = typed.trim().replace(/\s+/g, " ")
  return name.length <= NAME_MAX_LENGTH && /^\S+(?: \S+)+$/.test(name)
}

/**
 * Whether what was typed is a CPF, whichever points and dash are around its digits: eleven of them,
 * not one digit repeated — `111.111.111-11` passes the arithmetic and belongs to nobody — and both
 * check digits right, each the sum of the digits before it weighted from 10 (then 11) down to 2,
 * times ten, modulo eleven, a ten counting as zero.
 *
 * The API's own rule (`shared/http/cpf.ts`), restated: this package cannot import it. It spares a
 * person a round trip for a mistyped digit; the API still has the last word.
 */
export function isCpf(typed: string): boolean {
  const digits = typed.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const check = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index)
    return ((sum * 10) % 11) % 10
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10])
}

/**
 * A Brazilian mobile with its area code — none has a zero in it — and nine digits of which the first
 * is a 9. A landline is refused, as the API refuses it: what is asked for is a WhatsApp.
 */
export function isMobile(typed: string): boolean {
  return /^[1-9]{2}9\d{8}$/.test(mobileDigitsOf(typed))
}

/**
 * What the landing's courier form needs before it may be sent (BEELINK-322), each refusal in the
 * sentence the field shows. The same rules the API applies, so a form the button lets through is one
 * the API takes; where the two disagree the API's answer is shown on the field.
 */
export function createCourierSchema(text: CourierFormText) {
  return z.object({
    name: z.string().refine(isFullName, text.nameRequired),
    document: z.string().refine(isCpf, text.documentInvalid),
    email: z.string().trim().pipe(z.email(text.emailInvalid).max(EMAIL_MAX_LENGTH, text.emailInvalid)),
    whatsapp: z.string().refine(isMobile, text.whatsappInvalid),
    vehicle: z.enum(LANDING_VEHICLES),
    acceptedTerms: z.boolean().refine((accepted) => accepted, text.consentRequired),
    website: z.string(),
  }) satisfies z.ZodType<LandingCourierValues>
}

export type LandingCourierSchema = ReturnType<typeof createCourierSchema>

/**
 * Which fields still keep the form from being sent, in the order it asks for them. Read from what is
 * in the form now and not from the refusals drawn: a field shows its own only once the person left
 * it, and the button has to know before that.
 */
export function missingCourierFields(schema: LandingCourierSchema, values: Partial<LandingCourierValues>): LandingCourierFieldValue[] {
  const result = schema.safeParse(values)
  if (result.success) return []

  const refused = new Set(result.error.issues.map((issue) => issue.path[0]))
  return LANDING_COURIER_FIELDS.filter((field) => refused.has(field))
}
