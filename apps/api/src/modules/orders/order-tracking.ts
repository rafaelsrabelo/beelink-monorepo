// Types
import type { OrderDelivery } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

/** The Correios' own tracking page. None of theirs opens an object from the address, so the code is shown beside it to copy. */
export const CORREIOS_TRACKING_URL = 'https://rastreamento.correios.com.br/app/index.php';

/** A Correios object code: two letters, nine digits, two letters — `AB123456789BR`. */
const CORREIOS_CODE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

type DeliveryRow = Prisma.OrderDeliveryGetPayload<object>;

/** A day of the calendar as the contract writes it; the column holds it at midnight UTC. */
function dayOf(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * A delivery as both sides read it. Its link is the shopkeeper's, else the Correios' page for a code
 * of theirs — the common case of a small shop, which should not have to paste the obvious.
 */
export function toOrderDelivery(row: DeliveryRow): OrderDelivery {
  const code = row.trackingCode?.toUpperCase() ?? null;
  return {
    kind: row.kind,
    carrier: row.carrier,
    service: row.service,
    trackingCode: row.trackingCode,
    trackingUrl: row.trackingUrl ?? (code && CORREIOS_CODE.test(code) ? CORREIOS_TRACKING_URL : null),
    estimateFrom: dayOf(row.estimateFrom),
    estimateTo: dayOf(row.estimateTo),
  };
}
