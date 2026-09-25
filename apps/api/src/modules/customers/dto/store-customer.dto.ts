// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Types
import type {
  CreateStoreCustomerPayload,
  CustomerStage,
  StoreCustomerListQuery,
  StoreCustomerSort,
  UpdateStoreCustomerPayload,
} from '@harness-monorepo/contracts';

// App
import { blankToNull, normaliseWhatsapp, trim } from '../../stores/dto/store-fields.dto.js';
import { CUSTOMER_SORTS, CUSTOMER_STAGES, CUSTOMERS_PAGE_SIZE, CUSTOMERS_PAGE_SIZE_MAX, CUSTOMERS_SEARCH_MAX_LENGTH } from '../customers.constants.js';
import { CustomerAddressDto } from './customer.dto.js';

/** A customer the shopkeeper registers, with no account: a name, the phone, and where they are. */
export class CreateStoreCustomerDto implements CreateStoreCustomerPayload {
  @ApiProperty({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @IsString()
  @trim
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '(11) 99999-8888', description: 'Any way a person writes it; kept as a WhatsApp link wants it.' })
  @IsString()
  @Matches(/^\d{12,15}$/, { message: 'phone must be a phone number, area code included' })
  @normaliseWhatsapp
  phone!: string;

  @ApiPropertyOptional({ type: CustomerAddressDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;
}

/**
 * What the shopkeeper changes of a customer. No e-mail: it is the account's, and the pipe refuses a
 * field it does not declare. `ValidateIf` and not `IsOptional` on the name and the phone, because
 * `IsOptional` lets a null through, and a null here would clear a name the column needs or the one
 * phone a customer registered from an order is known by.
 */
export class UpdateStoreCustomerDto implements UpdateStoreCustomerPayload {
  @ApiPropertyOptional({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @trim
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '(11) 99999-8888', description: 'Any way a person writes it; kept as a WhatsApp link wants it.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{12,15}$/, { message: 'phone must be a phone number, area code included' })
  @normaliseWhatsapp
  phone?: string;

  @ApiPropertyOptional({ type: CustomerAddressDto, description: 'A part sent as null or blank is cleared; a part left out is kept.' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;
}

/** How the panel asks for a page of customers. A bare `GET` is the first page of everyone. */
export class ListStoreCustomersDto implements StoreCustomerListQuery {
  @ApiPropertyOptional({ maxLength: CUSTOMERS_SEARCH_MAX_LENGTH, description: 'Part of the name, the e-mail or the phone.' })
  @IsOptional()
  @IsString()
  @trim
  @blankToNull
  @MaxLength(CUSTOMERS_SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_STAGES })
  @IsOptional()
  @IsIn(CUSTOMER_STAGES)
  stage?: CustomerStage;

  @ApiPropertyOptional({ enum: CUSTOMER_SORTS, default: 'RECENT' })
  @IsOptional()
  @IsIn(CUSTOMER_SORTS)
  sort?: StoreCustomerSort;

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
