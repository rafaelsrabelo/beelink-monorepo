// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { AffiliateDocumentType, AffiliateDocumentUpload, AffiliateDocumentView, ShopAffiliateDocument } from '@harness-monorepo/contracts';

// App
import { AFFILIATE_DOCUMENT_TYPES } from '../affiliates.constants.js';

export class AffiliateDocumentUploadResponse implements AffiliateDocumentUpload {
  @ApiProperty({ format: 'uuid', description: 'What the invite or the record names; it waits a day.' }) id!: string;
}

export class AffiliateDocumentViewResponse implements AffiliateDocumentView {
  @ApiProperty({ enum: AFFILIATE_DOCUMENT_TYPES }) type!: AffiliateDocumentType;
  @ApiProperty({ description: 'Works until `expiresAt`.' }) frontUrl!: string;
  @ApiProperty({ example: 'jpg', description: '`pdf` is linked rather than drawn.' }) frontFormat!: string;
  @ApiProperty({ nullable: true, type: String }) backUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) backFormat!: string | null;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ format: 'date-time' }) uploadedAt!: string;
}

export class ShopAffiliateDocumentResponse implements ShopAffiliateDocument {
  @ApiProperty({ enum: AFFILIATE_DOCUMENT_TYPES }) type!: AffiliateDocumentType;
  @ApiProperty() hasBack!: boolean;
  @ApiProperty({ format: 'date-time' }) uploadedAt!: string;
}
