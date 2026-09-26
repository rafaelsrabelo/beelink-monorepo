// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  PageDraft,
  PageProblem,
  PageProblemKind,
  PageVersionAuthor,
  PageVersionSummary,
  PublishPageResult,
} from '@harness-monorepo/contracts';

// App
import { SectionResponse } from './page.response.js';
import { StorePageResponse } from './pages.response.js';

/** The shapes out, for Swagger. Each `implements` its contract, so a field added and forgotten here fails to compile. */
export class PageVersionAuthorResponse implements PageVersionAuthor {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class PageVersionSummaryResponse implements PageVersionSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() number!: number;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ nullable: true, type: PageVersionAuthorResponse }) author!: PageVersionAuthorResponse | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ description: 'The version the shop serves now.' }) live!: boolean;
}

export class PageDraftResponse implements PageDraft {
  @ApiProperty({ type: StorePageResponse }) page!: StorePageResponse;
  @ApiProperty({ description: 'One more on every accepted draft write; sent back as x-page-revision.' }) revision!: number;
  @ApiProperty({ description: 'Whether Publicar would change what a visitor is served.' }) hasUnpublishedChanges!: boolean;
  @ApiProperty({ nullable: true, type: PageVersionSummaryResponse }) published!: PageVersionSummaryResponse | null;
  @ApiProperty({ type: SectionResponse, isArray: true }) sections!: SectionResponse[];
}

export class PublishPageResultResponse implements PublishPageResult {
  @ApiProperty({ type: StorePageResponse }) page!: StorePageResponse;
  @ApiProperty({ type: PageVersionSummaryResponse }) version!: PageVersionSummaryResponse;
}

/** Every kind, once: a record keyed by the contract's union fails the build when one is added and left out. */
const PAGE_PROBLEM_KINDS = Object.keys({
  LINK_TO_MISSING_PRODUCT: true,
  LINK_TO_MISSING_CATEGORY: true,
  SHOWCASE_EMPTY: true,
  BANNER_WITHOUT_IMAGE: true,
  FEATURED_PRODUCT_UNAVAILABLE: true,
} satisfies Record<PageProblemKind, true>) as PageProblemKind[];

export class PageProblemResponse implements PageProblem {
  @ApiProperty({ enum: PAGE_PROBLEM_KINDS }) kind!: PageProblemKind;
  @ApiProperty({ format: 'uuid' }) sectionId!: string;
  @ApiProperty({ format: 'uuid' }) componentId!: string;
  @ApiProperty({ nullable: true, type: String, description: 'The slide or link at fault.' }) itemId!: string | null;
}
