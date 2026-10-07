// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Types
import type { CustomerDataAccount, CustomerDataExport, CustomerDataOrderOrigin, CustomerDataRecord, CustomerSignInMethod, CustomerTermsAcceptance, DeleteCustomerAccountPayload, LegalAcceptanceChannel } from '@harness-monorepo/contracts';

// App
import { CustomerDataCashbackResponse } from '../../cashback/dto/cashback.response.js';
import { PASSWORD_MAX_LENGTH } from '../../auth/auth.constants.js';
import { CustomerConversationResponse } from '../../conversations/dto/conversation.dto.js';
import { CustomerFavoriteResponse } from '../../favorites/dto/favorite.dto.js';
import { CustomerOrderResponse } from '../../orders/dto/customer-order.dto.js';
import { CustomerReviewResponse } from '../../reviews/dto/review.response.js';
import { CustomerProfileResponse } from './customer.dto.js';

export class DeleteCustomerAccountDto implements DeleteCustomerAccountPayload {
  @ApiPropertyOptional({ maxLength: PASSWORD_MAX_LENGTH, description: "The account's password; required when it has one." })
  @IsOptional() @IsString() @MaxLength(PASSWORD_MAX_LENGTH)
  password?: string;

  @ApiPropertyOptional({ maxLength: 320, description: "The account's e-mail, typed again — for an account opened through Google, which has no password." })
  @IsOptional() @IsString() @MaxLength(320)
  email?: string;
}

class CustomerTermsAcceptanceResponse implements CustomerTermsAcceptance {
  @ApiProperty({ example: '2026-09-30' }) version!: string;
  @ApiProperty({ enum: ['SIGN_UP', 'GOOGLE', 'PASSWORD_RESET'] }) via!: LegalAcceptanceChannel;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: string;
}

class CustomerDataAccountResponse implements CustomerDataAccount {
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) emailVerifiedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ enum: ['PASSWORD', 'GOOGLE'], isArray: true }) signInWith!: CustomerSignInMethod[];
  @ApiProperty({ type: [CustomerTermsAcceptanceResponse] }) termsAccepted!: CustomerTermsAcceptanceResponse[];
}

class CustomerDataRecordResponse implements CustomerDataRecord {
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) claimedPhone!: string | null;
}

class CustomerDataMarketingConsentResponse {
  @ApiProperty({ nullable: true, type: String }) fbclid!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) clickedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) fbp!: string | null;
  @ApiProperty({ nullable: true, type: String }) userAgent!: string | null;
  @ApiProperty({ nullable: true, type: String }) pageUrl!: string | null;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
}

class CustomerDataOrderOriginResponse implements CustomerDataOrderOrigin {
  @ApiProperty() orderNumber!: number;
  @ApiProperty({ nullable: true, type: String }) source!: string | null;
  @ApiProperty({ nullable: true, type: String }) medium!: string | null;
  @ApiProperty({ nullable: true, type: String }) campaign!: string | null;
  @ApiProperty({ nullable: true, type: String }) content!: string | null;
  @ApiProperty({ nullable: true, type: String }) term!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) arrivedAt!: string | null;
  @ApiProperty({ type: CustomerDataMarketingConsentResponse, nullable: true, description: "What was kept of their browser with their yes to the shop's pixel; null without it." })
  marketingConsent!: CustomerDataMarketingConsentResponse | null;
}

class CustomerDataShopResponse {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

export class CustomerDataExportResponse implements CustomerDataExport {
  @ApiProperty({ format: 'date-time' }) exportedAt!: string;
  @ApiProperty({ type: CustomerDataShopResponse }) shop!: CustomerDataShopResponse;
  @ApiProperty({ type: CustomerDataAccountResponse }) account!: CustomerDataAccountResponse;
  @ApiProperty({ type: CustomerProfileResponse }) profile!: CustomerProfileResponse;
  @ApiProperty({ type: CustomerDataRecordResponse }) record!: CustomerDataRecordResponse;
  @ApiProperty({ type: [CustomerOrderResponse] }) orders!: CustomerOrderResponse[];
  @ApiProperty({ type: [CustomerDataOrderOriginResponse], description: 'One per order that recorded where its visit came from.' }) orderOrigins!: CustomerDataOrderOriginResponse[];
  @ApiProperty({ type: [CustomerFavoriteResponse] }) favorites!: CustomerFavoriteResponse[];
  @ApiProperty({ type: [CustomerReviewResponse] }) reviews!: CustomerReviewResponse[];
  @ApiProperty({ type: [CustomerConversationResponse] }) conversations!: CustomerConversationResponse[];
  @ApiProperty({ type: CustomerDataCashbackResponse }) cashback!: CustomerDataCashbackResponse;
}
