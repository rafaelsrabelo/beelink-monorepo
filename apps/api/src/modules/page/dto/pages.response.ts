// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  PageKind,
  PagePreview,
  PageSeo,
  PageSlugAvailability,
  PageStatus,
  PublicLanding,
  StorePage,
} from '@harness-monorepo/contracts';

// App
import { PublicSectionResponse } from './page.response.js';
import { PAGE_STATUSES } from '../pages.constants.js';

/** The shapes out, for Swagger. Each `implements` its contract, so a field added and forgotten here fails to compile. */
export class PageSeoResponse implements PageSeo {
  @ApiProperty({ nullable: true, type: String, description: 'Null is the page’s title and the shop’s name.' })
  title!: string | null;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
}

export class StorePageResponse implements StorePage {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['HOME', 'LANDING'] }) kind!: PageKind;
  @ApiProperty({ nullable: true, type: String, description: 'Null on the home, at the shop’s own address.' })
  slug!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty({ description: 'Whether the shop’s header, footer and strip frame it.' }) usesChrome!: boolean;
  @ApiProperty({ description: 'Whether the shop’s menu links to it while it is published.' }) inMenu!: boolean;
  @ApiProperty({ enum: PAGE_STATUSES }) status!: PageStatus;
  @ApiProperty({ type: PageSeoResponse }) seo!: PageSeoResponse;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) publishedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PublicLandingResponse implements PublicLanding {
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() usesChrome!: boolean;
  @ApiProperty({ type: PageSeoResponse }) seo!: PageSeoResponse;
  @ApiProperty({ type: PublicSectionResponse, isArray: true }) sections!: PublicSectionResponse[];
}

export class PagePreviewResponse implements PagePreview {
  @ApiProperty({ type: StorePageResponse }) page!: StorePageResponse;
  @ApiProperty({ type: PublicSectionResponse, isArray: true }) sections!: PublicSectionResponse[];
}

export class PageSlugAvailabilityResponse implements PageSlugAvailability {
  @ApiProperty({ description: 'The address as the API would store it.' }) slug!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ enum: ['TAKEN', 'INVALID'], nullable: true, type: String }) reason!: 'TAKEN' | 'INVALID' | null;
}
