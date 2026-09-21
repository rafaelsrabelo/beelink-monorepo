// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Types
import type { ReorderPayload } from '@harness-monorepo/contracts';

/**
 * The whole list, in its new order. Not a position per row: a drag that moves the third item to the
 * top changes every position below it, and a request per row leaves the list in an order nobody
 * chose if the tab closes halfway through. The service refuses a list that is not exactly the
 * shop's own rows, because a missing id would silently share a position with another.
 */
export class ReorderDto implements ReorderPayload {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];
}
