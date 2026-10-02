// Libs
import { z } from "zod"

// Locales
import type { LandingVehicleValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

export const LANDING_VEHICLES = ["MOTORCYCLE", "BICYCLE", "CAR", "VAN"] as const satisfies readonly LandingVehicleValue[]

/**
 * A Brazilian mobile or landline as typed: ten or eleven digits with the area code, the country's 55
 * or the trunk's 0 in front or not. No area code has a zero in it.
 */
function hasAreaCode(typed: string): boolean {
  const digits = typed
    .replace(/\D/g, "")
    .replace(/^55(?=\d{10,11}$)/, "")
    .replace(/^0(?=\d{10,11}$)/, "")
  return /^[1-9]{2}\d{8,9}$/.test(digits)
}

/**
 * What the landing's courier form asks for before it would go on (BEELINK-256). Shape only, and
 * the whole of what the form does: nothing is sent, so there is no API to have the last word.
 */
export function createCourierSchema(messages: UiMessages["landing"]["couriers"]["form"]) {
  return z.object({
    // A full name is at least two words: a first name alone is not what a document says.
    name: z.string().trim().regex(/\S+\s+\S+/, messages.nameRequired),
    whatsapp: z.string().refine(hasAreaCode, messages.whatsappInvalid),
    city: z.string().trim().min(2, messages.cityRequired),
    vehicle: z.enum(LANDING_VEHICLES),
    consent: z.boolean().refine((accepted) => accepted, messages.consentRequired),
  })
}

export type CourierValues = z.infer<ReturnType<typeof createCourierSchema>>
