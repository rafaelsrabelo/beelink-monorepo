// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

// Types
import type {
  SectionItem,
  SectionKind,
  SectionTarget,
  SectionWidth,
  CreateSectionPayload,
  ShowcaseLayout,
  UpdateSectionPayload,
} from '@harness-monorepo/contracts';

// App
import {
  SECTION_KINDS,
  SECTION_SUBTITLE_MAX_LENGTH,
  SECTION_TARGETS,
  SECTION_TITLE_MAX_LENGTH,
  SECTION_URL_MAX_LENGTH,
  SECTION_WIDTHS,
  SHOWCASE_LAYOUTS,
} from '../sections.constants.js';
import { sectionItemsFor } from '../section-items.schema.js';
import { blankToNull, imageUrl, trim } from '../../stores/dto/store-fields.dto.js';

export class CreateSectionDto implements CreateSectionPayload {
  @ApiProperty({ enum: SECTION_KINDS })
  @IsIn(SECTION_KINDS)
  kind!: SectionKind;

  /**
   * Optional on every kind, unlike a banner's. A cover is often a photograph with the shop's own
   * words already in it, and a PRODUCTS row with no title falls back to the platform's word for
   * the catalogue — which is what lets a shopkeeper rename "Todos os produtos" by typing, and undo
   * it by clearing the field rather than by remembering what it used to say.
   */
  @ApiPropertyOptional({ nullable: true, maxLength: SECTION_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SECTION_TITLE_MAX_LENGTH)
  @trim
  @blankToNull
  title?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: SECTION_SUBTITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SECTION_SUBTITLE_MAX_LENGTH)
  @trim
  @blankToNull
  subtitle?: string | null;

  /**
   * Nullable now, because three of the five kinds draw no picture of their own. The rule that a
   * BANNER must have one moved to `sectionItemsFor`, where it is stated per kind instead of for
   * every row in the table.
   */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @imageUrl
  @blankToNull
  imageUrl?: string | null;

  @ApiPropertyOptional({ enum: SHOWCASE_LAYOUTS })
  @IsOptional()
  @IsIn(SHOWCASE_LAYOUTS)
  layout?: ShowcaseLayout;

  @ApiPropertyOptional({ enum: SECTION_WIDTHS, description: 'Read only on COVER.' })
  @IsOptional()
  @IsIn(SECTION_WIDTHS)
  width?: SectionWidth;

  /**
   * A COVER's slides, or a BENEFITS band's rows.
   *
   * Validated by zod and not by class-validator, because the shape depends on `kind` and a
   * discriminated union is what states that once. The decorator here only proves it is an array;
   * `sectionItemsFor` is what refuses a slide with no picture or a benefit with no title.
   */
  @ApiPropertyOptional({ type: 'array', items: { type: 'object', additionalProperties: true } })
  @IsOptional()
  @IsArray()
  items?: SectionItem[];

  @ApiPropertyOptional({ enum: SECTION_TARGETS })
  @IsOptional()
  @IsIn(SECTION_TARGETS)
  target?: SectionTarget;

  @ApiPropertyOptional({ nullable: true, description: 'Required when target is CATEGORY.' })
  @IsOptional()
  @IsString()
  @blankToNull
  categorySlug?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Required when target is PRODUCT.' })
  @IsOptional()
  @IsString()
  @blankToNull
  productSlug?: string | null;

  /**
   * `require_protocol` is doing real work here, not tidying: it is what rejects
   * `javascript://x/%0aalert(1)`, which is otherwise a valid-looking URL that this value's one job
   * — being echoed into an anchor on the anonymous, indexed shop window — would then execute.
   */
  @ApiPropertyOptional({ nullable: true, maxLength: SECTION_URL_MAX_LENGTH })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(SECTION_URL_MAX_LENGTH)
  @blankToNull
  externalUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}

/** A patch: a key left out is a column left alone. `target` is the exception — see the service. */
export class UpdateSectionDto implements UpdateSectionPayload {
  /**
   * Where the banner lives: the top of the page, or its body.
   *
   * Patchable, unlike every other kind, because those two are the same block in two places and
   * the panel asks the question in exactly those words. The service refuses any other move — see
   * `PLACEMENT_SECTION_KINDS`.
   */
  @ApiPropertyOptional({ enum: SECTION_KINDS })
  @IsOptional()
  @IsIn(SECTION_KINDS)
  kind?: SectionKind;

  @ApiPropertyOptional({ enum: SECTION_WIDTHS, description: 'Read only on HERO.' })
  @IsOptional()
  @IsIn(SECTION_WIDTHS)
  width?: SectionWidth;

  /**
   * The whole list, never a patch of it: a hero's slides have an order, and sending one would
   * leave the API guessing where it goes.
   */
  @ApiPropertyOptional({ type: 'array', items: { type: 'object', additionalProperties: true } })
  @IsOptional()
  @IsArray()
  items?: SectionItem[];

  @ApiPropertyOptional({ nullable: true, maxLength: SECTION_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SECTION_TITLE_MAX_LENGTH)
  @trim
  @blankToNull
  title?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: SECTION_SUBTITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SECTION_SUBTITLE_MAX_LENGTH)
  @trim
  @blankToNull
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @imageUrl
  imageUrl?: string;

  @ApiPropertyOptional({ enum: SHOWCASE_LAYOUTS })
  @IsOptional()
  @IsIn(SHOWCASE_LAYOUTS)
  layout?: ShowcaseLayout;

  @ApiPropertyOptional({ enum: SECTION_TARGETS })
  @IsOptional()
  @IsIn(SECTION_TARGETS)
  target?: SectionTarget;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @blankToNull
  categorySlug?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @blankToNull
  productSlug?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: SECTION_URL_MAX_LENGTH })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(SECTION_URL_MAX_LENGTH)
  @blankToNull
  externalUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
