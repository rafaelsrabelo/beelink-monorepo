// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Types
import type { CustomerDataAccount, CustomerDataExport, CustomerSignInMethod, CustomerTermsAcceptance, DeleteCustomerAccountPayload, LegalAcceptanceChannel } from '@harness-monorepo/contracts';

// App
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

class CustomerDataShopResponse {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

export class CustomerDataExportResponse implements CustomerDataExport {
  @ApiProperty({ format: 'date-time' }) exportedAt!: string;
  @ApiProperty({ type: CustomerDataShopResponse }) shop!: CustomerDataShopResponse;
  @ApiProperty({ type: CustomerDataAccountResponse }) account!: CustomerDataAccountResponse;
  @ApiProperty({ type: CustomerProfileResponse }) profile!: CustomerProfileResponse;
  @ApiProperty({ type: [CustomerOrderResponse] }) orders!: CustomerOrderResponse[];
  @ApiProperty({ type: [CustomerFavoriteResponse] }) favorites!: CustomerFavoriteResponse[];
  @ApiProperty({ type: [CustomerReviewResponse] }) reviews!: CustomerReviewResponse[];
  @ApiProperty({ type: [CustomerConversationResponse] }) conversations!: CustomerConversationResponse[];
}
