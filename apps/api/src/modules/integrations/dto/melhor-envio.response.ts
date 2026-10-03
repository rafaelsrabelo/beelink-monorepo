// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  IntegrationAuthorization,
  IntegrationStatus,
  MelhorEnvioAccount,
  MelhorEnvioAccountOverview,
  MelhorEnvioConnected,
  MelhorEnvioConnection,
  MelhorEnvioEnvironment,
  MelhorEnvioSettings,
  MelhorEnvioShippingService,
  ShippingPackage,
} from '@harness-monorepo/contracts';

class MelhorEnvioAccountResponse implements MelhorEnvioAccount {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
}

export class MelhorEnvioConnectionResponse implements MelhorEnvioConnection {
  @ApiProperty({ description: 'This deployment has a Melhor Envio app set up.' }) available!: boolean;
  @ApiProperty({ enum: ['SANDBOX', 'PRODUCTION'] }) environment!: MelhorEnvioEnvironment;
  @ApiProperty({ enum: ['DISCONNECTED', 'CONNECTED', 'NEEDS_RECONNECT'] }) status!: IntegrationStatus;
  @ApiProperty({ type: MelhorEnvioAccountResponse, nullable: true }) account!: MelhorEnvioAccount | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) connectedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) accessExpiresAt!: string | null;
}

export class IntegrationAuthorizationResponse implements IntegrationAuthorization {
  @ApiProperty({ description: "Melhor Envio's authorization page, to send the browser to." }) url!: string;
}

export class MelhorEnvioConnectedResponse implements MelhorEnvioConnected {
  @ApiProperty() storeSlug!: string;
  @ApiProperty({ type: MelhorEnvioConnectionResponse }) connection!: MelhorEnvioConnection;
}

class MelhorEnvioShippingServiceResponse implements MelhorEnvioShippingService {
  @ApiProperty() id!: number;
  @ApiProperty({ example: 'PAC' }) name!: string;
  @ApiProperty({ example: 'Correios' }) company!: string;
}

export class MelhorEnvioAccountOverviewResponse implements MelhorEnvioAccountOverview {
  @ApiProperty({ description: "The wallet's balance now, in cents." }) balanceCents!: number;
  @ApiProperty({ type: [MelhorEnvioShippingServiceResponse] }) services!: MelhorEnvioShippingService[];
}

class ShippingPackageResponse implements ShippingPackage {
  @ApiProperty({ description: 'Grams.' }) weightGrams!: number;
  @ApiProperty({ description: 'Millimetres.' }) lengthMm!: number;
  @ApiProperty({ description: 'Millimetres.' }) widthMm!: number;
  @ApiProperty({ description: 'Millimetres.' }) heightMm!: number;
}

export class MelhorEnvioSettingsResponse implements MelhorEnvioSettings {
  @ApiProperty() handlingDays!: number;
  @ApiProperty({ type: [Number], nullable: true, description: 'Null until first saved: every service is offered.' }) serviceIds!: number[] | null;
  @ApiProperty({ type: ShippingPackageResponse, nullable: true }) defaultPackage!: ShippingPackage | null;
  @ApiProperty({ nullable: true, type: String, description: "The shop's CPF or CNPJ as the labels' sender, digits only." }) senderDocument!: string | null;
  @ApiProperty({ nullable: true, type: String }) senderStateRegister!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) updatedAt!: string | null;
}
