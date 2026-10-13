// Types
import type { CourierApplicationErrorCode } from "@harness-monorepo/contracts"
import type { LandingCourierProblem } from "@harness-monorepo/ui/blocks/landing/landing-courier-form"
import type { LandingCourierFieldValue } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// App
import { CourierApplicationRequestError } from "@/services/couriers/courier-application-requests"

/** What a person can meet sending the courier's form, as sentences. */
export interface CourierApplicationCopy {
  /** The API's refusal of one field, by its code. */
  refusals: Record<CourierApplicationErrorCode, string>
  /** Too many sends from one address. */
  limited: string
  /** The send did not get through. */
  failed: string
}

/**
 * Which field each of the API's refusals is about: where its sentence is shown, and where the person
 * is taken. The form asks for no city (BEELINK-329) — the one open is added at the send — so a
 * refusal of it has no field to stand on: it is said over the button, like any trouble that is no
 * field's.
 */
const FIELD_OF = {
  COURIER_NAME_INVALID: "name",
  COURIER_DOCUMENT_INVALID: "document",
  COURIER_EMAIL_INVALID: "email",
  COURIER_WHATSAPP_INVALID: "whatsapp",
  COURIER_CITY_NOT_OPEN: null,
  COURIER_VEHICLE_INVALID: "vehicle",
  COURIER_TERMS_REQUIRED: "acceptedTerms",
  COURIER_DOCUMENT_TAKEN: "document",
  COURIER_EMAIL_TAKEN: "email",
  COURIER_WHATSAPP_TAKEN: "whatsapp",
} as const satisfies Record<CourierApplicationErrorCode, LandingCourierFieldValue | null>

/**
 * Picked on the server, where the dictionary is, and handed to the client form as plain strings —
 * the whole dictionary would ride to every visitor of the landing for twelve sentences.
 */
export function courierApplicationCopyOf(web: WebMessages): CourierApplicationCopy {
  return {
    refusals: {
      COURIER_NAME_INVALID: web.errors.COURIER_NAME_INVALID,
      COURIER_DOCUMENT_INVALID: web.errors.COURIER_DOCUMENT_INVALID,
      COURIER_EMAIL_INVALID: web.errors.COURIER_EMAIL_INVALID,
      COURIER_WHATSAPP_INVALID: web.errors.COURIER_WHATSAPP_INVALID,
      COURIER_CITY_NOT_OPEN: web.errors.COURIER_CITY_NOT_OPEN,
      COURIER_VEHICLE_INVALID: web.errors.COURIER_VEHICLE_INVALID,
      COURIER_TERMS_REQUIRED: web.errors.COURIER_TERMS_REQUIRED,
      COURIER_DOCUMENT_TAKEN: web.errors.COURIER_DOCUMENT_TAKEN,
      COURIER_EMAIL_TAKEN: web.errors.COURIER_EMAIL_TAKEN,
      COURIER_WHATSAPP_TAKEN: web.errors.COURIER_WHATSAPP_TAKEN,
    },
    limited: web.errors.COURIER_APPLICATION_LIMITED,
    failed: web.errors.COURIER_APPLICATION_FAILED,
  }
}

const isRefusal = (code: string): code is CourierApplicationErrorCode => Object.hasOwn(FIELD_OF, code)

/**
 * A CPF on the list already (BEELINK-329) is no problem of the form's: the person is on the list,
 * nothing was written over what was kept, and there is nothing for them to fix. The screen says so
 * where a confirmation would stand, and the form is not shown a problem for it.
 */
export function isCourierAlreadyListed(error: unknown): boolean {
  return error instanceof CourierApplicationRequestError && error.errorCode === "COURIER_DOCUMENT_TAKEN"
}

/**
 * What a failed send is to the form: the field the API refused with that field's sentence, the limit,
 * or a failure — and only a failure is offered again at once, since a refusal or the limit sent
 * again as it is meets the same answer.
 *
 * Anything that is not one of the route's own codes is a failure: the network, a 5xx, another
 * handler's refusal. None of them says something the person could fix in the form.
 */
export function courierProblemOf(error: unknown, copy: CourierApplicationCopy): LandingCourierProblem | null {
  if (!error || isCourierAlreadyListed(error)) return null

  const code = error instanceof CourierApplicationRequestError ? error.errorCode : "UNKNOWN"

  if (isRefusal(code)) return { field: FIELD_OF[code], message: copy.refusals[code] }
  if (code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS") return { field: null, message: copy.limited }
  return { field: null, message: copy.failed, retry: true }
}
