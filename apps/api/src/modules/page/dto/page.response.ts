// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  ComponentItem,
  ComponentKind,
  PublicComponent,
  PublicComponentItem,
  PublicSection,
  Section,
  SectionWidth,
  ShowcaseLayout,
  StoreComponent,
  TextAlign,
} from '@harness-monorepo/contracts';

// App
import { COMPONENT_KINDS, SECTION_WIDTHS, SHOWCASE_LAYOUTS, TEXT_ALIGNS } from '../page.constants.js';

/**
 * The shapes out, for Swagger. Each `implements` its contract type, so a field added to the wire
 * and forgotten here fails to compile rather than going missing from the documentation.
 */
export class PublicComponentResponse implements PublicComponent {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: COMPONENT_KINDS }) kind!: ComponentKind;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) subtitle!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'The paragraph, on a TEXT.' })
  body!: string | null;
  @ApiProperty({ enum: SHOWCASE_LAYOUTS }) layout!: ShowcaseLayout;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: "A BANNER's slides, addresses already built, or a BENEFITS band's rows.",
  })
  items!: PublicComponentItem[];
  @ApiProperty({ nullable: true, type: Number, description: 'How many across a grid draws.' })
  columns!: number | null;
  @ApiProperty({ enum: TEXT_ALIGNS, nullable: true, description: 'Null is the kind’s own habit.' })
  align!: TextAlign | null;
}

export class PublicSectionResponse implements PublicSection {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SECTION_WIDTHS }) width!: SectionWidth;
  @ApiProperty({ nullable: true, type: String, description: 'Null is the page’s own colour.' })
  background!: string | null;
  @ApiProperty({ type: PublicComponentResponse, isArray: true }) components!: PublicComponentResponse[];
}

export class ComponentResponse implements StoreComponent {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) sectionId!: string;
  @ApiProperty({ enum: COMPONENT_KINDS }) kind!: ComponentKind;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) subtitle!: string | null;
  @ApiProperty({ nullable: true, type: String }) body!: string | null;
  @ApiProperty({ enum: SHOWCASE_LAYOUTS }) layout!: ShowcaseLayout;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: "A BANNER's slides, with the ids they point at, or a BENEFITS band's rows.",
  })
  items!: ComponentItem[];
  @ApiProperty({ nullable: true, type: Number }) columns!: number | null;
  @ApiProperty({ enum: TEXT_ALIGNS, nullable: true }) align!: TextAlign | null;
  @ApiProperty({ description: 'Its place inside its band.' }) position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class SectionResponse implements Section {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SECTION_WIDTHS }) width!: SectionWidth;
  @ApiProperty({ nullable: true, type: String }) background!: string | null;
  @ApiProperty({ description: 'Its place on the page.' }) position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: ComponentResponse, isArray: true }) components!: ComponentResponse[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
