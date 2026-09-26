// Nest
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Types
import type {
  AddComponentPayload,
  ComponentDisplay,
  ComponentItem,
  ComponentKind,
  ComponentSpan,
  CreateComponentPayload,
  CreateSectionPayload,
  DeviceVisibility,
  PageErrorCode,
  ProductSource,
  SectionWidth,
  TextAlign,
  UpdateComponentPayload,
  UpdateSectionPayload,
} from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import {
  COMPONENT_BODY_MAX_LENGTH,
  COMPONENT_DISPLAYS,
  DEVICE_VISIBILITIES,
  COMPONENT_KINDS,
  COMPONENT_MAX_COLUMNS,
  COMPONENT_MIN_COLUMNS,
  COMPONENT_SPANS,
  COMPONENT_SUBTITLE_MAX_LENGTH,
  COMPONENT_TITLE_MAX_LENGTH,
  HEX_COLOUR,
  PRODUCT_SOURCES,
  SECTION_NAME_MAX_LENGTH,
  SECTION_WIDTHS,
  SHOWCASE_LIMIT_MAX,
  TEXT_ALIGNS,
} from '../page.constants.js';

/**
 * What a write sends for one component.
 *
 * `items` is `@IsArray()` and nothing more on purpose: what may be inside depends on the kind, and
 * that is stated once in `component-items.schema.ts` rather than in a nested class per kind. The
 * service runs it — and the last time it did not, the union was a validator nobody called.
 */
export class ComponentDto implements CreateComponentPayload {
  @ApiProperty({ enum: COMPONENT_KINDS })
  @IsIn(COMPONENT_KINDS)
  kind!: ComponentKind;

  @ApiPropertyOptional({ maxLength: COMPONENT_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxCodePoints(COMPONENT_TITLE_MAX_LENGTH)
  title?: string | null;

  @ApiPropertyOptional({ maxLength: COMPONENT_SUBTITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxCodePoints(COMPONENT_SUBTITLE_MAX_LENGTH)
  subtitle?: string | null;

  @ApiPropertyOptional({ maxLength: COMPONENT_BODY_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMPONENT_BODY_MAX_LENGTH)
  body?: string | null;

  @ApiPropertyOptional({ enum: COMPONENT_SPANS })
  @ValidateIf((dto: ComponentDto) => dto.span !== undefined)
  @IsIn(COMPONENT_SPANS, { context: { errorCode: 'COMPONENT_SPAN_INVALID' satisfies PageErrorCode } })
  span?: ComponentSpan;

  @ApiPropertyOptional({ enum: COMPONENT_DISPLAYS, nullable: true, description: 'The layout, from its kind\'s own — BANNER: BACKDROP, SPLIT, CAROUSEL or GRID; PRODUCTS: RAIL or GRID; CATEGORIES: RAIL, GRID or CHIPS; BENEFITS: INLINE or CARDS; ANNOUNCEMENT: STATIC or MARQUEE. Null only on the other kinds; refused on these.' })
  @IsOptional()
  @IsIn(COMPONENT_DISPLAYS, { context: { errorCode: 'COMPONENT_DISPLAY_INVALID' satisfies PageErrorCode } })
  display?: ComponentDisplay | null;

  @ApiPropertyOptional({ enum: PRODUCT_SOURCES, description: 'A showcase’s. CATEGORY needs sourceCategoryId; SELECTION needs items.' })
  @IsOptional()
  @IsIn(PRODUCT_SOURCES, { context: { errorCode: 'SHOWCASE_SOURCE_INVALID' satisfies PageErrorCode } })
  source?: ProductSource;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'SHOWCASE_CATEGORY_INVALID' satisfies PageErrorCode } })
  sourceCategoryId?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: SHOWCASE_LIMIT_MAX, nullable: true, description: 'Null is 24.' })
  @IsOptional()
  @IsInt({ context: { errorCode: 'SHOWCASE_LIMIT_INVALID' satisfies PageErrorCode } })
  @Min(1, { context: { errorCode: 'SHOWCASE_LIMIT_INVALID' satisfies PageErrorCode } })
  @Max(SHOWCASE_LIMIT_MAX, { context: { errorCode: 'SHOWCASE_LIMIT_INVALID' satisfies PageErrorCode } })
  limit?: number | null;

  @ApiPropertyOptional({ type: Object, isArray: true })
  @IsOptional()
  @IsArray()
  items?: ComponentItem[];

  @ApiPropertyOptional({ minimum: COMPONENT_MIN_COLUMNS, maximum: COMPONENT_MAX_COLUMNS })
  @IsOptional()
  @IsInt()
  @Min(COMPONENT_MIN_COLUMNS)
  @Max(COMPONENT_MAX_COLUMNS)
  @Type(() => Number)
  columns?: number | null;

