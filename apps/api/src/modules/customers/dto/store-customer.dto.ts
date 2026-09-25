// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Types
import type { StoreCustomerListQuery } from '@harness-monorepo/contracts';

// App
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';
import { CUSTOMERS_PAGE_SIZE, CUSTOMERS_PAGE_SIZE_MAX, CUSTOMERS_SEARCH_MAX_LENGTH } from '../customers.constants.js';

/** How the panel asks for a page of customers. A bare `GET` is the first page of everyone. */
export class ListStoreCustomersDto implements StoreCustomerListQuery {
  @ApiPropertyOptional({ maxLength: CUSTOMERS_SEARCH_MAX_LENGTH, description: 'Part of the name, the e-mail or the phone.' })
  @IsOptional()
  @IsString()
  @trim
  @blankToNull
  @MaxLength(CUSTOMERS_SEARCH_MAX_LENGTH)
  q?: string;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: CUSTOMERS_PAGE_SIZE_MAX, default: CUSTOMERS_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;
}
