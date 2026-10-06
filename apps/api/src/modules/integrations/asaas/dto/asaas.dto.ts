// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

// Types
import type { AsaasConnectPayload, AsaasSettingsPayload, IntegrationErrorCode } from '@harness-monorepo/contracts';

const answering = { context: { errorCode: 'INTEGRATION_KEY_INVALID' satisfies IntegrationErrorCode } };

export class AsaasConnectDto implements AsaasConnectPayload {
  @ApiProperty({ example: '$aact_hmlg_000…', description: "The shop's Asaas API key, `$` included — sealed, and never answered back." })
  // A key pasted from Asaas's panel often carries the line break or the space around it.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(answering)
  @Length(16, 512, answering)
  // Visible ASCII only: an invisible character copied along with the key cannot travel in a header,
  // and the request failing on it would read as Asaas not answering instead of a key to paste again.
  @Matches(/^[\x21-\x7e]+$/, answering)
  apiKey!: string;
}

/** As far as every card brand goes at Asaas: Visa and Mastercard take 21 instalments, the others 12. */
const INSTALLMENTS_MAX = 12;

const settingsAnswering = { context: { errorCode: 'ASAAS_SETTINGS_INVALID' satisfies IntegrationErrorCode } };

/** The whole of the choices: the panel's form saves them together, and a key left out is refused rather than reset. */
export class AsaasSettingsDto implements AsaasSettingsPayload {
  @ApiProperty({ description: 'Pix, charged at Asaas.' })
  @IsBoolean(settingsAnswering)
  pix!: boolean;

  @ApiProperty({ description: 'Credit card, charged at Asaas.' })
  @IsBoolean(settingsAnswering)
  card!: boolean;

  @ApiProperty({ minimum: 1, maximum: INSTALLMENTS_MAX, example: 1, description: 'The most instalments a card payment splits into; 1 is in full. Kept while `card` is off.' })
  @IsInt(settingsAnswering)
  @Min(1, settingsAnswering)
  @Max(INSTALLMENTS_MAX, settingsAnswering)
  maxInstallments!: number;

  @ApiProperty({ description: 'Paying on delivery or at pickup, settled between the shop and the customer.' })
  @IsBoolean(settingsAnswering)
  offline!: boolean;
}
