// Types
import type { OnlinePaymentMethod, OrderPaymentBelowMinimumDetails } from '@harness-monorepo/contracts';

// App
import { ASAAS_MINIMUM_CHARGE_CENTS, ASAAS_MINIMUM_INSTALLMENT_CENTS } from '../integrations/asaas/asaas-limits.js';

const DAY_MS = 86_400_000;
/** Brasília keeps no summer time since 2019: its day is UTC's, three hours later. */
const BRASILIA_OFFSET_MS = 3 * 3_600_000;

/** How long a charge may be paid, in days after the one it is made on: a Pix until the next day, a card for three. */
const DUE_IN_DAYS: Record<OnlinePaymentMethod, number> = { PIX: 1, CREDIT_CARD: 3 };

/** The day it is in Brasília, `YYYY-MM-DD`: an order placed at 22h there is still today's, though UTC is already tomorrow. */
export function brasiliaDayOf(at: Date): string {
  return new Date(at.getTime() - BRASILIA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The due day a charge made now is sent with. */
export function dueDateOf(method: OnlinePaymentMethod, now: Date): string {
  return brasiliaDayOf(new Date(now.getTime() + DUE_IN_DAYS[method] * DAY_MS));
}

/** The last instant of a day of Brasília's calendar. */
export function endOfBrasiliaDay(day: string): Date {
  return new Date(`${day}T23:59:59.999-03:00`);
}

/** How many instalments a total splits into, none of them under Asaas's least: zero when the total itself is under the least charge. */
export function installmentsRoomOf(totalCents: number): number {
  return totalCents < ASAAS_MINIMUM_CHARGE_CENTS ? 0 : Math.floor(totalCents / ASAAS_MINIMUM_INSTALLMENT_CENTS);
}

/**
 * The instalments a charge goes out in: what the customer chose, less when the total no longer
 * splits that far — a fee lowered after the order was placed must not leave it unpayable.
 */
export function installmentsFor(method: OnlinePaymentMethod, totalCents: number, chosen: number): number {
  return method === 'CREDIT_CARD' ? Math.max(1, Math.min(chosen, installmentsRoomOf(totalCents))) : 1;
}

/** Why Asaas would not charge this total in these instalments, as the refusal's details — null when it would. */
export function belowMinimumOf(totalCents: number, installments: number): OrderPaymentBelowMinimumDetails | null {
  const maxInstallments = installmentsRoomOf(totalCents);
  return installments <= maxInstallments ? null : { minimumCents: ASAAS_MINIMUM_CHARGE_CENTS, maxInstallments };
}

export const isOnlineMethod = (method: string): method is OnlinePaymentMethod => method === 'PIX' || method === 'CREDIT_CARD';
