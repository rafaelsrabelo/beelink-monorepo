// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Types
import type {
  Section,
  PublicSectionItem,
  SectionItem,
  SectionKind,
  SectionTarget,
  SectionWidth,
  PublicSection,
  ShowcaseLayout,
} from '@harness-monorepo/contracts';

// App
import { SECTION_KINDS, SECTION_TARGETS, SECTION_WIDTHS, SHOWCASE_LAYOUTS } from '../sections.constants.js';

/**
 * The shapes out, for Swagger. Each `implements` its contract type, so a field added to the wire
 * and forgotten here fails to compile rather than going missing from the documentation.
 */
export class PublicSectionResponse implements PublicSection {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SECTION_KINDS }) kind!: SectionKind;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) subtitle!: string | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ enum: SHOWCASE_LAYOUTS }) layout!: ShowcaseLayout;
  @ApiProperty({ enum: SECTION_WIDTHS, description: 'Read only on HERO.' }) width!: SectionWidth;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: "A HERO's slides or a BENEFITS band's rows. Empty on every other kind.",
  })
  items!: PublicSectionItem[];
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Already resolved, or null when the block goes nowhere.",
  })
  href!: string | null;
  @ApiProperty({ description: 'Opens in a new tab. On the wire so nobody has to guess from the href.' })
  external!: boolean;
}

export class SectionResponse implements Section {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SECTION_KINDS }) kind!: SectionKind;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) subtitle!: string | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ enum: SHOWCASE_LAYOUTS }) layout!: ShowcaseLayout;
  @ApiProperty({ enum: SECTION_WIDTHS, description: 'Read only on HERO.' }) width!: SectionWidth;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: "A HERO's slides, with their ids, or a BENEFITS band's rows.",
  })
  items!: SectionItem[];
  @ApiProperty({ enum: SECTION_TARGETS }) target!: SectionTarget;
  @ApiPropertyOptional({ nullable: true, type: String }) categorySlug!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) productSlug!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) externalUrl!: string | null;
  @ApiProperty() position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
