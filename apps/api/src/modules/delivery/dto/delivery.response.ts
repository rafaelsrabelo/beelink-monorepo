// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { DeliveryBand, DeliverySettings, OwnDeliveryVerdict, ShippingOption, ShippingOptionKind, ShippingQuote, ShippingWindow } from '@harness-monorepo/contracts';

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

class ShippingWindowResponse implements ShippingWindow {
  @ApiProperty({ enum: ['MINUTES', 'BUSINESS_DAYS'] }) unit!: ShippingWindow['unit'];
  @ApiProperty() from!: number;
  @ApiProperty() to!: number;
}

class ShippingOptionResponse implements ShippingOption {
  @ApiProperty({ enum: ['PICKUP', 'OWN_DELIVERY'] }) kind!: ShippingOptionKind;
  @ApiProperty({ nullable: true, type: Number, description: 'Null: agreed with the shop after the order.' }) feeCents!: number | null;
  @ApiProperty({ nullable: true, type: ShippingWindowResponse }) window!: ShippingWindowResponse | null;
  @ApiProperty({ description: 'Zero because the products reached the free-delivery amount.' }) freeAbove!: boolean;
}

export class ShippingQuoteResponse implements ShippingQuote {
  @ApiProperty({ type: [ShippingOptionResponse] }) options!: ShippingOptionResponse[];
  @ApiProperty({
    description: 'OFF · AGREE_LATER (reason: NO_BANDS, SHOP_UNPLACED, ADDRESS_UNPLACED) · OUT_OF_RANGE (distanceMeters, radiusMeters) · QUOTED (distanceMeters)',
    example: { status: 'QUOTED', distanceMeters: 2603 },
  })
  ownDelivery!: OwnDeliveryVerdict;
  @ApiProperty({ description: 'The products after promotions, in cents.' }) productsCents!: number;
}
