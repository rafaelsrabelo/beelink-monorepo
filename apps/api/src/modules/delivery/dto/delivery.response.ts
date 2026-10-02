// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { DeliveryBand, DeliverySettings } from '@harness-monorepo/contracts';

class DeliveryBandResponse implements DeliveryBand {
  @ApiProperty({ example: 3000 }) upToMeters!: number;
  @ApiProperty({ example: 500 }) feeCents!: number;
  @ApiProperty({ example: 30 }) windowFromMinutes!: number;
  @ApiProperty({ example: 50 }) windowToMinutes!: number;
}

export class DeliverySettingsResponse implements DeliverySettings {
  @ApiProperty() pickupEnabled!: boolean;
  @ApiProperty() ownDeliveryEnabled!: boolean;
  @ApiProperty({ type: [DeliveryBandResponse] }) bands!: DeliveryBandResponse[];
  @ApiProperty({ nullable: true, type: Number, description: 'The last band’s reach; null with no bands.' }) radiusMeters!: number | null;
  @ApiProperty({ nullable: true, type: Number }) freeAboveCents!: number | null;
  @ApiProperty() carriersEnabled!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null until first saved: the defaults.' }) updatedAt!: string | null;
}
