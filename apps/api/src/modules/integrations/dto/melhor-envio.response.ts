// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { IntegrationAuthorization, IntegrationStatus, MelhorEnvioAccount, MelhorEnvioConnected, MelhorEnvioConnection, MelhorEnvioEnvironment } from '@harness-monorepo/contracts';

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
