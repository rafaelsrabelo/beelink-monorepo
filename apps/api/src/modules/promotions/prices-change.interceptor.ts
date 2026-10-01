// Nest
import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';

// Libs
import type { FastifyReply, FastifyRequest } from 'fastify';
import { mergeMap, type Observable } from 'rxjs';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { PRICES_CHANGE_AT_HEADER } from './promotions.constants.js';
import { nextPromotionChange } from './shelf-sale.js';

/**
 * Says, on a public read of a shop's catalogue, when its prices next change by themselves
 * (BEELINK-193): the header `x-prices-change-at`, while a promotion is still to start or to end.
 *
 * A promotion starting or ending is the one price change that is no write. The web keeps these
 * answers for a minute and serves a kept one while it asks again, so on a quiet shop the first
 * visitor of the morning would read the price of a promotion that ended at midnight — and nothing
 * the shopkeeper did would have dropped it. With the instant on the answer, whoever keeps it knows
 * it has gone stale without asking.
 *
 * Read beside the handler, never before it; and a failure of this read leaves the header out rather
 * than failing a page that had its answer.
 */
@Injectable()
export class PricesChangeInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const { params } = http.getRequest<FastifyRequest<{ Params: { storeSlug?: string; slug?: string } }>>();
    const slug = params.storeSlug ?? params.slug;
    const change = slug ? nextPromotionChange(this.prisma, slug, new Date()).catch(() => null) : Promise.resolve(null);

    return next.handle().pipe(
      mergeMap(async (body: unknown) => {
        const at = await change;
        if (at) void http.getResponse<FastifyReply>().header(PRICES_CHANGE_AT_HEADER, at.toISOString());
        return body;
      }),
    );
  }
}
