// Types
import type { OnlinePaymentMethod } from '@harness-monorepo/contracts';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import type { AsaasCharge } from '../integrations/asaas/asaas.client.js';
import { statusSaidBy, wasPaid } from './payment-status.js';
import { isOnlineMethod } from './payment-terms.js';

/**
 * One thing to pay, as Asaas holds it: a charge in full, or a whole instalment plan — which Asaas
 * keeps as one charge per instalment — read as the one payment it is to the order.
 */
export interface ChargePlan {
  /** The charge's id; the first instalment's, on a plan. */
  id: string;
  installmentId: string | null;
  /** Asaas's word; on a plan, that of the instalment furthest along — one paid is the order paid. */
  status: string;
  deleted: boolean;
  billingType: string;
  totalCents: number;
  installments: number;
  /** `YYYY-MM-DD`; the first instalment's, on a plan. */
  dueDate: string;
  invoiceUrl: string | null;
}

/** What an order asks to be charged with now. */
export interface WantedCharge {
  orderId: string;
  method: OnlinePaymentMethod;
  totalCents: number;
  installments: number;
}

const paidRank = (status: string): number => (wasPaid(statusSaidBy(status, null)) ? 1 : 0);

/** Asaas's charges for one order, each plan's instalments read together. */
export function plansOf(charges: readonly AsaasCharge[]): ChargePlan[] {
  const groups = new Map<string, AsaasCharge[]>();
  for (const charge of charges) {
    const key = charge.installmentId ?? charge.id;
    groups.set(key, [...(groups.get(key) ?? []), charge]);
  }
  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));
    const first = ordered[0]!;
    const furthest = ordered.reduce((best, charge) => (paidRank(charge.status) > paidRank(best.status) ? charge : best), first);
    return {
      id: first.id,
      installmentId: first.installmentId,
      status: furthest.status,
      deleted: false,
      billingType: first.billingType,
      totalCents: ordered.reduce((sum, charge) => sum + charge.valueCents, 0),
      installments: ordered.length,
      dueDate: first.dueDate,
      invoiceUrl: first.invoiceUrl,
    } satisfies ChargePlan;
  });
}

/** The charge Asaas answered a creation with, as the plan that was asked for: of a plan, it answers the first instalment alone. */
export function planCreated(charge: AsaasCharge, want: WantedCharge): ChargePlan {
  return {
    id: charge.id,
    installmentId: charge.installmentId,
    status: charge.status,
    deleted: charge.deleted,
    billingType: charge.billingType,
    totalCents: want.totalCents,
    installments: want.installments,
    dueDate: charge.dueDate,
    invoiceUrl: charge.invoiceUrl,
  };
}

export const isPaidPlan = (plan: Pick<ChargePlan, 'status'>): boolean => paidRank(plan.status) > 0;

/** Whether a charge at Asaas is the one the order asks for now: waiting, of that way, amount and split, and not past its day. */
export function planServes(plan: ChargePlan, want: WantedCharge, today: string): boolean {
  return plan.status === 'PENDING' && plan.billingType === want.method && plan.totalCents === want.totalCents && plan.installments === want.installments && plan.dueDate >= today;
}

/**
 * Whether the charge bee-link keeps is still the one the order asks for: waiting, within the time
 * it is offered for, of the order's total as it is now, and made since the shop's connection stands
 * — one from before belongs to a key, perhaps an account, the shop has replaced.
 */
export function rowServes(row: OrderPaymentModel, want: WantedCharge, now: Date, connectedAt: Date | null): boolean {
  return (
    row.status === 'PENDING' &&
    row.expiresAt !== null &&
    row.expiresAt > now &&
    row.amountCents === want.totalCents &&
    row.method === want.method &&
    row.installments === want.installments &&
    connectedAt !== null &&
    row.createdAt >= connectedAt
  );
}

export const methodOfPlan = (plan: ChargePlan, fallback: OnlinePaymentMethod): OnlinePaymentMethod => (isOnlineMethod(plan.billingType) ? plan.billingType : fallback);
