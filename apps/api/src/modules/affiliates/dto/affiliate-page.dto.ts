// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  AffiliateApplicationApproval,
  AffiliateApplicationPayload,
  AffiliateApplicationStatus,
  AffiliateApprovalMode,
  AffiliateErrorCode,
  AffiliatePageBenefit,
  AffiliatePageContent,
  AffiliatePagePayload,
  AffiliatePagePlacements,
  AffiliatePageQuestion,
  AffiliatePageStep,
} from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';
import {
  AFFILIATE_APPLICATION_STATUSES,
  AFFILIATE_APPLICATIONS_PAGE_MAX,
  AFFILIATE_APPLICATIONS_PAGE_SIZE,
  AFFILIATE_APPLICATIONS_PAGE_SIZE_MAX,
  AFFILIATE_APPROVAL_MODES,
  AFFILIATE_EXTRA_ANSWER_MAX,
  AFFILIATE_HONEYPOT_MAX,
  AFFILIATE_PAGE_LIMITS as LIMITS,
} from '../affiliate-page.constants.js';
import { AFFILIATE_NAME_MAX, AFFILIATE_NAME_MIN } from '../affiliates.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: AffiliateErrorCode) => ({ context: { errorCode } });
const PAGE = answering('AFFILIATE_PAGE_INVALID');
const PAGE_EACH = { ...PAGE, each: true };
const APPLICATION = answering('AFFILIATE_APPLICATION_INVALID');

const trimmed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
/** A blank text is the product's own, as `null` is. */
const trimmedOrNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value));
const trimmedEach = Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value.map((item: unknown) => (typeof item === 'string' ? item.trim() : item)) : value));
const normalisedEmail = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
const EMAIL_MAX = 254;

/** A text of the page: sent every time — `null` for the product's own — and never longer than its bound. */
function PageText(max: number): PropertyDecorator {
  return (target, key) => {
    ApiProperty({ nullable: true, type: String, maxLength: max })(target, key);
    trimmedOrNull(target, key);
    ValidateIf((_: unknown, value: unknown) => value !== null)(target, key);
    IsString(PAGE)(target, key);
    MaxCodePoints(max, PAGE)(target, key);
  };
}

/** One text of a list's item: required, 1 to `max` characters. */
function ItemText(max: number): PropertyDecorator {
  return (target, key) => {
    ApiProperty({ minLength: 1, maxLength: max })(target, key);
    trimmed(target, key);
    IsString(PAGE)(target, key);
    MinLength(1, PAGE)(target, key);
    MaxCodePoints(max, PAGE)(target, key);
  };
}

export class AffiliatePageStepDto implements AffiliatePageStep {
  @ItemText(LIMITS.itemTitle) title!: string;
  @ItemText(LIMITS.itemText) text!: string;
}

export class AffiliatePageBenefitDto implements AffiliatePageBenefit {
  @ItemText(LIMITS.itemTitle) title!: string;
  @ItemText(LIMITS.itemText) text!: string;
}

export class AffiliatePageQuestionDto implements AffiliatePageQuestion {
  @ItemText(LIMITS.question) question!: string;
  @ItemText(LIMITS.answer) answer!: string;
}

/** The whole of what the shop writes: every key sent, `null` for the product's own. */
export class AffiliatePageContentDto implements AffiliatePageContent {
  @PageText(LIMITS.badge) badge!: string | null;
  @PageText(LIMITS.title) title!: string | null;
  @PageText(LIMITS.subtitle) subtitle!: string | null;
  @PageText(LIMITS.ctaLabel) ctaLabel!: string | null;

  @ApiProperty({ nullable: true, type: [String], maxItems: LIMITS.highlights, description: '`null` is the product\'s three, `[]` none.' })
  @trimmedEach
  @ValidateIf((_, value) => value !== null)
  @IsArray(PAGE)
  @ArrayMaxSize(LIMITS.highlights, PAGE)
  @IsString(PAGE_EACH)
  @MinLength(1, PAGE_EACH)
  @MaxCodePoints(LIMITS.highlight, PAGE_EACH)
  highlights!: string[] | null;

  @ApiProperty({ nullable: true, type: String, description: 'An image uploaded through `POST /uploads`.' })
  @trimmedOrNull
  @ValidateIf((_, value) => value !== null)
  @IsString(PAGE)
  @MaxLength(LIMITS.imageUrl, PAGE)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, PAGE)
  imageUrl!: string | null;

  @PageText(LIMITS.sectionTitle) stepsTitle!: string | null;

  @ApiProperty({ nullable: true, type: [AffiliatePageStepDto], minItems: LIMITS.stepsMin, maxItems: LIMITS.steps, description: '`null` is the product\'s three.' })
  @ValidateIf((_, value) => value !== null)
  @IsArray(PAGE)
  @ArrayMinSize(LIMITS.stepsMin, PAGE)
  @ArrayMaxSize(LIMITS.steps, PAGE)
  @ValidateNested(PAGE_EACH)
  @Type(() => AffiliatePageStepDto)
  steps!: AffiliatePageStepDto[] | null;

  @ApiProperty({ nullable: true, type: [AffiliatePageBenefitDto], maxItems: LIMITS.benefits, description: '`null` is the product\'s four, `[]` none.' })
  @ValidateIf((_, value) => value !== null)
  @IsArray(PAGE)
  @ArrayMaxSize(LIMITS.benefits, PAGE)
  @ValidateNested(PAGE_EACH)
  @Type(() => AffiliatePageBenefitDto)
  benefits!: AffiliatePageBenefitDto[] | null;

  @PageText(LIMITS.sectionTitle) questionsTitle!: string | null;

  @ApiProperty({ nullable: true, type: [AffiliatePageQuestionDto], maxItems: LIMITS.questions, description: '`null` is the product\'s five, `[]` none.' })
  @ValidateIf((_, value) => value !== null)
  @IsArray(PAGE)
  @ArrayMaxSize(LIMITS.questions, PAGE)
  @ValidateNested(PAGE_EACH)
  @Type(() => AffiliatePageQuestionDto)
  questions!: AffiliatePageQuestionDto[] | null;

  @PageText(LIMITS.closingTitle) closingTitle!: string | null;
  @PageText(LIMITS.closingText) closingText!: string | null;
  @PageText(LIMITS.formTitle) formTitle!: string | null;
  @PageText(LIMITS.formSubtitle) formSubtitle!: string | null;

  @ApiProperty({ description: 'Whether the form asks one more question, optional to whoever fills it in.' })
  @IsBoolean(PAGE)
  askExtraQuestion!: boolean;

  @PageText(LIMITS.extraQuestion) extraQuestion!: string | null;
  @PageText(LIMITS.successMessage) successMessage!: string | null;
  @PageText(LIMITS.bannerTitle) bannerTitle!: string | null;
  @PageText(LIMITS.bannerText) bannerText!: string | null;
  @PageText(LIMITS.bannerCta) bannerCta!: string | null;
}

