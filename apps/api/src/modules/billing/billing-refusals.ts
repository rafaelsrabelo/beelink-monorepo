// Nest
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

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
