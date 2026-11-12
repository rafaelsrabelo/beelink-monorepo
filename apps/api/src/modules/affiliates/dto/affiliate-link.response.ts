// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { PublicAffiliate, PublicAffiliateLink } from '@harness-monorepo/contracts';

export class PublicAffiliateResponse implements PublicAffiliate {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'joao' }) slug!: string;
  @ApiProperty({ example: 'João Silva' }) name!: string;
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ nullable: true, type: String, maxLength: 100 }) tagline!: string | null;
  @ApiProperty({ example: 30, description: 'Days the shop credits the orders that follow a visit through the link.' }) attributionDays!: number;
}

export class PublicAffiliateLinkResponse implements PublicAffiliateLink {
  @ApiProperty({ nullable: true, type: PublicAffiliateResponse, description: 'Null when the link credits nobody: the shop simply opens.' })
  affiliate!: PublicAffiliateResponse | null;
}