export class AffiliatePagePlacementsDto implements AffiliatePagePlacements {
  @ApiProperty() @IsBoolean(PAGE) homeBanner!: boolean;
  @ApiProperty() @IsBoolean(PAGE) footerLink!: boolean;
  @ApiProperty() @IsBoolean(PAGE) topStrip!: boolean;
}

/** `PUT /stores/:slug/affiliate-page`: the whole of it. */
export class AffiliatePageDto implements AffiliatePagePayload {
  @ApiProperty() @IsBoolean(PAGE) open!: boolean;

  @ApiProperty({ type: AffiliatePagePlacementsDto })
  @ValidateNested(PAGE)
  @Type(() => AffiliatePagePlacementsDto)
  placements!: AffiliatePagePlacementsDto;

  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: "A table the shop shares; null is the default table." })
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', PAGE)
  tableId!: string | null;

  @ApiProperty({ enum: AFFILIATE_APPROVAL_MODES })
  @IsIn(AFFILIATE_APPROVAL_MODES, PAGE)
  approval!: AffiliateApprovalMode;

  @ApiProperty({ type: AffiliatePageContentDto })
  @ValidateNested(PAGE)
  @Type(() => AffiliatePageContentDto)
  content!: AffiliatePageContentDto;
}

/** `POST /stores/:slug/affiliate-join/applications`: the visitor's form. */
export class AffiliateApplicationDto implements AffiliateApplicationPayload {
  @ApiProperty({ example: 'Ana Souza', minLength: AFFILIATE_NAME_MIN, maxLength: AFFILIATE_NAME_MAX })
  @trimmed
  @IsString(APPLICATION)
  @MinLength(AFFILIATE_NAME_MIN, APPLICATION)
  @MaxCodePoints(AFFILIATE_NAME_MAX, APPLICATION)
  name!: string;

  @ApiProperty({ example: 'ana@exemplo.com' })
  @normalisedEmail
  @IsEmail({}, APPLICATION)
  @MaxLength(EMAIL_MAX, APPLICATION)
  email!: string;

  @ApiProperty({ example: '(11) 99999-8888', description: 'Kept as digits with the country code.' })
  @normaliseWhatsapp
  @IsString(APPLICATION)
  @Matches(/^\d{12,15}$/, APPLICATION)
  phone!: string;

  @ApiProperty({ nullable: true, type: String, maxLength: AFFILIATE_EXTRA_ANSWER_MAX })
  @trimmedOrNull
  @ValidateIf((_, value) => value !== null)
  @IsString(APPLICATION)
  @MaxCodePoints(AFFILIATE_EXTRA_ANSWER_MAX, APPLICATION)
  extraAnswer!: string | null;

  @ApiProperty({ type: Boolean, description: 'The terms and the privacy policy read: always true.' })
  @Equals(true, APPLICATION)
  accepted!: true;

  @ApiPropertyOptional({ description: 'Left empty by a person. Anything in it, and nothing is kept; the answer is the same.' })
  @IsOptional()
  @IsString(APPLICATION)
  @MaxLength(AFFILIATE_HONEYPOT_MAX, APPLICATION)
  website?: string;
}

export class AffiliateApplicationQueryDto {
  @ApiPropertyOptional({ enum: AFFILIATE_APPLICATION_STATUSES })
  @IsOptional()
  @IsIn(AFFILIATE_APPLICATION_STATUSES, APPLICATION)
  status?: AffiliateApplicationStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATE_APPLICATIONS_PAGE_MAX, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(APPLICATION)
  @Min(1, APPLICATION)
  @Max(AFFILIATE_APPLICATIONS_PAGE_MAX, APPLICATION)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATE_APPLICATIONS_PAGE_SIZE_MAX, default: AFFILIATE_APPLICATIONS_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt(APPLICATION)
  @Min(1, APPLICATION)
  @Max(AFFILIATE_APPLICATIONS_PAGE_SIZE_MAX, APPLICATION)
  pageSize?: number;
}

export class AffiliateApplicationApprovalDto implements AffiliateApplicationApproval {
  @ApiPropertyOptional({ format: 'uuid', description: 'A table the shop shares; left out, the one the page announces.' })
  @IsOptional()
  @IsUUID('all', APPLICATION)
  tableId?: string;
}
