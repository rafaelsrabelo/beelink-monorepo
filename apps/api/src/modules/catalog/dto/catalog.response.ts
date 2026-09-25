// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Types
import type {
  CardOptionSummary,
  PriceRange,
  Product,
  ProductCategory,
  ProductPage,
  ProductOrigin,
  ProductStatus,
  PublicProduct,
  PublicProductCard,
  PublicProductCategory,
  PublicProductImage,
  StorefrontCatalog,
  StorefrontSort,
} from '@harness-monorepo/contracts';

// App
import { STOREFRONT_SORTS } from '../catalog-filters.js';
import { PRODUCT_ORIGINS, PRODUCT_STATUSES, PRODUCTS_PAGE_SIZE } from '../catalog.constants.js';
import { AppliedCatalogFilterResponse, CatalogFacetsResponse } from './listing.response.js';

/**
 * The shapes out, for Swagger. Each `implements` its contract type, so a field added to the wire
 * and forgotten here fails to compile rather than quietly leaving /api/docs describing last week.
 */

export class PublicProductCategoryResponse implements PublicProductCategory {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'blusas' }) slug!: string;
  @ApiProperty({ example: 'Blusas' }) name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'proteinas',
    description: 'The category this sits under. Null is a top level; there is no third.',
  })
  parentSlug!: string | null;

  @ApiProperty({
    description: 'Available products in it AND in its subcategories. Zero hides it from the window.',
  })
  productCount!: number;
}

export class ProductCategoryResponse
  extends PublicProductCategoryResponse
  implements ProductCategory
{
  @ApiProperty() position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PublicProductImageResponse implements PublicProductImage {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ nullable: true, type: String }) alt!: string | null;
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'The option values the photo is of. Empty: every combination. One option widens, several narrow.',
  })
  optionValueIds!: string[];
}

export class PriceRangeResponse implements PriceRange {
  @ApiProperty({ example: 6990, description: 'Whole cents; the same as priceCents.' }) minCents!: number;
  @ApiProperty({ example: 20990, description: 'Whole cents.' }) maxCents!: number;
}

export class CardOptionSummaryResponse implements CardOptionSummary {
  @ApiProperty({ example: 'Sabor' }) name!: string;
  @ApiProperty({ example: 4 }) valueCount!: number;
}

export class PublicProductCardResponse implements PublicProductCard {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'blusa-feminina-tomara-que-caia' }) slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 4990, description: 'Whole cents.' }) priceCents!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole cents, or null for no discount.' })
  compareAtPriceCents!: number | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) categorySlug!: string | null;
  @ApiProperty({ type: PriceRangeResponse, description: 'The cheapest and dearest variant a customer can order.' })
  priceRange!: PriceRangeResponse;
  @ApiProperty({
    required: false,
    description: 'Whether it sells combinations. On the shop window\'s shelves only; absent reads as "choose on the page".',
  })
  hasOptions?: boolean;
  @ApiProperty({
    required: false,
    type: [String],
    description: "Up to five photos in the shopkeeper's order, the cover first. On the shop window's shelves and showcases only.",
  })
  imageUrls?: string[];
  @ApiProperty({
    required: false,
    nullable: true,
    type: CardOptionSummaryResponse,
    description: 'The first option and how many values it offers ("4 sabores"); null without options. On the shelves and showcases only.',
  })
  optionSummary?: CardOptionSummaryResponse | null;
}

export class PublicProductResponse extends PublicProductCardResponse implements PublicProduct {
  @ApiProperty({ description: 'The shop counts this product and has none left. Derived, never the count.' })
  soldOut!: boolean;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ type: [PublicProductImageResponse] }) images!: PublicProductImageResponse[];
  @ApiPropertyOptional({ type: PublicProductCategoryResponse, nullable: true })
  category!: PublicProductCategoryResponse | null;
}

export class ProductResponse extends PublicProductResponse implements Product {
  @ApiProperty() position!: number;
  @ApiProperty({ enum: PRODUCT_STATUSES }) status!: ProductStatus;
  @ApiProperty({ enum: PRODUCT_ORIGINS, nullable: true }) origin!: ProductOrigin | null;
  // Owner-only, all of them: they extend PublicProductResponse rather than being added to it.
  @ApiProperty({ nullable: true, type: Number, description: 'Whole cents.' }) costCents!: number | null;
  @ApiProperty({ nullable: true, type: String }) sku!: string | null;
  @ApiProperty({ nullable: true, type: String }) barcode!: string | null;
  @ApiProperty() trackStock!: boolean;
  @ApiProperty({ nullable: true, type: Number }) stockQuantity!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Grams.' }) weightGrams!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Millimetres.' }) lengthMm!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Millimetres.' }) widthMm!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Millimetres.' }) heightMm!: number | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}


/**
 * One page of the panel's list, and what it is a page of.
 *
 * `total` counts the filter and not the page — it is what the pager divides. `page` and `pageSize`
 * are the bounds that were actually used, never the ones that were asked for, so a pager drawn from
 * this answer cannot offer a page that is not there.
 */
export class ProductPageResponse implements ProductPage {
  @ApiProperty({ type: [ProductResponse] }) products!: ProductResponse[];
  @ApiProperty({ description: 'How many match the filter, across every page.' }) total!: number;
  @ApiProperty({ description: '1-based.' }) page!: number;
  @ApiProperty() pageSize!: number;
}

/**
 * Everything a shop window needs to draw itself, in one answer. Two round trips for a page that
 * cannot render without both would be two chances for one of them to be stale against the other.
 */
export class StorefrontCatalogResponse implements StorefrontCatalog {
  @ApiProperty({
    type: [PublicProductCategoryResponse],
    description: 'Every category the shop has, not the ones this filter left.',
  })
  categories!: PublicProductCategory[];

  @ApiProperty({ type: [PublicProductCardResponse], description: 'One page of the match.' })
  products!: PublicProductCard[];

  @ApiProperty({
    example: 137,
    description: 'How many products the filter matched altogether, never how many this page carries.',
  })
  total!: number;

  @ApiProperty({ example: 1, minimum: 1, description: '1-based, and the page actually served.' })
  page!: number;

  @ApiProperty({ example: PRODUCTS_PAGE_SIZE, description: 'The page size actually served.' })
  pageSize!: number;

  @ApiProperty({ enum: STOREFRONT_SORTS, description: 'The order served.' })
  sort!: StorefrontSort;

  @ApiProperty({ type: CatalogFacetsResponse, description: 'Each facet counts under every filter but its own.' })
  facets!: CatalogFacetsResponse;

  @ApiProperty({ type: [AppliedCatalogFilterResponse] })
  applied!: AppliedCatalogFilterResponse[];
}
