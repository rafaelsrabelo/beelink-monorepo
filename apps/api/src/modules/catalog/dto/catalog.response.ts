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
} from '@harness-monorepo/contracts';

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
  @ApiProperty({ description: 'Available products in it. The storefront hides a category with none.' })
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
