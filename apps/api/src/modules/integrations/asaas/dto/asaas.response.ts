// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { AsaasAccount, AsaasAccountApproval, AsaasConnection, AsaasEnvironment, AsaasSettings, IntegrationStatus, IntegrationWebhookState } from '@harness-monorepo/contracts';

const ENVIRONMENTS = ['SANDBOX', 'PRODUCTION'] as const satisfies readonly AsaasEnvironment[];
const STATUSES = ['DISCONNECTED', 'CONNECTED', 'NEEDS_RECONNECT'] as const satisfies readonly IntegrationStatus[];
const WEBHOOK_STATES = ['REGISTERED', 'SKIPPED', 'PAUSED', 'ERROR'] as const satisfies readonly IntegrationWebhookState[];
const APPROVALS = ['PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED'] as const satisfies readonly AsaasAccountApproval[];

class AsaasAccountResponse implements AsaasAccount {
  @ApiProperty({ example: 'Lessari' }) name!: string;
  @ApiProperty({ nullable: true, type: String, example: '**.345.678/0001-**', description: 'The CPF or CNPJ, masked.' }) document!: string | null;
}

export class AsaasConnectionResponse implements AsaasConnection {
  @ApiProperty({ description: 'This deployment can seal a key.' }) available!: boolean;
  @ApiProperty({ enum: ENVIRONMENTS }) environment!: AsaasEnvironment;
  @ApiProperty({ enum: STATUSES }) status!: IntegrationStatus;
  @ApiProperty({ type: AsaasAccountResponse, nullable: true }) account!: AsaasAccount | null;
  @ApiProperty({ enum: WEBHOOK_STATES, nullable: true, description: 'SKIPPED: the web is not public https here, so none was registered.' }) webhook!: IntegrationWebhookState | null;
  @ApiProperty({ enum: APPROVALS, nullable: true, description: "Asaas's verdict on the account. Null: not known, which switches nothing off. Anything but APPROVED: nothing is charged online." }) approval!: AsaasAccountApproval | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) approvalCheckedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) connectedAt!: string | null;
}

export class AsaasSettingsResponse implements AsaasSettings {
  @ApiProperty() pix!: boolean;
  @ApiProperty() card!: boolean;
  @ApiProperty({ minimum: 1, maximum: 12, description: '1 is in full.' }) maxInstallments!: number;
  @ApiProperty({ description: 'Paying on delivery or at pickup.' }) offline!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null until first saved: the defaults.' }) updatedAt!: string | null;
}
