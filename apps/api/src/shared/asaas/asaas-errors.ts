/*
  What a call to Asaas ends in when it does not end in an answer — the same whoever's account was
  asked, a shop's (`modules/integrations/asaas`) or bee-link's own (`modules/billing`). None of them
  ever carries a key: `asaas-call.ts` is the one place they are thrown from a response.
*/

/** Asaas answered, and said no: the key is not good, belongs to the other environment, or the request was refused. */
export class AsaasRefused extends Error {
  constructor(
    readonly status: number,
    /** Asaas's own code — `invalid_environment`, `invalid_access_token`… — or null when it sent none. */
    readonly code: string | null,
    readonly reason: string,
  ) {
    super(`Asaas refused (${status}${code ? `, ${code}` : ''}): ${reason}`);
  }
}

/** Asaas did not answer, or answered with its own failure: nothing was decided, and trying again may work. */
export class AsaasUnreachable extends Error {}

/**
 * Asaas answered 429: the account's quota — 25,000 requests in twelve hours — or its rate is spent.
 * Nothing was decided; `retryAt` is when Asaas said to ask again (`RateLimit-Reset`), when it said.
 */
export class AsaasThrottled extends AsaasUnreachable {
  constructor(
    message: string,
    readonly retryAt: Date | null,
  ) {
    super(message);
  }
}

/**
 * No answer to a request that creates: Asaas may have made the charge or not. Whoever asked must not
 * ask again before looking for what the first request left.
 */
export class AsaasOutcomeUnknown extends AsaasUnreachable {}
