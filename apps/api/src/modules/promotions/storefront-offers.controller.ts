// Nest
import { Controller, Get, Param, Res } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Libs
import type { FastifyReply } from 'fastify';

// Types
import type { StorefrontOffers } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { Public } from '../auth/auth.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { StoresService } from '../stores/stores.service.js';
import { StorefrontOffersResponse } from './dto/offers.response.js';
import { runningPromotions } from './order-discounts.js';
import { PRICES_CHANGE_AT_HEADER } from './promotions.constants.js';
import { firstPurchaseHeadlineOf, nextHeadlineChange, shownFirstPurchaseCoupon } from './shop-offers.js';

/**
 * What a shop says of its offers to anyone: today, its benefit for a first purchase — what kind,
 * how much, whether it applies by itself. Read by the shop window to word its invitation to open an
 * account, and kept there under the shop's tag.
 *
 * It carries no code, ever: whether a code exists is told only to an identified customer, and this
 * answer is the same for a crawler. A coupon reaches it only as a benefit, and only one its
 * shopkeeper switched on to be shown.
 *
 * A headline starts and ends with its promotion's or its coupon's period, which is no write: the
 * instant is on the answer (`x-prices-change-at`), as on a catalogue's, for whoever keeps it. A
 * coupon running out of uses is an order's doing and not on the answer — a kept headline may then
 * outlive it by the reader's minute, and says only that there is something for a first order.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/offers')
export class StorefrontOffersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  @Get()
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: "The shop's benefit for a first purchase, as anyone may be told of it: its kind and amount, never a code" })
  @ApiOkResponse({ type: StorefrontOffersResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async offers(@Param('storeSlug') storeSlug: string, @Res({ passthrough: true }) reply: FastifyReply): Promise<StorefrontOffers> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const now = new Date();
    const [promotions, coupon, changesAt] = await Promise.all([
      runningPromotions(this.prisma, storeId, now),
      shownFirstPurchaseCoupon(this.prisma, storeId, now, this.prisma.coupon.fields.maxUses),
      // Beside the answer, and never its failure: without the instant the reader's own minute still closes.
      nextHeadlineChange(this.prisma, storeId, now).catch(() => null),
    ]);
    if (changesAt) void reply.header(PRICES_CHANGE_AT_HEADER, changesAt.toISOString());

    return { firstPurchase: firstPurchaseHeadlineOf(promotions, coupon) } satisfies StorefrontOffers;
  }
}
