// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  ProductDetail,
  ProductOption,
  ProductOptionValue,
  ProductVariant,
} from '@harness-monorepo/contracts';

// App
import { ProductResponse } from './catalog.response.js';

/** The shapes of options and variants, for Swagger. Each `implements` its contract type. */

export class ProductOptionValueResponse implements ProductOptionValue {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Areia' }) name!: string;
  @ApiProperty({ nullable: true, type: String, example: '#d9c7a7', description: 'A colour option’s swatch.' })
  colorHex!: string | null;
}

export class ProductOptionResponse implements ProductOption {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Cor' }) name!: string;
  @ApiProperty({ type: [ProductOptionValueResponse] }) values!: ProductOptionValueResponse[];
}

export class ProductVariantResponse implements ProductVariant {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    type: [String],
    description: 'One value id per option, in the options’ order. Empty on the default variant.',
  })
  optionValueIds!: string[];
  @ApiProperty({ description: 'Off is a combination the shop does not sell — not one that sold out.' })
  isActive!: boolean;
  @ApiProperty({ example: 18900, description: 'Whole cents.' }) priceCents!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole cents.' }) compareAtPriceCents!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole cents.' }) costCents!: number | null;
  @ApiProperty({ nullable: true, type: String, description: 'Unique within the shop.' }) sku!: string | null;
  @ApiProperty({ nullable: true, type: String }) barcode!: string | null;
  @ApiProperty() trackStock!: boolean;
  @ApiProperty({ nullable: true, type: Number }) stockQuantity!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Grams.' }) weightGrams!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Millimetres.' }) lengthMm!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Millimetres.' }) widthMm!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Millimetres.' }) heightMm!: number | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
}

export class ProductDetailResponse extends ProductResponse implements ProductDetail {
  @ApiProperty({ type: [ProductOptionResponse] }) options!: ProductOptionResponse[];
  @ApiProperty({ type: [ProductVariantResponse], description: 'The first option changes slowest.' })
  variants!: ProductVariantResponse[];
}
