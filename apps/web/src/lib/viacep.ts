/**
 * The postcode lookup, server-side. It is here and not in a component for the reason every block
 * in the design system takes a callback instead of calling anything: a browser that reached ViaCEP
 * itself would put a third party between the shopkeeper and this app, and would hand that third
 * party the visitor's address on every keystroke.
 *
 * The legacy called it straight from two screens (`src/app/create-store/page.tsx` and
 * `src/app/admin/[slug]/store/page.tsx`) and read `data.erro` truthily. That is the whole trap:
 * ViaCEP answers **200** for a postcode that does not exist, with `{ "erro": "true" }` — a string
 * in the current API, a boolean in older answers — so a lookup that only checks `response.ok`
 * silently fills the form with `undefined`.
 */

/** What the four auto-filled fields need, and nothing else ViaCEP returns. */
export interface ZipCodeAddress {
  /** Eight digits, no mask — the same normalisation the payload mapper applies. */
  zipCode: string
  street: string
  neighborhood: string
  city: string
  /** The two-letter UF, upper case. */
  state: string
}

/**
 * Four outcomes, not two. "Not found" is an answer the shopkeeper can act on — check the digits —
 * and "unavailable" is one they cannot; collapsing them into a single failure is what made the
 * legacy toast say "Erro ao buscar CEP" for a postcode that was simply mistyped.
 */
export type ZipCodeLookup =
  | { status: "found"; address: ZipCodeAddress }
  | { status: "not-found" }
  | { status: "invalid" }
  | { status: "unavailable" }

const VIACEP_URL = "https://viacep.com.br/ws"

/** A lookup is a convenience; a slow one may not hold the form hostage (see the handler's note). */
const TIMEOUT_MS = 4_000

export function toZipCodeDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/** ViaCEP's own field names. `erro` is present only on the "no such postcode" answer. */
interface ViaCepBody {
  erro?: unknown
  logradouro?: unknown
  bairro?: unknown
  localidade?: unknown
  uf?: unknown
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function lookupZipCode(value: string): Promise<ZipCodeLookup> {
  const zipCode = toZipCodeDigits(value)

  if (zipCode.length !== 8) return { status: "invalid" }

  let body: ViaCepBody

  try {
    const response = await fetch(`${VIACEP_URL}/${zipCode}/json/`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })

    // A 400 from ViaCEP means the postcode was not eight digits, which cannot happen past the
    // check above; anything else non-2xx is the service being down, not the shopkeeper being wrong.
    if (!response.ok) return { status: "unavailable" }

    body = (await response.json()) as ViaCepBody
  } catch {
    return { status: "unavailable" }
  }

  // Truthy, not `=== true`: the field arrives as the string "true" today and as a boolean in
  // older answers, and reading only one of the two is the defect this port exists to not repeat.
  if (body.erro) return { status: "not-found" }

  return {
    status: "found",
    address: {
      zipCode,
      street: textOf(body.logradouro),
      neighborhood: textOf(body.bairro),
      city: textOf(body.localidade),
      state: textOf(body.uf).toUpperCase(),
    },
  }
}
