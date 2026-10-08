/**
 * A shop's own domain as the panel's blocks read it (BEELINK-285). They mirror the wire's shapes in
 * `packages/contracts/src/custom-domain.ts`; this package does not import them, so a screen hands
 * its data over and the blocks never learn where it came from.
 */

/** Where a shop's domain stands. Mirrors `CustomDomainStatus`. */
export type CustomDomainStatusValue = "PENDING" | "ACTIVE"

/** What a check found wrong. Mirrors `CustomDomainProblem`. */
export type CustomDomainProblemValue = "DNS_NOT_FOUND" | "DNS_POINTS_ELSEWHERE" | "DNS_LOOKUP_FAILED" | "HTTPS_UNREACHABLE" | "HTTPS_CERTIFICATE_INVALID"

/** Why the API refused a domain or a check. Mirrors `CustomDomainErrorCode`. */
export type CustomDomainErrorValue =
  | "CUSTOM_DOMAIN_INVALID"
  | "CUSTOM_DOMAIN_IP_ADDRESS"
  | "CUSTOM_DOMAIN_LOCAL"
  | "CUSTOM_DOMAIN_NOT_ASCII"
  | "CUSTOM_DOMAIN_PLATFORM"
  | "CUSTOM_DOMAIN_TAKEN"
  | "CUSTOM_DOMAIN_UNAVAILABLE"
  | "CUSTOM_DOMAIN_NOT_SET"

/** The saved domain as its screen draws it. Mirrors `CustomDomain`, with what the last check run from this screen found beside it. */
export interface CustomDomainView {
  /** The bare host: `minhaloja.com.br`. */
  host: string
  status: CustomDomainStatusValue
  /** When it was last checked, already in words; null when it never was. */
  checkedAt: string | null
  /** What the last check found wrong. An active domain may carry one, and stays active. */
  problem: CustomDomainProblemValue | null
  /** Where the domain's `A` records were found to point. Empty unless a check just told: a plain read does not. */
  addresses: string[]
  /** `www.<host>` was found not to lead here. False unless a check just told. */
  wwwOff: boolean
}

/** The domain as the panel's home tells it: the host and where it stands. Mirrors `PublicCustomDomain`. */
export type ShopAddressDomain = Pick<CustomDomainView, "host" | "status">

/** One DNS record the shopkeeper creates at their provider. */
export interface CustomDomainRecord {
  type: "A" | "CNAME"
  /** `@` is the domain itself, as every provider's panel writes it. */
  name: string
  value: string
}

/**
 * The records that point a domain here: an `A` on the root for each of the server's addresses — a
 * root takes no `CNAME` — and `www` as a `CNAME` of the root, so both names open the page.
 */
export function customDomainRecordsOf(targetIps: readonly string[]): CustomDomainRecord[] {
  return [...targetIps.map((ip) => ({ type: "A", name: "@", value: ip }) satisfies CustomDomainRecord), { type: "CNAME", name: "www", value: "@" }]
}
