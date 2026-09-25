// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { CustomerStage, StoreCustomer, StoreCustomerPage } from '@harness-monorepo/contracts';

export class StoreCustomerResponse implements StoreCustomer {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String, description: "The account's e-mail; null once the account was deleted." })
  email!: string | null;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty({ nullable: true, type: String, example: '5511999998888' }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'SP' }) state!: string | null;
  @ApiProperty({ enum: ['LEAD', 'CUSTOMER'], description: 'LEAD until a recorded order; orders are not recorded yet.' })
  stage!: CustomerStage;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class StoreCustomerPageResponse implements StoreCustomerPage {
  @ApiProperty({ type: [StoreCustomerResponse] }) customers!: StoreCustomerResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
