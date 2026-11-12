// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Types
import type { AffiliateVisitInput } from '@harness-monorepo/contracts';

/** One of the two: the `/name` an address carries, or the id the shop window's cookie keeps. */
export class AffiliateLinkQueryDto {
  @ApiPropertyOptional({ maxLength: 80, example: 'joao' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;
}

/** The affiliate whose link was followed, and nothing else: the pipe refuses any other field. */
export class AffiliateVisitDto implements AffiliateVisitInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  affiliateId!: string;
}
