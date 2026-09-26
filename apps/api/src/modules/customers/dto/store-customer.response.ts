// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  CustomerDuplicate,
  CustomerDuplicateReason,
  CustomerStage,
  StoreCustomer,
  StoreCustomerDetail,
  StoreCustomerPage,
} from '@harness-monorepo/contracts';

// App
import { CUSTOMER_STAGES } from '../customers.constants.js';
import { CustomerAddressResponse } from './customer.dto.js';

export class StoreCustomerResponse implements StoreCustomer {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String, description: "The account's e-mail; null once the account was deleted." })
  email!: string | null;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty({ nullable: true, type: String, example: '5511999998888' }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'SP' }) state!: string | null;
  @ApiProperty({ enum: CUSTOMER_STAGES, description: "From the valid orders and the shop's inactiveAfterDays, computed when read." })
  stage!: CustomerStage;
  @ApiProperty({ description: 'Valid orders; a cancelled one is not counted.' }) ordersCount!: number;
  @ApiProperty({ description: 'Whole cents, over the valid orders.' }) totalSpentCents!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) lastOrderAt!: string | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole days since the last valid order.' })
  daysSinceLastOrder!: number | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ description: 'Another record of the shop may be the same person; the record lists them.' })
  possibleDuplicate!: boolean;
}

const DUPLICATE_REASONS = Object.keys({ PHONE: true, NAME: true } satisfies Record<CustomerDuplicateReason, true>);

export class CustomerDuplicateResponse implements CustomerDuplicate {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String, example: '5511999998888' }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'The account\'s e-mail; null for a record the shopkeeper registered.' })
  email!: string | null;
  @ApiProperty({ description: 'The record with an account is the one kept.' }) hasAccount!: boolean;
  @ApiProperty({ description: 'Valid orders; a cancelled one is not counted.' }) ordersCount!: number;
  @ApiProperty({
    enum: DUPLICATE_REASONS,
    description: 'PHONE: one tried to save the other\'s phone. NAME: the names read the same, case, accents and spaces aside.',
  })
  reason!: CustomerDuplicateReason;
}

export class StoreCustomerDetailResponse extends StoreCustomerResponse implements StoreCustomerDetail {
  @ApiProperty({ type: CustomerAddressResponse }) address!: CustomerAddressResponse;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'The first valid order.' })
  firstOrderAt!: string | null;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'totalSpentCents ÷ ordersCount, to the nearest whole cent; null with no valid order.',
  })
  averageTicketCents!: number | null;
  @ApiProperty({ type: [CustomerDuplicateResponse], description: 'At most 20; two records with an account are never listed.' })
  duplicates!: CustomerDuplicateResponse[];
}

export class CustomerStageCountsResponse implements Record<CustomerStage, number> {
  @ApiProperty() LEAD!: number;
  @ApiProperty() CUSTOMER!: number;
  @ApiProperty() INACTIVE!: number;
}

export class StoreCustomerPageResponse implements StoreCustomerPage {
  @ApiProperty({ type: [StoreCustomerResponse] }) customers!: StoreCustomerResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: CustomerStageCountsResponse, description: 'Per stage, for the search; the stage filter is ignored.' })
  stageCounts!: CustomerStageCountsResponse;
}
