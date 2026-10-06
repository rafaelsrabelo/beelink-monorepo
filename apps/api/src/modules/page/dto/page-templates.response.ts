// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { PageKind, PageTemplateSummary, StoreType, TemplateId, TemplateNeed } from '@harness-monorepo/contracts';

// App
import { TEMPLATE_IDS } from '../template-catalog.js';

const PAGE_KINDS = ['HOME', 'LANDING'] as const satisfies readonly PageKind[];
const STORE_TYPES = ['ECOMMERCE', 'INSTITUTIONAL'] as const satisfies readonly StoreType[];
const TEMPLATE_NEEDS = ['PRODUCT', 'CATEGORY'] as const satisfies readonly TemplateNeed[];

/** A model as the gallery lists it. `implements` its contract, so a field added and forgotten here fails to compile. */
export class PageTemplateResponse implements PageTemplateSummary {
  @ApiProperty({ enum: TEMPLATE_IDS, description: 'Its name and description are the client’s, keyed by this.' })
  id!: TemplateId;
  @ApiProperty({ enum: PAGE_KINDS, isArray: true }) pageKinds!: PageKind[];
  @ApiProperty({ enum: STORE_TYPES, isArray: true }) storeTypes!: StoreType[];
  @ApiProperty({ description: 'Suggested for this shop’s category. It orders the list; it hides nothing.' })
  recommended!: boolean;
  @ApiProperty({ enum: TEMPLATE_NEEDS, isArray: true, description: 'What the shopkeeper names before it can be arranged.' })
  needs!: TemplateNeed[];
}
