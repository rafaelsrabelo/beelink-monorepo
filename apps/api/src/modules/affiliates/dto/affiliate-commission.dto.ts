// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsUUID, Max, Min, ValidateIf, ValidateNested } from 'class-validator';

// Types
import type { AffiliateCommissionPayload, AffiliateDocumentPayload, AffiliateDocumentType, AffiliateErrorCode, CommissionCategoryRate, CommissionProductRate } from '@harness-monorepo/contracts';

// App
import { AFFILIATE_DOCUMENT_TYPES, COMMISSION_BPS_MAX, OWN_COMMISSION_RATES_MAX } from '../affiliates.constants.js';

const answering = (errorCode: AffiliateErrorCode) => ({ context: { errorCode } });
const AFFILIATE = answering('AFFILIATE_INVALID');
const DOCUMENT = answering('AFFILIATE_DOCUMENT_INVALID');

class OwnCategoryRateDto implements CommissionCategoryRate {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', AFFILIATE)
  categoryId!: string;

  @ApiProperty({ minimum: 0, maximum: COMMISSION_BPS_MAX, example: 1500 })
  @IsInt(AFFILIATE)
  @Min(0, AFFILIATE)
  @Max(COMMISSION_BPS_MAX, AFFILIATE)
  rateBps!: number;
}

class OwnProductRateDto implements CommissionProductRate {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', AFFILIATE)
  productId!: string;

  @ApiProperty({ minimum: 0, maximum: COMMISSION_BPS_MAX, example: 800 })
  @IsInt(AFFILIATE)
  @Min(0, AFFILIATE)
  @Max(COMMISSION_BPS_MAX, AFFILIATE)
  rateBps!: number;
}

/** An affiliate's own commission: a table of theirs alone, which the API makes (12/11/2026). */
export class AffiliateCommissionDto implements AffiliateCommissionPayload {
  @ApiProperty({ minimum: 0, maximum: COMMISSION_BPS_MAX, example: 1200, description: 'What every product pays them, unless its category or itself has a rate here.' })
  @IsInt(AFFILIATE)
  @Min(0, AFFILIATE)
  @Max(COMMISSION_BPS_MAX, AFFILIATE)
  defaultRateBps!: number;

  @ApiProperty({ type: [OwnCategoryRateDto], maxItems: OWN_COMMISSION_RATES_MAX })
  @IsArray(AFFILIATE)
  @ArrayMaxSize(OWN_COMMISSION_RATES_MAX, AFFILIATE)
  @ValidateNested({ each: true })
  @Type(() => OwnCategoryRateDto)
  categoryRates!: OwnCategoryRateDto[];

  @ApiProperty({ type: [OwnProductRateDto], maxItems: OWN_COMMISSION_RATES_MAX })
  @IsArray(AFFILIATE)
  @ArrayMaxSize(OWN_COMMISSION_RATES_MAX, AFFILIATE)
  @ValidateNested({ each: true })
  @Type(() => OwnProductRateDto)
  productRates!: OwnProductRateDto[];
}

/** The document an invite or a record names: its type and the photos uploaded for it. */
export class AffiliateDocumentDto implements AffiliateDocumentPayload {
  @ApiProperty({ enum: AFFILIATE_DOCUMENT_TYPES })
  @IsIn(AFFILIATE_DOCUMENT_TYPES, DOCUMENT)
  type!: AffiliateDocumentType;

  @ApiProperty({ format: 'uuid', description: 'An upload of this shop from `POST /stores/:slug/affiliate-documents`.' })
  @IsUUID('all', DOCUMENT)
  frontUploadId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Required unless a passport.' })
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', DOCUMENT)
  backUploadId!: string | null;
}
