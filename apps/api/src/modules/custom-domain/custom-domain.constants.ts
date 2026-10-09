// Types
import type { CustomDomainErrorCode, CustomDomainProblem, CustomDomainStatus } from '@harness-monorepo/contracts';

/** The closed unions, as values Swagger and the mappers can range over. Checked against the contract. */
export const CUSTOM_DOMAIN_STATUSES = ['PENDING', 'ACTIVE'] as const satisfies readonly CustomDomainStatus[];
export const CUSTOM_DOMAIN_PROBLEMS = [
  'DNS_NOT_FOUND',
  'DNS_POINTS_ELSEWHERE',
  'DNS_LOOKUP_FAILED',
  'HTTPS_UNREACHABLE',
  'HTTPS_CERTIFICATE_INVALID',
] as const satisfies readonly CustomDomainProblem[];

/** A shopkeeper waits on a check with the form open: each lookup gives up after this long. */
export const CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS = 3_000;

/** The whole of asking `https://<host>` — connecting, the handshake and the answer's first line. */
export const CUSTOM_DOMAIN_PROBE_TIMEOUT_MS = 5_000;

/**
 * What the probe asks the domain for: a file the web serves to anyone, with no session and no shop
 * (`apps/web/src/app/favicon.ico`). Its status is not read — any answer over a certificate that is
 * the domain's own says the server routes the host and holds its certificate.
 */
export const CUSTOM_DOMAIN_PROBE_PATH = '/favicon.ico';

/** Longer than any domain, so a pasted address with its path still arrives to be read; far short of a body worth refusing by size. */
export const CUSTOM_DOMAIN_INPUT_MAX_LENGTH = 2_000;

/** Keeps every code this module answers inside the contract's union. */
export function customDomainError(errorCode: CustomDomainErrorCode, message: string): { errorCode: CustomDomainErrorCode; message: string } {
  return { errorCode, message };
}
