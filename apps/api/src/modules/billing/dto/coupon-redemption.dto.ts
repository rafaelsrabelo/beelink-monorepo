// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { IsString, MaxLength } from 'class-validator';

// Types
import type { CouponRedemptionPayload } from '@harness-monorepo/contracts';

/**
 * A coupon of bee-link's, as the shopkeeper typed it (BEELINK-224). Only that: which page it is for
 * is the path's, and what it gives is the coupon's — a body that names a period or a page is refused
 * whole. A code no coupon could have is answered as one that does not exist, by the service.
 */
export class CouponRedemptionDto implements CouponRedemptionPayload {
  @ApiProperty({ example: 'CODIGO-DO-CUPOM', description: 'As typed: its case and the spaces around it do not matter.' })
  @IsString()
  @MaxLength(100)
  code!: string;
}
