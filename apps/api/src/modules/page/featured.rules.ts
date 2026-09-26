// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { ComponentKind, ShowcaseProduct } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { pageError } from './page.rules.js';
import { keptPicks } from './product-picks.js';

/**
 * What a featured product may hold: one product of this shop. A deleted one is dropped rather than
 * refused, for the reason `keptPicks` gives; another shop's is refused.
 */
@Injectable()
export class FeaturedRules {
  constructor(private readonly prisma: PrismaService) {}

  /** A write's items, as they are stored: checked against the shop for a featured product, as sent for any other kind. */
  async itemsFor(kind: ComponentKind, storeId: string, items: object[]): Promise<object[]> {
    if (kind !== 'FEATURED_PRODUCT') return items;

    return keptPicks(
      this.prisma,
      storeId,
      items as ShowcaseProduct[],
      () => new BadRequestException(pageError('FEATURED_PRODUCT_INVALID', 'Esse produto não é desta loja.')),
    );
  }
}
