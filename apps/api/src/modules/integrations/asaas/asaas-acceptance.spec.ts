// Libs
import { describe, expect, it, vi } from 'vitest';

// Types
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { AsaasConfig } from './asaas.config.js';

// App
import { AsaasAcceptance, chargesOnline } from './asaas-acceptance.js';

const CONNECTED_AT = new Date('2026-10-01T12:00:00Z');

const deployment = vi.hoisted(() => ({ config: {} as AsaasConfig | null }));
vi.mock('./asaas.config.js', async (original) => ({ ...(await original<typeof import('./asaas.config.js')>()), asaasConfig: () => deployment.config }));

function acceptanceOf(connection: object | null) {
  const prisma = { storeIntegration: { findUnique: vi.fn(async () => connection) }, asaasSettings: { findUnique: vi.fn(async () => null) } } as unknown as PrismaService;
  return new AsaasAcceptance(prisma).of('store-1');
}

describe("whether a shop's Asaas charges (BEELINK-278)", () => {
  it('charges an approved account, and one whose approval is not known', () => {
    expect(chargesOnline({ status: 'CONNECTED', accountApproval: 'APPROVED' })).toBe(true);
    expect(chargesOnline({ status: 'CONNECTED', accountApproval: null })).toBe(true);
  });

  it('does not charge an account read as anything else, a key to be reconnected, or no connection', () => {
    for (const accountApproval of ['PENDING', 'AWAITING_APPROVAL', 'REJECTED'] as const) expect(chargesOnline({ status: 'CONNECTED', accountApproval })).toBe(false);
    expect(chargesOnline({ status: 'NEEDS_RECONNECT', accountApproval: 'APPROVED' })).toBe(false);
    expect(chargesOnline(null)).toBe(false);
  });

  it('reads an unapproved account as not connected, keeping since when its key stands: its charges are still its own', async () => {
    expect(await acceptanceOf({ status: 'CONNECTED', connectedAt: CONNECTED_AT, accountApproval: 'AWAITING_APPROVAL' })).toMatchObject({ connected: false, connectedAt: CONNECTED_AT });
    expect(await acceptanceOf({ status: 'CONNECTED', connectedAt: CONNECTED_AT, accountApproval: null })).toMatchObject({ connected: true, connectedAt: CONNECTED_AT });
    expect(await acceptanceOf({ status: 'NEEDS_RECONNECT', connectedAt: CONNECTED_AT, accountApproval: 'APPROVED' })).toMatchObject({ connected: false, connectedAt: null });
    expect(await acceptanceOf(null)).toMatchObject({ connected: false, connectedAt: null });
  });

  it('charges nothing where no key can be opened', async () => {
    deployment.config = null;
    expect(await acceptanceOf({ status: 'CONNECTED', connectedAt: CONNECTED_AT, accountApproval: 'APPROVED' })).toMatchObject({ connected: false, connectedAt: null });
  });
});
