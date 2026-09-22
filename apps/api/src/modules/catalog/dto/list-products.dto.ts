// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

// Types
import type {
  ProductListQuery,
  ProductOrigin,
  ProductStatus,
  ProductStockFilter,
} from '@harness-monorepo/contracts';

// App
import {
  PRODUCT_ORIGINS,
  PRODUCT_SEARCH_MAX_LENGTH,
  PRODUCT_STATUSES,
  PRODUCT_STOCK_FILTERS,
  PRODUCTS_ADMIN_PAGE_SIZE,
  PRODUCTS_PAGE_SIZE_MAX,
} from '../catalog.constants.js';
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';

/**
 * How the panel asks for a page of its list.
 *
 * Every field is optional and an absent one means "all", so a bare `GET` answers the first page of
 * the whole catalogue. The bounds are applied here and echoed back in the answer, never the ones
 * that were asked for — a pager drawn from what it asked for and not from what it got is a pager
 * that offers a last page which is empty.
 */
export class ListProductsDto implements ProductListQuery {
  @ApiPropertyOptional({ description: 'Matched against the name, the SKU and the barcode.' })
  @IsOptional()
  @IsString()
  @MaxLength(PRODUCT_SEARCH_MAX_LENGTH)
  @trim
  @blankToNull
  search?: string;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  @blankToNull
  status?: ProductStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  @blankToNull
  categoryId?: string;

  @ApiPropertyOptional({ enum: PRODUCT_ORIGINS })
  @IsOptional()
  @IsIn(PRODUCT_ORIGINS)
  @blankToNull
  origin?: ProductOrigin;

  @ApiPropertyOptional({ enum: PRODUCT_STOCK_FILTERS })
  @IsOptional()
  @IsIn(PRODUCT_STOCK_FILTERS)
  @blankToNull
  stock?: ProductStockFilter;

  // `@Type(() => Number)` and not the pipe's implicit conversion, which the global ValidationPipe
  // deliberately leaves off — see apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: PRODUCTS_PAGE_SIZE_MAX, default: PRODUCTS_ADMIN_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;
}
