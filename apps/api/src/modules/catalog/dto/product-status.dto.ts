// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsUUID } from 'class-validator';

// Types
import type { ProductStatus, ProductStatusPayload, ProductStatusResult } from '@harness-monorepo/contracts';

// App
import { PRODUCT_STATUS_BULK_MAX, PRODUCT_STATUSES } from '../catalog.constants.js';

export class ProductStatusDto implements ProductStatusPayload {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: PRODUCT_STATUS_BULK_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_STATUS_BULK_MAX)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];

  @ApiProperty({ enum: PRODUCT_STATUSES })
  @IsIn(PRODUCT_STATUSES)
  status!: ProductStatus;
}

export class ProductStatusResponse implements ProductStatusResult {
  @ApiProperty({ example: 30, description: 'The products whose status changed; one already in it is not counted.' })
  changed!: number;
}
