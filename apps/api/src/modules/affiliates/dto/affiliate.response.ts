// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AcceptedAffiliate,
  AffiliateInvitation,
  AffiliateInvitationCategory,
  AffiliateInvitationProduct,
  AffiliateSignUpResult,
  AffiliateSlugAvailability,
  AffiliateSlugUnavailableReason,
  AffiliateStatus,
  ShopAffiliate,
  ShopAffiliatePage,
  ShopAffiliateSummary,
} from '@harness-monorepo/contracts';

// App
import { AuthSessionResponse } from '../../auth/dto/auth.response.js';
import { AFFILIATE_STATUSES } from '../affiliates.constants.js';

const SLUG_REASONS = ['INVALID', 'RESERVED', 'TAKEN'] as const satisfies readonly AffiliateSlugUnavailableReason[];

class AffiliateTableRefResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

class AffiliateInviteStateResponse {
  @ApiProperty({ format: 'date-time' }) sentAt!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class ShopAffiliateSummaryResponse implements ShopAffiliateSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true, type: String, description: 'Digits with the country code. Null only for one invited before 12/11/2026.' }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Null while invited.' }) slug!: string | null;
  @ApiProperty({ enum: AFFILIATE_STATUSES }) status!: AffiliateStatus;
  @ApiProperty({ type: AffiliateTableRefResponse }) table!: AffiliateTableRefResponse;
  @ApiProperty({ format: 'date-time' }) invitedAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) acceptedAt!: string | null;
}

export class ShopAffiliateResponse extends ShopAffiliateSummaryResponse implements ShopAffiliate {
  @ApiProperty({ nullable: true, type: String, example: '52998224725', description: 'Eleven digits, the shop\'s alone. Null only for one invited before 12/11/2026.' }) cpf!: string | null;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ nullable: true, type: String }) pixKey!: string | null;
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) tagline!: string | null;
  @ApiProperty({ nullable: true, type: Number }) termsVersion!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) termsAcceptedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) endedAt!: string | null;
  @ApiProperty({ nullable: true, type: AffiliateInviteStateResponse, description: 'While invited only.' }) invite!: AffiliateInviteStateResponse | null;
}

export class ShopAffiliatePageResponse implements ShopAffiliatePage {
  @ApiProperty({ type: [ShopAffiliateSummaryResponse] }) affiliates!: ShopAffiliateSummaryResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

class InvitationStoreResponse {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ nullable: true, type: String }) logoUrl!: string | null;
}

class InvitationAffiliateResponse {
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
}

class InvitationProductResponse implements AffiliateInvitationProduct {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1500 }) rateBps!: number;
}

class InvitationCategoryResponse implements AffiliateInvitationCategory {
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1500 }) rateBps!: number;
}

class InvitationTableResponse {
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1000 }) defaultRateBps!: number;
  @ApiProperty({ type: [InvitationCategoryResponse], description: 'Categories with a rate of their own: their products pay it, unless they have their own.' }) categories!: InvitationCategoryResponse[];
  @ApiProperty({ type: [InvitationProductResponse], description: 'Products with a rate of their own; every other pays its category\'s, else `defaultRateBps`.' }) products!: InvitationProductResponse[];
}

class InvitationTermsResponse {
  @ApiProperty({ nullable: true, type: String }) text!: string | null;
  @ApiProperty() version!: number;
}

export class AffiliateInvitationResponse implements AffiliateInvitation {
  @ApiProperty({ type: InvitationStoreResponse }) store!: InvitationStoreResponse;
  @ApiProperty({ type: InvitationAffiliateResponse }) affiliate!: InvitationAffiliateResponse;
  @ApiProperty({ type: InvitationTableResponse }) table!: InvitationTableResponse;
  @ApiProperty({ type: InvitationTermsResponse }) terms!: InvitationTermsResponse;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ description: 'Whether the invited e-mail has a bee-link account.' }) hasAccount!: boolean;
  @ApiProperty({ nullable: true, type: String }) suggestedSlug!: string | null;
}

export class AffiliateSlugAvailabilityResponse implements AffiliateSlugAvailability {
  @ApiProperty({ example: 'joao' }) slug!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ nullable: true, enum: SLUG_REASONS }) reason!: AffiliateSlugUnavailableReason | null;
}

export class AcceptedAffiliateResponse implements AcceptedAffiliate {
  @ApiProperty() storeName!: string;
  @ApiProperty() storeSlug!: string;
  @ApiProperty() slug!: string;
}

export class AffiliateSignUpResultResponse implements AffiliateSignUpResult {
  @ApiProperty({ type: AuthSessionResponse }) session!: AuthSessionResponse;
  @ApiProperty({ type: AcceptedAffiliateResponse }) affiliate!: AcceptedAffiliateResponse;
}