  @ApiPropertyOptional({ enum: TEXT_ALIGNS, nullable: true, description: 'Null is the kind’s own habit.' })
  @IsOptional()
  @IsIn(TEXT_ALIGNS)
  align?: TextAlign | null;

  // Not `IsOptional`: that would let a null through, and a component always shows somewhere.
  @ApiPropertyOptional({ enum: DEVICE_VISIBILITIES, description: 'Where it shows. The strip shows everywhere.' })
  @ValidateIf((dto: ComponentDto) => dto.visibleOn !== undefined)
  @IsIn(DEVICE_VISIBILITIES, { context: { errorCode: 'COMPONENT_VISIBILITY_INVALID' satisfies PageErrorCode } })
  visibleOn?: DeviceVisibility;

  @ApiPropertyOptional()
  @ValidateIf((dto: ComponentDto) => dto.isActive !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * A patch of one component. A key left out is a column left alone.
 *
 * `skipNullProperties: false` because the default puts `@IsOptional()` on every inherited field,
 * and `@IsOptional()` lets a null through as well as an absence: a null on a NOT NULL column went
 * on to the database and came back as a 500. With it, a null is checked by the field's own rules.
 */
export class UpdateComponentDto
  extends PartialType(ComponentDto, { skipNullProperties: false })
  implements UpdateComponentPayload {}

/**
 * A new band, and the one component it is created around.
 *
 * There is no way to make an empty one, and that is deliberate: a band with nothing in it draws
 * nothing, so it would be a row the shopkeeper can only meet as a gap in their own editor.
 */
export class CreateSectionDto implements CreateSectionPayload {
  @ApiPropertyOptional({ maxLength: SECTION_NAME_MAX_LENGTH, nullable: true, description: 'Named bands are a site’s menu.' })
  @IsOptional()
  @IsString()
  @MaxCodePoints(SECTION_NAME_MAX_LENGTH)
  name?: string | null;

  @ApiPropertyOptional({ enum: SECTION_WIDTHS })
  @ValidateIf((dto: { width?: unknown }) => dto.width !== undefined)
  @IsIn(SECTION_WIDTHS)
  width?: SectionWidth;

  @ApiPropertyOptional({ description: '#RGB, #RRGGBB or #RRGGBBAA. Null is the page’s own colour.' })
  @IsOptional()
  @Matches(HEX_COLOUR, { message: 'background must be a hex colour' })
  background?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((dto: { isActive?: unknown }) => dto.isActive !== undefined)
  @IsBoolean()
  isActive?: boolean;

  // Declared, not left to `@ValidateNested()`: class-validator skips a nested field that is absent,
  // and the service then read a kind off `undefined` — a 500 for a body with no component.
  @ApiProperty({ type: ComponentDto })
  @IsDefined({ context: { errorCode: 'SECTION_COMPONENT_REQUIRED' satisfies PageErrorCode } })
  @IsObject({ context: { errorCode: 'SECTION_COMPONENT_REQUIRED' satisfies PageErrorCode } })
  @ValidateNested()
  @Type(() => ComponentDto)
  component!: ComponentDto;

  @ApiPropertyOptional({ minimum: 0, description: 'Its place among the bands, 0 first. Absent or past the end: last.' })
  @IsOptional()
  @IsInt({ context: { errorCode: 'POSITION_INVALID' satisfies PageErrorCode } })
  @Min(0, { context: { errorCode: 'POSITION_INVALID' satisfies PageErrorCode } })
  position?: number;
}

/** A component added into a band that exists, and where among the band's own it lands. */
export class AddComponentDto extends ComponentDto implements AddComponentPayload {
  @ApiPropertyOptional({ minimum: 0, description: 'Its place in the band, 0 first. Absent or past the end: last.' })
  @IsOptional()
  @IsInt({ context: { errorCode: 'POSITION_INVALID' satisfies PageErrorCode } })
  @Min(0, { context: { errorCode: 'POSITION_INVALID' satisfies PageErrorCode } })
  position?: number;
}

/**
 * A patch of a band: its own attributes only.
 *
 * What is inside it moves through the component routes, which is the model showing through the
 * API — a band's colour and a banner's picture are edited in different places because they are
 * different things.
 */
export class UpdateSectionDto implements UpdateSectionPayload {
  @ApiPropertyOptional({ maxLength: SECTION_NAME_MAX_LENGTH, nullable: true, description: 'Named bands are a site’s menu.' })
  @IsOptional()
  @IsString()
  @MaxCodePoints(SECTION_NAME_MAX_LENGTH)
  name?: string | null;

  @ApiPropertyOptional({ enum: SECTION_WIDTHS })
  @ValidateIf((dto: { width?: unknown }) => dto.width !== undefined)
  @IsIn(SECTION_WIDTHS)
  width?: SectionWidth;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOUR, { message: 'background must be a hex colour' })
  background?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((dto: { isActive?: unknown }) => dto.isActive !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
