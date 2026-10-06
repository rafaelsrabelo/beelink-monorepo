// Types
import type { StorefrontPaymentOptions } from '@harness-monorepo/contracts';
import type { AsaasAcceptanceOf } from '../integrations/asaas/asaas-acceptance.js';

// App
import { ASAAS_MINIMUM_CHARGE_CENTS, ASAAS_MINIMUM_INSTALLMENT_CENTS } from '../integrations/asaas/asaas-limits.js';

/**
 * What a shop's checkout offers (BEELINK-205), from the very reading an order is refused by: the
 * checkout must never offer what placing would refuse. A shop whose Asaas is not in good standing
 * sells as before it — its own labels, and nothing charged — and so does one whose account Asaas has
 * not approved (BEELINK-278): `connected` is false of both. Of the account itself nothing is said.
 */
export function paymentOptionsOf(takes: Pick<AsaasAcceptanceOf, 'connected' | 'pix' | 'card' | 'maxInstallments' | 'offline'>): StorefrontPaymentOptions {
  if (!takes.connected) return { online: null, offline: true };
  if (!takes.pix && !takes.card) return { online: null, offline: takes.offline };
  return {
    online: {
      pix: takes.pix,
      card: takes.card,
      maxInstallments: takes.card ? takes.maxInstallments : 1,
      minimumChargeCents: ASAAS_MINIMUM_CHARGE_CENTS,
      minimumInstallmentCents: ASAAS_MINIMUM_INSTALLMENT_CENTS,
    },
    offline: takes.offline,
  };
}
