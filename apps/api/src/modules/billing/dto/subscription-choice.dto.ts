// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { IsIn } from 'class-validator';

// App
import { BILLING_CYCLES } from '../billing.constants.js';

// Types
import type { BillingCycle, BillingErrorCode, SubscriptionChoicePayload } from '@harness-monorepo/contracts';

/**
 * The cycle a page's plan is to be paid in. Nothing else is the caller's to say: the plan is the one
 * on sale and the amount is the plan's own, read from the database — a body that names a price, a
 * plan or a customer is refused whole.
 */
export class SubscriptionChoiceDto implements SubscriptionChoicePayload {
  @ApiProperty({ enum: BILLING_CYCLES, example: 'MONTHLY', description: 'How often the plan is charged, each time for the whole cycle. Refused with BILLING_CYCLE_INVALID.' })
  @IsIn(BILLING_CYCLES, { context: { errorCode: 'BILLING_CYCLE_INVALID' satisfies BillingErrorCode } })
  cycle!: BillingCycle;
}
