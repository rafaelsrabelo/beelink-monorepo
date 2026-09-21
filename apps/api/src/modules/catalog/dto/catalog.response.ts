// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Types
import type {
  Product,
  ProductCategory,
  PublicProduct,
  PublicProductCard,
  PublicProductCategory,
  PublicProductImage,
  StorefrontCatalog,
} from '@harness-monorepo/contracts';

// App
import { PRODUCTS_PAGE_SIZE } from '../catalog.constants.js';

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
}

export class PublicProductResponse extends PublicProductCardResponse implements PublicProduct {
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ type: [PublicProductImageResponse] }) images!: PublicProductImageResponse[];
  @ApiPropertyOptional({ type: PublicProductCategoryResponse, nullable: true })
  category!: PublicProductCategoryResponse | null;
}

export class ProductResponse extends PublicProductResponse implements Product {
  @ApiProperty() position!: number;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
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
}
