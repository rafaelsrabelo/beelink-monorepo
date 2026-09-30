// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';

// Types
import type {
  CustomerFavorite,
  CustomerFavoriteFilter,
  CustomerFavoriteIds,
  CustomerFavoriteListQuery,
  CustomerFavoritePage,
  CustomerFavoriteSort,
  CustomerFavoriteVariant,
  LikeFavoritePayload,
} from '@harness-monorepo/contracts';

// App
import { blankToNull } from '../../stores/dto/store-fields.dto.js';
import { FAVORITE_FILTERS, FAVORITE_SORTS, FAVORITES_PAGE_MAX, FAVORITES_PAGE_SIZE, FAVORITES_PAGE_SIZE_MAX } from '../favorite-reading.js';

/** Liking a product: the combination chosen on its page, or none for the product as a whole. */
export class LikeFavoriteDto implements LikeFavoritePayload {
  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String, description: "One of the product's combinations the shop sells; absent or null likes the product as a whole." })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  variantId?: string | null;
}

/** How the shopper asks for a page of their favourites. Absent filter means all of them. */
export class ListCustomerFavoritesDto implements CustomerFavoriteListQuery {
  @ApiPropertyOptional({ enum: FAVORITE_FILTERS })
  @IsOptional()
  @blankToNull
  @IsIn(FAVORITE_FILTERS)
  filter?: CustomerFavoriteFilter;

  @ApiPropertyOptional({ enum: FAVORITE_SORTS, default: 'RECENT' })
  @IsOptional()
  @blankToNull
  @IsIn(FAVORITE_SORTS)
  sort?: CustomerFavoriteSort;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, maximum: FAVORITES_PAGE_MAX, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(FAVORITES_PAGE_MAX)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: FAVORITES_PAGE_SIZE_MAX, default: FAVORITES_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(FAVORITES_PAGE_SIZE_MAX)
  @Type(() => Number)
  pageSize?: number;
}

export class CustomerFavoriteVariantResponse implements CustomerFavoriteVariant {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) label!: string | null;
}

export class CustomerFavoriteResponse implements CustomerFavorite {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ type: CustomerFavoriteVariantResponse, nullable: true, description: 'Null for a product liked as a whole, or a combination the shop no longer sells.' })
  variant!: CustomerFavoriteVariantResponse | null;
  @ApiProperty() hasOptions!: boolean;
  @ApiProperty({ description: "Today's price of what was liked, in cents." }) priceCents!: number;
  @ApiProperty({ nullable: true, type: Number }) compareAtPriceCents!: number | null;
  @ApiProperty() likedPriceCents!: number;
  @ApiProperty({ format: 'date-time' }) likedAt!: string;
  @ApiProperty({ description: 'How much cheaper than when it was liked; 0 when it is not.' }) priceDropCents!: number;
  @ApiProperty() onSale!: boolean;
  @ApiProperty() soldOut!: boolean;
}

export class CustomerFavoriteCountsResponse implements Record<'ALL' | CustomerFavoriteFilter, number> {
  @ApiProperty() ALL!: number;
  @ApiProperty() PRICE_DROPPED!: number;
  @ApiProperty() ON_SALE!: number;
  @ApiProperty() SOLD_OUT!: number;
}

export class CustomerFavoritePageResponse implements CustomerFavoritePage {
  @ApiProperty({ type: [CustomerFavoriteResponse] }) favorites!: CustomerFavoriteResponse[];
  @ApiProperty({ description: 'How many the filter matched.' }) total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: CustomerFavoriteCountsResponse, description: 'Of every favourite, whatever the filter.' })
  counts!: CustomerFavoriteCountsResponse;
}

export class CustomerFavoriteIdsResponse implements CustomerFavoriteIds {
  @ApiProperty({ type: [String], format: 'uuid' }) productIds!: string[];
}
