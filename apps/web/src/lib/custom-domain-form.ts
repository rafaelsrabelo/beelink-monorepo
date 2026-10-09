// Types
import type { CustomDomainCheck, CustomDomainErrorCode, CustomDomainOverview } from "@harness-monorepo/contracts"
import type { CustomDomainView } from "@harness-monorepo/ui/lib/custom-domain"

/** The domain's own screen in the panel. Every link to it is built here, so none points at a page that moved. */
export function customDomainPageOf(slug: string): string {
  return `/admin/${encodeURIComponent(slug)}/domain`
}

/**
 * The shop's address at the platform as a person reads it, with no scheme: `beelink.biz/minha-loja`.
 * Only ever shown. The host is the one the panel was asked for — the panel is served on the
 * platform's host alone, and the web has no setting that says its own address outside the proxy.
 */
export function platformAddressOf(origin: string, slug: string): string {
  return `${new URL(origin).host}/${slug}`
}

/** When the domain was last checked, as the shop's country reads it. */
function checkedAtOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}

/**
 * Whether a check found `www.<host>` not leading here, as something worth a note. Not while the
 * domain's own DNS is wrong — the sentence about that already sends the shopkeeper to the records,
 * `www`'s among them — and not when DNS did not answer for `www`, which tells nothing of its record.
 */
function wwwOffOf(check: CustomDomainCheck): boolean {
  const rootPointsHere = check.problem === null || check.problem === "HTTPS_UNREACHABLE" || check.problem === "HTTPS_CERTIFICATE_INVALID"
  return rootPointsHere && (check.www.problem === "DNS_NOT_FOUND" || check.www.problem === "DNS_POINTS_ELSEWHERE")
}

/**
 * The saved domain as the block draws it, or null for a shop with none. Where its records point and
 * what `www` does come from a check alone: a plain read carries none, and the view then says neither.
 */
export function customDomainViewOf({ domain, check }: Pick<CustomDomainOverview, "domain" | "check">, locale: string): CustomDomainView | null {
  if (!domain) return null

  return {
    host: domain.host,
    status: domain.status,
    checkedAt: domain.checkedAt ? checkedAtOf(domain.checkedAt, locale) : null,
    problem: domain.problem,
    addresses: check?.addresses ?? [],
    wwwOff: check ? wwwOffOf(check) : false,
  }
}

/** Typed by the contract's codes: one the API gains stops the screen compiling until the dictionary has its sentence. */
type CustomDomainErrors = Record<CustomDomainErrorCode | "RATE_LIMITED", string>

/**
 * Why a save or a check did not go through, in words; `fallback` for any code with no sentence of
 * its own. Own keys only, so a code that names a member of `Object` reads as any unknown one.
 */
export function customDomainErrorOf(code: string, errors: CustomDomainErrors, fallback: string): string {
  return Object.hasOwn(errors, code) ? errors[code as keyof CustomDomainErrors] : fallback
}
