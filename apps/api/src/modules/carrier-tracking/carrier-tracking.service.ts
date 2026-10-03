// Nest
import { ConflictException, Injectable } from '@nestjs/common';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { OrdersService } from '../orders/orders.service.js';

/** What Melhor Envio says of one label, by the webhook or by the periodic check. */
export interface LabelUpdate {
  /** Melhor Envio's id for the label. */
  labelId: string;
  /** Its status there: `posted`, `delivered`, `canceled`… */
  status: string;
  trackingCode: string | null;
  trackingUrl: string | null;
}

/** What came of an update: applied, already applied before, or about a label bee-link never bought. */
export type LabelUpdateResult = 'APPLIED' | 'DUPLICATE' | 'UNKNOWN';

/** Melhor Envio's statuses that move an order, and where to. */
const MOVES = { posted: 'OUT_FOR_DELIVERY', delivered: 'DELIVERED' } as const;

const isDuplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * A carrier's word on a label, applied to its order (BEELINK-188): the tracking into the delivery
 * record as soon as there is one, posted moving the order out for delivery, delivered delivering it,
 * cancelled cancelling the label. Each status of each label is applied once — its key is written as
 * it is applied — whether the webhook brings it twice, or the webhook and the check both do.
 */
@Injectable()
export class CarrierTracking {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  async apply(update: LabelUpdate): Promise<LabelUpdateResult> {
    const label = await this.prisma.orderLabel.findFirst({ where: { providerId: update.labelId }, include: { order: { select: { id: true, number: true } } } });
    if (!label) return 'UNKNOWN';

    // The tracking is no event of its own: it may come with any status, and writing it twice is harmless.
    if (update.trackingCode && update.trackingCode !== label.trackingCode) {
      await this.prisma.$transaction([
        this.prisma.orderLabel.update({ where: { orderId: label.orderId }, data: { trackingCode: update.trackingCode } }),
        // The label's code replaces the label's code, or fills an empty one; one the shopkeeper typed stays.
        this.prisma.orderDelivery.updateMany({
          where: { orderId: label.orderId, OR: [{ trackingCode: null }, ...(label.trackingCode ? [{ trackingCode: label.trackingCode }] : [])] },
          data: { trackingCode: update.trackingCode, ...(update.trackingUrl ? { trackingUrl: update.trackingUrl.replace(/\s/g, '').slice(0, 500) } : {}) },
        }),
      ]);
    }

    const status = update.status.toLowerCase();
    const key = `melhor-envio:${update.labelId}:${status}`;
    try {
      await this.prisma.integrationEvent.create({ data: { key, provider: 'MELHOR_ENVIO' } });
    } catch (error) {
      if (isDuplicate(error)) return 'DUPLICATE';
      throw error;
    }

    try {
      if (status === 'canceled' || status === 'cancelled') {
        await this.prisma.orderLabel.updateMany({ where: { orderId: label.orderId, status: { not: 'CANCELLED' } }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      } else if (status in MOVES) {
        await this.orders.moveByCarrier(label.storeId, label.order.number, MOVES[status as keyof typeof MOVES]).catch((error: unknown) => {
          // An order the shop cancelled stays cancelled, whatever the carrier says of its parcel.
          if (!(error instanceof ConflictException)) throw error;
        });
      }
    } catch (error) {
      // Not applied after all: the key goes, so the next delivery of the same event tries again.
      await this.prisma.integrationEvent.delete({ where: { key } }).catch(() => undefined);
      throw error;
    }
    return 'APPLIED';
  }
}
