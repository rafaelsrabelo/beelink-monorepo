/**
 * A shop's own domain (docs/plans BEELINK-281): the address its shopkeeper already owns —
 * `minhaloja.com.br` — opening the shop in place of `<platform>/<slug>`. The shopkeeper points the
 * domain's DNS at the server; the API keeps the host, checks that it resolves here and answers over
 * HTTPS, and tells the web which host is which shop's.
 */

/**
 * Where a shop's domain stands. `PENDING` is saved and not yet opening the shop; `ACTIVE` is checked:
 * its DNS points here and it answered over HTTPS. A check that fails later does not move an `ACTIVE`
 * domain back — a shop is not taken down by a DNS server that was slow once.
 */
export type CustomDomainStatus = "PENDING" | "ACTIVE";

/**
 * What a check found wrong with the domain's DNS.
 *
 * - `DNS_NOT_FOUND`: the name has no `A` record.
 * - `DNS_POINTS_ELSEWHERE`: its `A` records are not exactly the server's — the check says which they are.
 * - `DNS_LOOKUP_FAILED`: DNS itself did not answer; nothing was learned of the records.
 */
export type CustomDomainDnsProblem = "DNS_NOT_FOUND" | "DNS_POINTS_ELSEWHERE" | "DNS_LOOKUP_FAILED";

/**
 * What a check found wrong once the DNS was right and `https://<host>` was asked.
 *
 * - `HTTPS_UNREACHABLE`: nothing answered in time.
 * - `HTTPS_CERTIFICATE_INVALID`: something answered with a certificate that is not the domain's —
 *   not issued yet, expired, or another name's.
 */
export type CustomDomainHttpsProblem = "HTTPS_UNREACHABLE" | "HTTPS_CERTIFICATE_INVALID";

export type CustomDomainProblem = CustomDomainDnsProblem | CustomDomainHttpsProblem;

/** A shop's domain as anyone is told of it, in `PublicStore.customDomain`. */
export interface PublicCustomDomain {
  /** The bare host: lower case, no scheme, no `www.`, no port, no trailing dot. */
  host: string;
  status: CustomDomainStatus;
}

/** A shop's domain as its owner reads it. */
export interface CustomDomain extends PublicCustomDomain {
  /** ISO-8601, when it was last checked; null when it never was. */
  checkedAt: string | null;
  /**
   * What the last check found wrong; null when it found nothing, or none was run. An `ACTIVE` domain
   * may carry one: it stays active, and this is what its last check found.
   */
  problem: CustomDomainProblem | null;
}

/** `www.<host>`, checked apart. A warning for the shopkeeper: the domain goes active without it. */
export interface CustomDomainWwwCheck {
  problem: CustomDomainDnsProblem | null;
  /** The `A` records found for `www.<host>`. Empty when it has none or DNS did not answer. */
  addresses: string[];
}

/** One check of a shop's domain, as it was just run. Only `problem` is kept afterwards. */
export interface CustomDomainCheck {
  /** What keeps the domain from opening the shop; null when nothing does. */
  problem: CustomDomainProblem | null;
  /** The host's `A` records as found — where `DNS_POINTS_ELSEWHERE` points. Empty when it has none or DNS did not answer. */
  addresses: string[];
  www: CustomDomainWwwCheck;
}

/**
 * `GET /stores/:slug/custom-domain`, and what saving (`PUT`) and checking again
 * (`POST …/custom-domain/check`) answer.
 */
export interface CustomDomainOverview {
  /**
   * The addresses the shopkeeper points the domain's `A` record at. Null where this deployment
   * names none: a domain can be read and removed there, and neither saved nor checked.
   */
  targetIps: string[] | null;
  /** Null while the shop has none. */
  domain: CustomDomain | null;
  /** The check this very answer ran; null on a plain read. */
  check: CustomDomainCheck | null;
}

/** `PUT /stores/:slug/custom-domain`: save the shop's domain, or replace the one saved. */
export interface SaveCustomDomainPayload {
  /**
   * The domain as the shopkeeper pasted it: `https://www.MinhaLoja.com.br/` is read as
   * `minhaloja.com.br`. An internationalised name goes in its ASCII form (`xn--…`).
   */
  domain: string;
}

/**
 * One row of `GET /custom-domains`: which host is which shop's. Read by the web over the internal
 * network, with no session, to resolve a request by its host. Every saved domain is listed, the
 * pending ones too.
 */
export interface CustomDomainEntry {
  host: string;
  /** The shop's slug. */
  slug: string;
  status: CustomDomainStatus;
}

/**
 * The `errorCode` values the custom-domain endpoints answer, beyond the store's own
 * (`STORE_NOT_FOUND`, `STORE_FORBIDDEN`).
 *
 * - `CUSTOM_DOMAIN_INVALID`: not a host name of at least two labels.
 * - `CUSTOM_DOMAIN_IP_ADDRESS`: an IP address, not a name.
 * - `CUSTOM_DOMAIN_LOCAL`: `localhost`, or a name that only exists inside a network.
 * - `CUSTOM_DOMAIN_NOT_ASCII`: an internationalised name not in its ASCII (`xn--…`) form.
 * - `CUSTOM_DOMAIN_PLATFORM`: the platform's own host, or a subdomain of it.
 * - `CUSTOM_DOMAIN_TAKEN`: another shop has it (409).
 * - `CUSTOM_DOMAIN_UNAVAILABLE`: this deployment names no address to point a domain at (503).
 * - `CUSTOM_DOMAIN_NOT_SET`: a check was asked of a shop with no domain saved (409).
 */
export type CustomDomainErrorCode =
  | "CUSTOM_DOMAIN_INVALID"
  | "CUSTOM_DOMAIN_IP_ADDRESS"
  | "CUSTOM_DOMAIN_LOCAL"
  | "CUSTOM_DOMAIN_NOT_ASCII"
  | "CUSTOM_DOMAIN_PLATFORM"
  | "CUSTOM_DOMAIN_TAKEN"
  | "CUSTOM_DOMAIN_UNAVAILABLE"
  | "CUSTOM_DOMAIN_NOT_SET";
