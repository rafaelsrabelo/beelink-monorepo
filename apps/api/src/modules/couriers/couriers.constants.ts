// Types
import type { CourierCity, CourierVehicle } from '@harness-monorepo/contracts';

/** The closed union, as a value the validators can range over. Checked against the contract. */
export const COURIER_VEHICLES = ['MOTORCYCLE', 'BICYCLE', 'CAR', 'VAN'] as const satisfies readonly CourierVehicle[];

/**
 * The cities taking couriers: the list itself, of which the contracts hold only the type.
 *
 * A record keyed by the type and not an array checked against it: an array missing a city the type
 * gained would still compile, and the form would then offer a city this API refuses. Opening one is
 * a member of `CourierCity` and its row here, with no migration — the table keeps the code as text.
 */
export const COURIER_CITIES = {
  FORTALEZA_CE: { name: 'Fortaleza', state: 'CE' },
} as const satisfies Record<CourierCity, { name: string; state: string }>;

export const COURIER_CITY_CODES = Object.keys(COURIER_CITIES) as CourierCity[];

/**
 * The name of a city as the table keeps it, by its code; null for a code that is not on the list.
 * The column is text: a city closed after an application was kept leaves its code there, naming nothing.
 */
export function courierCityNameOf(code: string): string | null {
  return Object.hasOwn(COURIER_CITIES, code) ? COURIER_CITIES[code as CourierCity].name : null;
}

/** The column's width, and a lead's name's: nobody's full name is turned away by it. */
export const COURIER_NAME_MAX_LENGTH = 120;

/** A first name and a surname at least, once the spaces between them were read as one. */
export const COURIER_FULL_NAME = /^\S+(?: \S+)+$/;

/** An address's own ceiling (RFC 5321), and the column's. */
export const COURIER_EMAIL_MAX_LENGTH = 254;

/**
 * A Brazilian mobile as it is kept: the country's 55, an area code — none has a zero in it — and
 * nine digits of which the first is a 9. A landline is refused: what is asked for is a WhatsApp.
 */
export const COURIER_WHATSAPP = /^55[1-9]{2}9\d{8}$/;

// The rate limit is deliberately not here: it reads `env`, and this file is imported by the DTO and
// its unit test, which must load without a `.env`. It is built in courier-applications.controller.ts.
