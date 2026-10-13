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
 * and answered 204 with no body whether it was a first application, one from a CPF already on the
 * list — which replaces what was kept, and says so to nobody — or a trapped one.
 *
 * Each field is checked by the API, which has the last word; a refusal is a 400 with the field's own
 * `CourierApplicationErrorCode`.
 */
export interface CourierApplicationPayload {
  /** The full name, as on the document: at least a first name and a surname, 120 characters at most. */
  name: string;
  /** The CPF, with its points and dash or without. Its check digits are verified; kept as eleven digits. */
  document: string;
  /** Kept trimmed and lower-cased. */
  email: string;
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
 * The `errorCode` values `POST /courier-applications` answers with a 400, one per field. With more
 * than one field refused, the answer names the first in the order they are listed here. The apps own
 * the sentences.
 *
 * A body missing a field altogether, or carrying one the route does not know, is `BAD_REQUEST`; too
 * many from one address is `RATE_LIMITED` (429).
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
  | "COURIER_TERMS_REQUIRED";
