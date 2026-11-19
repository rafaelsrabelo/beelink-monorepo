// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AffiliateApplicationStatus,
  AffiliateApprovalMode,
  AffiliatePageBenefit,
  AffiliatePageBlock,
  AffiliatePageContent,
  AffiliatePageOverview,
  AffiliatePagePlacements,
  AffiliatePageQuestion,
  AffiliatePageSettings,
  AffiliatePageStep,
  AffiliateStatus,
  PublicAffiliatePage,
  PublicAffiliatePagePlacement,
  ShopAffiliateApplication,
  ShopAffiliateApplicationPage,
} from '@harness-monorepo/contracts';

// App
import { AFFILIATE_APPLICATION_STATUSES, AFFILIATE_APPROVAL_MODES } from '../affiliate-page.constants.js';
import { AFFILIATE_STATUSES } from '../affiliates.constants.js';

const TEXT = { nullable: true, type: String, description: "Null is the product's own text." } as const;
const BLOCKS = ['CLOSED', 'PROGRAM_OFF', 'LINKS_OFF'] as const satisfies readonly AffiliatePageBlock[];

class AffiliatePageStepResponse implements AffiliatePageStep {
  @ApiProperty() title!: string;
  @ApiProperty() text!: string;
}

class AffiliatePageBenefitResponse implements AffiliatePageBenefit {
  @ApiProperty() title!: string;
  @ApiProperty() text!: string;
}

class AffiliatePageQuestionResponse implements AffiliatePageQuestion {
  @ApiProperty() question!: string;
  @ApiProperty() answer!: string;
}

export class AffiliatePageContentResponse implements AffiliatePageContent {
  @ApiProperty(TEXT) badge!: string | null;
  @ApiProperty(TEXT) title!: string | null;
  @ApiProperty(TEXT) subtitle!: string | null;
  @ApiProperty(TEXT) ctaLabel!: string | null;
  @ApiProperty({ nullable: true, type: [String] }) highlights!: string[] | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty(TEXT) stepsTitle!: string | null;
  @ApiProperty({ nullable: true, type: [AffiliatePageStepResponse] }) steps!: AffiliatePageStepResponse[] | null;
  @ApiProperty({ nullable: true, type: [AffiliatePageBenefitResponse] }) benefits!: AffiliatePageBenefitResponse[] | null;
  @ApiProperty(TEXT) questionsTitle!: string | null;
  @ApiProperty({ nullable: true, type: [AffiliatePageQuestionResponse] }) questions!: AffiliatePageQuestionResponse[] | null;
  @ApiProperty(TEXT) closingTitle!: string | null;
  @ApiProperty(TEXT) closingText!: string | null;
  @ApiProperty(TEXT) formTitle!: string | null;
  @ApiProperty(TEXT) formSubtitle!: string | null;
  @ApiProperty() askExtraQuestion!: boolean;
  @ApiProperty(TEXT) extraQuestion!: string | null;
  @ApiProperty(TEXT) successMessage!: string | null;
  @ApiProperty(TEXT) bannerTitle!: string | null;
  @ApiProperty(TEXT) bannerText!: string | null;
  @ApiProperty(TEXT) bannerCta!: string | null;
}

class AffiliatePagePlacementsResponse implements AffiliatePagePlacements {
  @ApiProperty() homeBanner!: boolean;
  @ApiProperty() footerLink!: boolean;
  @ApiProperty() topStrip!: boolean;
}

class AffiliatePageSettingsResponse implements AffiliatePageSettings {
  @ApiProperty() open!: boolean;
  @ApiProperty({ type: AffiliatePagePlacementsResponse }) placements!: AffiliatePagePlacementsResponse;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null is the default table.' }) tableId!: string | null;
  @ApiProperty({ enum: AFFILIATE_APPROVAL_MODES }) approval!: AffiliateApprovalMode;
  @ApiProperty({ type: AffiliatePageContentResponse }) content!: AffiliatePageContentResponse;
  @ApiProperty({ format: 'date-time', nullable: true, type: String, description: 'Null while never saved.' }) updatedAt!: string | null;
}

export class AffiliatePageOverviewResponse implements AffiliatePageOverview {
  @ApiProperty({ type: AffiliatePageSettingsResponse }) page!: AffiliatePageSettingsResponse;
  @ApiProperty({ enum: BLOCKS, nullable: true, description: 'Null when visitors see the page now.' }) blockedBy!: AffiliatePageBlock | null;
  @ApiProperty({ example: 1000, description: "The announced table's general rate: what {comissao} becomes." }) rateBps!: number;
  @ApiProperty({ example: 3000, description: 'The highest rate a product on sale earns on that table: above rateBps, {comissao} is "até" it.' }) maxRateBps!: number;
  @ApiProperty() pendingApplications!: number;
}

export class PublicAffiliatePagePlacementResponse implements PublicAffiliatePagePlacement {
  @ApiProperty({ type: AffiliatePagePlacementsResponse }) placements!: AffiliatePagePlacementsResponse;
  @ApiProperty({ example: 1000 }) rateBps!: number;
  @ApiProperty({ example: 3000 }) maxRateBps!: number;
  @ApiProperty(TEXT) bannerTitle!: string | null;
  @ApiProperty(TEXT) bannerText!: string | null;
  @ApiProperty(TEXT) bannerCta!: string | null;
}

class PublicAffiliatePageTermsResponse {
  @ApiProperty({ nullable: true, type: String }) text!: string | null;
  @ApiProperty() version!: number;
}

export class PublicAffiliatePageResponse implements PublicAffiliatePage {
  @ApiProperty({ type: AffiliatePageContentResponse }) content!: AffiliatePageContentResponse;
  @ApiProperty({ example: 1000 }) rateBps!: number;
  @ApiProperty({ example: 3000 }) maxRateBps!: number;
  @ApiProperty({ type: PublicAffiliatePageTermsResponse }) terms!: PublicAffiliatePageTermsResponse;
}

class ApplicationAffiliateResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: AFFILIATE_STATUSES }) status!: AffiliateStatus;
}

export class ShopAffiliateApplicationResponse implements ShopAffiliateApplication {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ example: '5511999998888' }) phone!: string;
  @ApiProperty({ nullable: true, type: String, description: "The extra question as asked; null when it was the product's own, or none was asked." }) extraQuestion!: string | null;
  @ApiProperty({ nullable: true, type: String }) extraAnswer!: string | null;
  @ApiProperty({ enum: AFFILIATE_APPLICATION_STATUSES }) status!: AffiliateApplicationStatus;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) decidedAt!: string | null;
  @ApiProperty({ nullable: true, type: ApplicationAffiliateResponse }) affiliate!: ApplicationAffiliateResponse | null;
}

export class ShopAffiliateApplicationPageResponse implements ShopAffiliateApplicationPage {
  @ApiProperty({ type: [ShopAffiliateApplicationResponse] }) applications!: ShopAffiliateApplicationResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ description: 'Applications waiting, whatever the filter.' }) pendingCount!: number;
}
