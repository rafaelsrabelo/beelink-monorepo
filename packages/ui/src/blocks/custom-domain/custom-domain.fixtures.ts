// Block
import type { CustomDomainView } from "@harness-monorepo/ui/lib/custom-domain"

/** Documentation addresses (RFC 5737): the server's stand-in, and somewhere that is not it. Nobody's servers. */
export const TARGET_IP = "203.0.113.10"
export const PARKING_IP = "198.51.100.7"

/** The page's address at the platform, as the app works it out from the request. */
export const ADDRESS = "beelink.biz/lessari"
export const HOST = "lessari.com.br"

/** Saved, and its name has no `A` record yet: the first thing a domain reads as. */
export const pendingNotFound: CustomDomainView = { host: HOST, status: "PENDING", checkedAt: "08/10/2026, 14:20", problem: "DNS_NOT_FOUND", addresses: [], wwwOff: false }

/** Still on the registrar's parking page, as the check that just ran found it. */
export const pendingElsewhere: CustomDomainView = { ...pendingNotFound, problem: "DNS_POINTS_ELSEWHERE", addresses: [PARKING_IP] }

/** The same domain as a plain read tells it: the problem, and not where the records point. */
export const pendingElsewhereRead: CustomDomainView = { ...pendingElsewhere, addresses: [] }

export const pendingLookupFailed: CustomDomainView = { ...pendingNotFound, problem: "DNS_LOOKUP_FAILED" }

/** The DNS is right and no certificate answers for the name yet: the wait is on the platform's side. */
export const pendingCertificate: CustomDomainView = { ...pendingNotFound, problem: "HTTPS_CERTIFICATE_INVALID", addresses: [TARGET_IP] }

export const pendingUnreachable: CustomDomainView = { ...pendingNotFound, problem: "HTTPS_UNREACHABLE", addresses: [TARGET_IP] }

export const active: CustomDomainView = { host: HOST, status: "ACTIVE", checkedAt: "08/10/2026, 16:05", problem: null, addresses: [], wwwOff: false }

/** Active, and a later check failed: it stays active, and says what that check found. */
export const activeWithProblem: CustomDomainView = { ...active, problem: "DNS_LOOKUP_FAILED" }

/** Active without `www`, as the check that just ran found it. */
export const activeWithoutWww: CustomDomainView = { ...active, addresses: [TARGET_IP], wwwOff: true }
