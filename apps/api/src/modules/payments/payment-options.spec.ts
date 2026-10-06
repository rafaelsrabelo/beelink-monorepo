// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { AsaasAccountApproval } from '@harness-monorepo/contracts';

// App
import { chargesOnline } from '../integrations/asaas/asaas-acceptance.js';
import { paymentOptionsOf } from './payment-options.js';

const TAKES = { connected: true, pix: true, card: true, maxInstallments: 6, offline: true };

describe("what a shop's checkout offers", () => {
  it("offers what a connected shop takes, with Asaas's least amounts", () => {
    expect(paymentOptionsOf(TAKES)).toEqual({ online: { pix: true, card: true, maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }, offline: true });
  });

  it('is the checkout of before Asaas while the connection is not in good standing, whatever the shop chose', () => {
    expect(paymentOptionsOf({ ...TAKES, connected: false, offline: false })).toEqual({ online: null, offline: true });
  });

  /** BEELINK-278: `connected` is the reading placing an order goes by, and an account read as not approved is false there. */
  it('is the checkout of before Asaas for an account Asaas has not approved, and offers online to one approved or not known', () => {
    const offered = (accountApproval: AsaasAccountApproval | null) =>
      paymentOptionsOf({ ...TAKES, offline: false, connected: chargesOnline({ status: 'CONNECTED', accountApproval }) });

    for (const approval of ['PENDING', 'AWAITING_APPROVAL', 'REJECTED'] as const) expect(offered(approval)).toEqual({ online: null, offline: true });
    for (const approval of ['APPROVED', null] as const) expect(offered(approval)).toMatchObject({ online: { pix: true, card: true }, offline: false });
  });

  it('says when paying on delivery was turned off', () => {
    expect(paymentOptionsOf({ ...TAKES, offline: false })).toMatchObject({ offline: false, online: { pix: true, card: true } });
  });

  it('offers a card switched off in full only, and nothing online with both ways off', () => {
    expect(paymentOptionsOf({ ...TAKES, card: false }).online).toMatchObject({ pix: true, card: false, maxInstallments: 1 });
    expect(paymentOptionsOf({ ...TAKES, pix: false, card: false })).toEqual({ online: null, offline: true });
  });

  it('carries nothing of the account', () => {
    const answer = paymentOptionsOf({ ...TAKES, connectedAt: new Date() } as typeof TAKES);
    expect(Object.keys(answer).sort()).toEqual(['offline', 'online']);
    expect(Object.keys(answer.online ?? {}).sort()).toEqual(['card', 'maxInstallments', 'minimumChargeCents', 'minimumInstallmentCents', 'pix']);
  });
});
