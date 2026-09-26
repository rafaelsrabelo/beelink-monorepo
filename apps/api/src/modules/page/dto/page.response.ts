// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  ComponentDisplay,
  ComponentItem,
  ComponentKind,
  ComponentSpan,
  DeviceVisibility,
  ProductSource,
  PublicComponent,
  PublicComponentItem,
  PublicSection,
  Section,
  SectionWidth,
  StoreComponent,
  TextAlign,
} from '@harness-monorepo/contracts';

// App
import {
  COMPONENT_DISPLAYS,
  DEVICE_VISIBILITIES,
  COMPONENT_KINDS,
  COMPONENT_SPANS,
  PRODUCT_SOURCES,
  SECTION_WIDTHS,
  TEXT_ALIGNS,
} from '../page.constants.js';

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
  @ApiProperty({ enum: COMPONENT_SPANS, description: 'Its slice of the band.' }) span!: ComponentSpan;
  @ApiProperty({ enum: COMPONENT_DISPLAYS, nullable: true, description: 'The layout — BANNER: BACKDROP, SPLIT, CAROUSEL or GRID; PRODUCTS: RAIL or GRID; CATEGORIES: RAIL, GRID or CHIPS; BENEFITS: INLINE or CARDS; ANNOUNCEMENT: STATIC or MARQUEE. Null on every other kind, and on a BENEFITS band or strip saved before they had a choice, which draw as they always did.' })
  display!: ComponentDisplay | null;
  @ApiProperty({ enum: PRODUCT_SOURCES, nullable: true, description: 'A showcase’s source. Null on every other kind.' })
  source!: ProductSource | null;
  @ApiProperty({ nullable: true, type: Object, description: 'The category a CATEGORY showcase draws: { slug, name, description }.' })
  sourceCategory!: { slug: string; name: string; description: string | null } | null;
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
  // Always sent; optional on the contract only for a page cached before it existed.
  @ApiProperty({ enum: DEVICE_VISIBILITIES, description: 'Where it shows. A band shows wherever one of its components does.' })
  visibleOn?: DeviceVisibility;
}

export class PublicSectionResponse implements PublicSection {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
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
  @ApiProperty({ enum: COMPONENT_SPANS, description: 'Its slice of the band.' }) span!: ComponentSpan;
  @ApiProperty({ enum: COMPONENT_DISPLAYS, nullable: true, description: 'The layout — BANNER: BACKDROP, SPLIT, CAROUSEL or GRID; PRODUCTS: RAIL or GRID; CATEGORIES: RAIL, GRID or CHIPS; BENEFITS: INLINE or CARDS; ANNOUNCEMENT: STATIC or MARQUEE. Null on every other kind, and on a BENEFITS band or strip saved before they had a choice, which draw as they always did.' })
  display!: ComponentDisplay | null;
  @ApiProperty({ enum: PRODUCT_SOURCES, nullable: true, description: 'A showcase’s. Null on every other kind.' })
  source!: ProductSource | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) sourceCategoryId!: string | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Null is 24.' }) limit!: number | null;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: "A BANNER's slides, with the ids they point at, or a BENEFITS band's rows.",
  })
  items!: ComponentItem[];
  @ApiProperty({ nullable: true, type: Number }) columns!: number | null;
  @ApiProperty({ enum: TEXT_ALIGNS, nullable: true }) align!: TextAlign | null;
  @ApiProperty({ enum: DEVICE_VISIBILITIES }) visibleOn!: DeviceVisibility;
  @ApiProperty({ description: 'Its place inside its band.' }) position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class SectionResponse implements Section {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
  @ApiProperty({ enum: SECTION_WIDTHS }) width!: SectionWidth;
  @ApiProperty({ nullable: true, type: String }) background!: string | null;
  @ApiProperty({ description: 'Its place on the page.' }) position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: ComponentResponse, isArray: true }) components!: ComponentResponse[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
