// Nest
import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { PageLockedDetails, PageLockReason, StoreErrorCode } from '@harness-monorepo/contracts';

// App
import { billingError } from './billing.constants.js';

/*
  The refusals more than one of the billing services answers with. Each service keeps its own beside
  the rule that throws it.
*/

export function unavailable(message = "This deployment has no Asaas account of bee-link's own to charge at"): ServiceUnavailableException {
  return new ServiceUnavailableException(billingError('BILLING_UNAVAILABLE', message));
}

/** Nobody is charged before saying who is: the panel asks for the name and the document on this code. */
export function accountRequired(): ConflictException {
  return new ConflictException(billingError('BILLING_ACCOUNT_REQUIRED', 'The account never gave who is charged for its pages: PUT /billing/account first'));
}

/** A locked page's panel, to its owner (BEELINK-223): why it is locked travels as `details`, which the panel words. */
export function pageLocked(reason: PageLockReason): ForbiddenException {
  return new ForbiddenException({ ...billingError('PAGE_LOCKED', `The page is locked (${reason}): only its subscription answers until it is paid`), details: { reason } satisfies PageLockedDetails });
}

/** A locked page's shop window, to anyone (BEELINK-223): unavailable, and never why. */
export function storeUnavailable(): ForbiddenException {
  return new ForbiddenException({ errorCode: 'STORE_UNAVAILABLE' satisfies StoreErrorCode, message: 'This shop is unavailable right now' });
}
