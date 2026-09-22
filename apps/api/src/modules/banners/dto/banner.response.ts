// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Types
import type { Banner, BannerTarget, PublicBanner, ShowcaseLayout } from '@harness-monorepo/contracts';

// App
import { BANNER_TARGETS, SHOWCASE_LAYOUTS } from '../banners.constants.js';

/**
 * The shapes out, for Swagger. Each `implements` its contract type, so a field added to the wire
 * and forgotten here fails to compile rather than going missing from the documentation.
 */
export class PublicBannerResponse implements PublicBanner {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) subtitle!: string | null;
  @ApiProperty() imageUrl!: string;
  @ApiProperty({ enum: SHOWCASE_LAYOUTS }) layout!: ShowcaseLayout;
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Already resolved, or null when the banner goes nowhere.",
  })
  href!: string | null;
  @ApiProperty({ description: 'Opens in a new tab. On the wire so nobody has to guess from the href.' })
  external!: boolean;
}

export class BannerResponse implements Banner {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) subtitle!: string | null;
  @ApiProperty() imageUrl!: string;
  @ApiProperty({ enum: SHOWCASE_LAYOUTS }) layout!: ShowcaseLayout;
  @ApiProperty({ enum: BANNER_TARGETS }) target!: BannerTarget;
  @ApiPropertyOptional({ nullable: true, type: String }) categorySlug!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) productSlug!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) externalUrl!: string | null;
  @ApiProperty() position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
