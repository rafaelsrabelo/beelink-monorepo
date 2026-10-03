// Types
import type { OrderLabelBlocker, OrderLabelVolume } from '@harness-monorepo/contracts';

// App
import type { MelhorEnvioCartRequest, MelhorEnvioParty } from '../melhor-envio.client.js';

/** What a label is made of, read from the order, the shop and its settings. */
export interface LabelSources {
  order: {
    number: number;
    status: string;
    fulfillment: string;
    deliveryName: string | null;
    deliveryZipCode: string | null;
    deliveryStreet: string | null;
    deliveryNumber: string | null;
    deliveryComplement: string | null;
    deliveryNeighborhood: string | null;
    deliveryCity: string | null;
    deliveryState: string | null;
    deliveryDocument: string | null;
    customer: { name: string; phone: string | null };
    items: readonly { productName: string; variantLabel: string | null; quantity: number; lineTotalCents: number; discountCents: number }[];
    delivery: { kind: string; carrier: string | null; service: string | null; carrierServiceId: number | null } | null;
  };
  store: {
    name: string;
    whatsappPhone: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZipCode: string | null;
  };
  senderDocument: string | null;
  senderStateRegister: string | null;
  /** The shop's Melhor Envio account, connected and accepted; its e-mail goes on the label. */
  account: { email: string | null } | null;
}

/** A phone as a carrier reads it: the local digits, without Brazil's 55. */
function localPhone(digits: string | null): string | null {
  const only = digits?.replace(/\D/g, '') ?? '';
  if (!only) return null;
  return (only.length === 12 || only.length === 13) && only.startsWith('55') ? only.slice(2) : only;
}

const filled = (value: string | null) => (value?.trim() ? value.trim() : null);

/** What keeps a label from being bought, in the order the screen says them. */
export function labelBlockersOf({ order, store, senderDocument, account }: LabelSources): OrderLabelBlocker[] {
  const blockers: OrderLabelBlocker[] = [];
  if (order.fulfillment !== 'DELIVERY' || order.delivery?.kind !== 'CARRIER' || order.delivery.carrierServiceId === null) blockers.push('NOT_CARRIER');
  if (order.status === 'CANCELLED') blockers.push('ORDER_CANCELLED');
  if (!account) blockers.push('NOT_CONNECTED');
  if (!senderDocument) blockers.push('NO_SENDER_DOCUMENT');
  if (![store.addressStreet, store.addressNumber, store.addressNeighborhood, store.addressCity, store.addressState, store.addressZipCode].every(filled)) blockers.push('NO_ORIGIN');
  if (!order.deliveryDocument) blockers.push('NO_RECIPIENT_DOCUMENT');
  if (![order.deliveryStreet, order.deliveryNumber, order.deliveryNeighborhood, order.deliveryCity, order.deliveryState, order.deliveryZipCode].every(filled)) blockers.push('RECIPIENT_ADDRESS_INCOMPLETE');
  return blockers;
}

/** What the customer paid for each line, after its promotion: what the carrier insures, and what the declaration says. */
function paidOf(item: LabelSources['order']['items'][number]): number {
  return item.lineTotalCents - item.discountCents;
}

/** A carrier measures whole centimetres, and a box a hair over is the next one up. */
const centimetres = (millimetres: number) => Math.max(1, Math.ceil(millimetres / 10));

/**
 * The label as Melhor Envio's cart takes it (BEELINK-187): the shop sends it — its name, address and
 * WhatsApp, the e-mail of its Melhor Envio account, its CPF or CNPJ — to who the order was placed for,
 * at the address and with the CPF photographed on the order; one box, as the shopkeeper measured it;
 * the lines as the declaration of contents. Only called once `labelBlockersOf` says nothing stands.
 */
export function cartRequestOf(sources: LabelSources, volume: OrderLabelVolume, invoiceKey: string | null): MelhorEnvioCartRequest {
  const { order, store } = sources;
  const from: MelhorEnvioParty = {
    name: store.name,
    phone: localPhone(store.whatsappPhone),
    email: sources.account?.email ?? null,
    document: sources.senderDocument!,
    stateRegister: sources.senderStateRegister,
    street: store.addressStreet!,
    number: store.addressNumber!,
    complement: filled(store.addressComplement),
    district: store.addressNeighborhood!,
    city: store.addressCity!,
    state: store.addressState!,
    zipCode: store.addressZipCode!,
  };
  const to: MelhorEnvioParty = {
    name: order.deliveryName ?? order.customer.name,
    phone: localPhone(order.customer.phone),
    email: null,
    document: order.deliveryDocument!,
    stateRegister: null,
    street: order.deliveryStreet!,
    number: order.deliveryNumber!,
    complement: filled(order.deliveryComplement),
    district: order.deliveryNeighborhood!,
    city: order.deliveryCity!,
    state: order.deliveryState!,
    zipCode: order.deliveryZipCode!.replace(/\D/g, ''),
  };
  return {
    serviceId: order.delivery!.carrierServiceId!,
    from,
    to,
    products: order.items.map((item) => ({
      name: (item.variantLabel ? `${item.productName} (${item.variantLabel})` : item.productName).slice(0, 255),
      quantity: item.quantity,
      unitReais: Math.round(paidOf(item) / item.quantity) / 100,
    })),
    volume: { lengthCm: centimetres(volume.lengthMm), widthCm: centimetres(volume.widthMm), heightCm: centimetres(volume.heightMm), weightKg: volume.weightGrams / 1000 },
    insuranceReais: order.items.reduce((sum, item) => sum + paidOf(item), 0) / 100,
    invoiceKey,
    tag: `#${order.number}`,
  };
}
