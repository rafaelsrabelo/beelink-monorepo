/* ── couriers: who asked to deliver with Beelink ───────────────────────────── */

/** How a courier delivers: the four ways the landing's form offers. */
export type CourierVehicle = "MOTORCYCLE" | "BICYCLE" | "CAR" | "VAN";

/**
 * The cities taking couriers, each by its code. A closed list, and today one city: Fortaleza/CE.
 *
 * The form and the API are both typed by this, so neither can offer a city the other refuses.
 * Opening a city is a member here, a row in the API's list and a label in the form — the three stop
 * compiling until they agree. The table keeps the code as text, so no migration is involved.
 */
export type CourierCity = "FORTALEZA_CE";

/**
 * What a person sends to say they want to deliver (BEELINK-321). Anonymous, rate-limited per address,
 * and answered 204 with no body when it was kept — or trapped.
 *
 * Each field is checked by the API, which has the last word; a refusal is a 400 with the field's own
 * `CourierApplicationErrorCode`. A person is on the list once (BEELINK-325): a CPF, an e-mail or a
 * WhatsApp number already there is a 409 that names which, and what was kept is left as it was.
 *
 * The e-mail may be left out (BEELINK-328): the landing's first step does not ask for it, and an
 * application kept without one is owed no e-mail.
 */
export interface CourierApplicationPayload {
  /** The full name, as on the document: at least a first name and a surname, 120 characters at most. */
  name: string;
  /** The CPF, with its points and dash or without. Its check digits are verified; kept as eleven digits. */
  document: string;
  /**
   * Kept trimmed and lower-cased. Left out, the application has no address: the key absent, never
   * an empty text — that one is an address that is wrong.
   */
  email?: string;
  /**
   * A Brazilian mobile with its area code, as typed: `(85) 98888-7777`, with `+55` in front or not.
   * Kept as digits with the country code, the way a shop's WhatsApp is: `5585988887777`.
   */
  whatsapp: string;
  city: CourierCity;
  vehicle: CourierVehicle;
  /**
   * That the person ticked Beelink's terms of use and privacy policy. Only `true` is taken. Which
   * version that was is the API's to say — the `LegalVersion` in force when the body arrived — and
   * no field here chooses it.
   */
  acceptedTerms: boolean;
  /**
   * The trap, as on a site's contact form. Drawn out of sight, so no person fills it in; a body that
   * carries a value is answered like a save and is not kept.
   */
  website?: string;
}

/**
 * The `errorCode` values `POST /courier-applications` refuses a body with, one per field: a 400 for
 * a field that is wrong, a 409 for one already on the list. With more than one field refused, the
 * answer names the first in the order they are listed here — every wrong field before any taken
 * one. The apps own the sentences.
 *
 * A field left out is refused like a wrong one, with its own code. A body carrying a field the route
 * does not know is `BAD_REQUEST`, and too many from one address is `RATE_LIMITED` (429).
 */
export type CourierApplicationErrorCode =
  /** Not a first name and a surname, or longer than 120 characters. */
  | "COURIER_NAME_INVALID"
  /** Not a CPF: not eleven digits, or its check digits are wrong. */
  | "COURIER_DOCUMENT_INVALID"
  | "COURIER_EMAIL_INVALID"
  /** Not a Brazilian mobile with its area code. */
  | "COURIER_WHATSAPP_INVALID"
  /** Not one of the cities taking couriers (`CourierCity`). */
  | "COURIER_CITY_NOT_OPEN"
  | "COURIER_VEHICLE_INVALID"
  /** `acceptedTerms` is not `true`. */
  | "COURIER_TERMS_REQUIRED"
  /** 409: that CPF is on the list already, written with its points or without. */
  | "COURIER_DOCUMENT_TAKEN"
  /** 409: that e-mail is on the list already, in whatever case it was typed. */
  | "COURIER_EMAIL_TAKEN"
  /** 409: that WhatsApp number is on the list already, with its country code or without. */
  | "COURIER_WHATSAPP_TAKEN";
