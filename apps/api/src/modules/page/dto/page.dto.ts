// Nest
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Types
import type {
  ComponentDisplay,
  ComponentItem,
  ComponentKind,
  ComponentSpan,
  CreateComponentPayload,
  CreateSectionPayload,
  PageErrorCode,
  SectionWidth,
  TextAlign,
  UpdateComponentPayload,
  UpdateSectionPayload,
} from '@harness-monorepo/contracts';

// App
import {
  COMPONENT_BODY_MAX_LENGTH,
  COMPONENT_DISPLAYS,
  COMPONENT_KINDS,
  COMPONENT_MAX_COLUMNS,
  COMPONENT_MIN_COLUMNS,
  COMPONENT_SPANS,
  COMPONENT_SUBTITLE_MAX_LENGTH,
  COMPONENT_TITLE_MAX_LENGTH,
  HEX_COLOUR,
  SECTION_NAME_MAX_LENGTH,
  SECTION_WIDTHS,
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
  @MaxLength(COMPONENT_TITLE_MAX_LENGTH)
  title?: string | null;

  @ApiPropertyOptional({ maxLength: COMPONENT_SUBTITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMPONENT_SUBTITLE_MAX_LENGTH)
  subtitle?: string | null;

  @ApiPropertyOptional({ maxLength: COMPONENT_BODY_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(COMPONENT_BODY_MAX_LENGTH)
  body?: string | null;

  // A null passes here, as on every optional field, and `PageRules.checkedSpan` refuses it: the
  // column is NOT NULL, and a patch's `PartialType` would make this optional whatever it said.
  @ApiPropertyOptional({ enum: COMPONENT_SPANS })
  @IsOptional()
  @IsIn(COMPONENT_SPANS, { context: { errorCode: 'COMPONENT_SPAN_INVALID' satisfies PageErrorCode } })
  span?: ComponentSpan;

  @ApiPropertyOptional({ enum: COMPONENT_DISPLAYS, nullable: true, description: 'Read on BANNER. Null on every other kind.' })
  @IsOptional()
  @IsIn(COMPONENT_DISPLAYS, { context: { errorCode: 'COMPONENT_DISPLAY_INVALID' satisfies PageErrorCode } })
  display?: ComponentDisplay | null;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** A patch of one component. A key left out is a column left alone. */
export class UpdateComponentDto extends PartialType(ComponentDto) implements UpdateComponentPayload {}

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
  @MaxLength(SECTION_NAME_MAX_LENGTH)
  name?: string | null;

  @ApiPropertyOptional({ enum: SECTION_WIDTHS })
  @IsOptional()
  @IsIn(SECTION_WIDTHS)
  width?: SectionWidth;

  @ApiPropertyOptional({ description: '#RGB, #RRGGBB or #RRGGBBAA. Null is the page’s own colour.' })
  @IsOptional()
  @Matches(HEX_COLOUR, { message: 'background must be a hex colour' })
  background?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: ComponentDto })
  @ValidateNested()
  @Type(() => ComponentDto)
  component!: ComponentDto;
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
  @MaxLength(SECTION_NAME_MAX_LENGTH)
  name?: string | null;

  @ApiPropertyOptional({ enum: SECTION_WIDTHS })
  @IsOptional()
  @IsIn(SECTION_WIDTHS)
  width?: SectionWidth;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOUR, { message: 'background must be a hex colour' })
  background?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
