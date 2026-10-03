// Types
import type { OrderLabelVolume } from '@harness-monorepo/contracts';

// App
import type { PrismaService } from '../../../../shared/prisma/prisma.service.js';
import type { MelhorEnvioClient, MelhorEnvioConfig } from '../melhor-envio.client.js';
import type { LabelSources } from './label-parties.js';

/**
 * The box Melhor Envio packs an order's lines in for the service chosen (BEELINK-187): the label's
 * form starts from it, and the shopkeeper corrects it to the box they post. A variant with no weight
 * or size takes the shop's default parcel; a line that has neither, or no answer, suggests nothing.
 */
export async function suggestedVolumeOf(
  prisma: PrismaService,
  melhorEnvio: MelhorEnvioClient,
  { config, token, storeId, sources, serviceId }: { config: MelhorEnvioConfig; token: string; storeId: string; sources: LabelSources; serviceId: number },
): Promise<OrderLabelVolume | null> {
  const { addressZipCode } = sources.store;
  const to = sources.order.deliveryZipCode;
  if (!addressZipCode || !to) return null;
  const [lines, settings] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { storeId, number: sources.order.number } },
      select: { variantId: true, quantity: true, lineTotalCents: true, discountCents: true, variant: { select: { weightGrams: true, lengthMm: true, widthMm: true, heightMm: true } } },
    }),
    prisma.melhorEnvioSettings.findUnique({ where: { storeId } }),
  ]);
  const products = lines.flatMap((line) => {
    const variant = line.variant;
    const weight = variant?.weightGrams ?? settings?.packageWeightGrams ?? null;
    const length = variant?.lengthMm ?? settings?.packageLengthMm ?? null;
    const width = variant?.widthMm ?? settings?.packageWidthMm ?? null;
    const height = variant?.heightMm ?? settings?.packageHeightMm ?? null;
    if (!line.variantId || weight === null || length === null || width === null || height === null) return [];
    const paid = line.lineTotalCents - line.discountCents;
    return [{ id: line.variantId, lengthCm: Math.max(1, Math.ceil(length / 10)), widthCm: Math.max(1, Math.ceil(width / 10)), heightCm: Math.max(1, Math.ceil(height / 10)), weightKg: weight / 1000, insuranceReais: Math.round(paid / line.quantity) / 100, quantity: line.quantity }];
  });
  if (products.length !== lines.length) return null;

  const quoted = await melhorEnvio.quote(config, token, { fromZipCode: addressZipCode, toZipCode: to.replace(/\D/g, ''), products, serviceIds: [serviceId] }).catch(() => []);
  return quoted.find((service) => service.serviceId === serviceId)?.packages[0] ?? null;
}
