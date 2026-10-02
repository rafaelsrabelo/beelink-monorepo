// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsBoolean, IsOptional } from 'class-validator';

// Types
import type { CustomerNotifications, UpdateCustomerNotificationsPayload } from '@harness-monorepo/contracts';

/** All of them at once, as the "Avisos" form sends them; no implicit conversion, so a boolean is a boolean. */
export class UpdateCustomerNotificationsDto implements UpdateCustomerNotificationsPayload {
  @ApiProperty({ description: "The orders' progress: accepted, on its way or ready, delivered, cancelled." }) @IsBoolean() orders!: boolean;
  @ApiProperty({ description: 'A favourite that got cheaper or came back in stock.' }) @IsBoolean() favorites!: boolean;
  @ApiPropertyOptional({ description: 'Their cashback about to expire (BEELINK-241); absent leaves it as it is.' }) @IsOptional() @IsBoolean() cashback?: boolean;
  @ApiProperty({ description: "The shop's offers and news. Changing it keeps the date." }) @IsBoolean() offers!: boolean;
}

export class CustomerNotificationsResponse implements CustomerNotifications {
  @ApiProperty() orders!: boolean;
  @ApiProperty() favorites!: boolean;
  @ApiProperty() cashback!: boolean;
  @ApiProperty() offers!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'When the shopper last chose about offers; the consent’s date.' })
  offersChosenAt!: string | null;
}
