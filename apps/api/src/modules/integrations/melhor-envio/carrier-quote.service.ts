// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { CarriersVerdict, ShippingOption } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { quoteProductsOf } from '../carrier-parcels.js';
import { melhorEnvioConfig, MelhorEnvioClient } from './melhor-envio.client.js';
import { MelhorEnvioService } from './melhor-envio.service.js';

/** One line of the cart to quote: which variant, how many, and what the customer pays for one. */
export interface CarrierCartItem {
  variantId: string;
  quantity: number;
  unitValueCents: number;
}

/** The carriers for one cart and address: the verdict, and the options — none unless it is `QUOTED`. */
export interface CarrierQuoteRead {
  verdict: CarriersVerdict;
  options: ShippingOption[];
}

/** A cart on a checkout is quoted again at every change of anything else; the carriers' answer to the same cart holds this long. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 2_000;

const none = (verdict: CarriersVerdict): CarrierQuoteRead => ({ verdict, options: [] });

/**
 * What the carriers of a shop's Melhor Envio account charge to take a cart to an address
 * (BEELINK-185): asked with the shop's own token, from its CEP, of the services it chose, the days it
 * takes to post added to each window. It never fails a quote: a Melhor Envio that is slow, down or
 * no longer accepting the connection answers `UNAVAILABLE`, and the shop's own options stand.
 *
 * Whether the shop sells by carrier at all is its delivery rules' to say (BEELINK-175); this answers
 * `OFF` only for what it knows — no app here, no account connected, no service chosen.
 */
@Injectable()
export class CarrierQuotes {
  private readonly logger = new Logger(CarrierQuotes.name);
  private readonly cache = new Map<string, { options: ShippingOption[]; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly connection: MelhorEnvioService,
    private readonly melhorEnvio: MelhorEnvioClient,
  ) {}

  async forCart(storeId: string, toZipCode: string, items: readonly CarrierCartItem[], now = Date.now()): Promise<CarrierQuoteRead> {
    const config = melhorEnvioConfig();
    if (!config) return none({ status: 'OFF' });

    const [integration, settings, store, variants] = await Promise.all([
      this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: 'MELHOR_ENVIO' } }, select: { status: true } }),
      this.prisma.melhorEnvioSettings.findUnique({ where: { storeId } }),
      this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { addressZipCode: true } }),
      this.prisma.productVariant.findMany({ where: { id: { in: items.map((item) => item.variantId) } }, select: { id: true, weightGrams: true, lengthMm: true, widthMm: true, heightMm: true } }),
    ]);
    // A shop that never saved its choices offers every service; one that saved none offers no carrier.
    if (!integration || settings?.serviceIds.length === 0) return none({ status: 'OFF' });
    if (integration.status !== 'CONNECTED') return none({ status: 'UNAVAILABLE' });
    if (!store.addressZipCode) return none({ status: 'NOT_QUOTABLE', reason: 'NO_ORIGIN' });

    const parcels = new Map(variants.map((variant) => [variant.id, variant]));
    const cart = items.map((item) => ({ ...item, ...(parcels.get(item.variantId) ?? { weightGrams: null, lengthMm: null, widthMm: null, heightMm: null }) }));
    const { packageLengthMm: lengthMm, packageWidthMm: widthMm, packageHeightMm: heightMm } = settings ?? {};
    const products = quoteProductsOf(cart, lengthMm != null && widthMm != null && heightMm != null ? { lengthMm, widthMm, heightMm } : null);
    if (typeof products === 'string') return none({ status: 'NOT_QUOTABLE', reason: products });

    const serviceIds = settings ? settings.serviceIds : null;
    const handlingDays = settings?.handlingDays ?? 1;
    const key = JSON.stringify([storeId, store.addressZipCode, toZipCode, serviceIds, handlingDays, [...products].sort((a, b) => a.id.localeCompare(b.id))]);
    const hit = this.cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) return { verdict: { status: 'QUOTED' }, options: hit.options };

    try {
      const token = await this.connection.accessTokenFor(storeId);
      const services = await this.melhorEnvio.quote(config, token, { fromZipCode: store.addressZipCode, toZipCode, products, serviceIds });
      const options = services
        .sort((a, b) => a.priceCents - b.priceCents || a.daysTo - b.daysTo)
        .map((service): ShippingOption => ({
          kind: 'CARRIER',
          carrier: { serviceId: service.serviceId, service: service.service, company: service.company },
          feeCents: service.priceCents,
          window: { unit: 'BUSINESS_DAYS', from: service.daysFrom + handlingDays, to: service.daysTo + handlingDays },
          freeAbove: false,
        }));

      this.cache.delete(key);
      this.cache.set(key, { options, at: now });
      // A Map keeps its insertion order: the first key is the one written longest ago.
      if (this.cache.size > CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
      return { verdict: { status: 'QUOTED' }, options };
    } catch (error) {
      // Its message, never the request: the request carries the shop's token.
      this.logger.warn({ storeId, reason: error instanceof Error ? error.message : 'unknown' }, 'Melhor Envio did not quote a cart');
      return none({ status: 'UNAVAILABLE' });
    }
  }
}
