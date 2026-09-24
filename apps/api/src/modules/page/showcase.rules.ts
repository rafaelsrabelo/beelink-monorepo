// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { ComponentKind, ProductSource, ShowcaseProduct } from '@harness-monorepo/contracts';
import type { ComponentDto } from './dto/page.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { pageError } from './page.rules.js';

/** What a showcase holds, as the row writes it. */
export interface ShowcaseFields {
  source: ProductSource;
  sourceCategoryId: string | null;
  limit: number | null;
  items: object[];
}

type ShowcaseInput = Pick<ComponentDto, 'source' | 'sourceCategoryId' | 'limit'>;

/**
 * What a showcase of products may hold, and what makes one invalid.
 *
 * Apart from `PageRules` because the showcase is the one kind whose fields depend on each other —
 * a CATEGORY needs its category, a SELECTION its products — and on rows of other tables; the rest
 * of the page module checks a field against a list.
 *
 * What is written is always normalized: `sourceCategoryId` only on CATEGORY, `items` only on
 * SELECTION. Switching the source clears what the old one used, so no column is left holding a value
 * nothing reads.
 */
@Injectable()
export class ShowcaseRules {
  constructor(private readonly prisma: PrismaService) {}

  /** A showcase's fields sent to a kind that is not one are refused rather than stored for nobody. */
  refuseOn(kind: ComponentKind, dto: ShowcaseInput): void {
    if (kind === 'PRODUCTS') return;

    if ([dto.source, dto.sourceCategoryId, dto.limit].some((value) => value !== undefined && value !== null)) {
      throw new BadRequestException(
        pageError('SHOWCASE_SOURCE_INVALID', 'Só uma vitrine de produtos tem fonte e limite.'),
      );
    }
  }

  /** A new showcase: all of the shop's products unless it says otherwise. */
  async forCreate(storeId: string, dto: ShowcaseInput, items: object[]): Promise<ShowcaseFields> {
    const source = dto.source ?? 'ALL';
    await this.refuseForeign(storeId, dto.sourceCategoryId ?? null, items);

    return this.normalized({ source, sourceCategoryId: dto.sourceCategoryId ?? null, limit: dto.limit ?? null, items });
  }

  /**
   * A patch of a showcase, merged into what it holds, or nothing when the patch touches none of it.
   *
   * Only what the patch sends is checked against the shop. What is already stored was checked when it
   * was written, and a product deleted since is not the shopkeeper's mistake: were it checked here,
   * renaming a showcase would fail on a product nobody chose to remove, and the read already lets a
   * missing one drop out.
   */
  async forUpdate(
    storeId: string,
    componentId: string,
    dto: ShowcaseInput,
    items: object[] | undefined,
  ): Promise<ShowcaseFields | null> {
    const touched = dto.source !== undefined || dto.sourceCategoryId !== undefined || dto.limit !== undefined;
    if (!touched && items === undefined) return null;

    const stored = await this.prisma.storeComponent.findUniqueOrThrow({
      where: { id: componentId },
      select: { source: true, sourceCategoryId: true, limit: true, items: true },
    });

    await this.refuseForeign(storeId, dto.sourceCategoryId ?? null, items ?? []);

    return this.normalized({
      source: dto.source ?? stored.source ?? 'ALL',
      sourceCategoryId: dto.sourceCategoryId !== undefined ? dto.sourceCategoryId : stored.sourceCategoryId,
      limit: dto.limit !== undefined ? dto.limit : stored.limit,
      items: items ?? (Array.isArray(stored.items) ? (stored.items as object[]) : []),
    });
  }

  /** A category or a product sent for this showcase has to be this shop's own. */
  private async refuseForeign(storeId: string, categoryId: string | null, items: object[]): Promise<void> {
    if (categoryId) {
      const owned = await this.prisma.productCategory.count({ where: { id: categoryId, storeId } });

      if (!owned) {
        throw new BadRequestException(pageError('SHOWCASE_CATEGORY_INVALID', 'Essa categoria não é desta loja.'));
      }
    }

    const productIds = (items as ShowcaseProduct[]).map((row) => row.productId);

    if (productIds.length) {
      const owned = await this.prisma.product.count({ where: { id: { in: productIds }, storeId } });

      if (owned !== productIds.length) {
        throw new BadRequestException(pageError('SHOWCASE_PRODUCTS_INVALID', 'Um dos produtos não é desta loja.'));
      }
    }
  }

  /** The source's own requirement, and nothing kept that the source does not read. */
  private normalized(next: ShowcaseFields): ShowcaseFields {
    if (next.source === 'CATEGORY' && !next.sourceCategoryId) {
      throw new BadRequestException(pageError('SHOWCASE_CATEGORY_INVALID', 'Escolha a categoria da vitrine.'));
    }

    if (next.source === 'SELECTION' && next.items.length === 0) {
      throw new BadRequestException(pageError('SHOWCASE_PRODUCTS_INVALID', 'Escolha ao menos um produto.'));
    }

    return {
      source: next.source,
      sourceCategoryId: next.source === 'CATEGORY' ? next.sourceCategoryId : null,
      limit: next.limit,
      items: next.source === 'SELECTION' ? next.items : [],
    };
  }
}
