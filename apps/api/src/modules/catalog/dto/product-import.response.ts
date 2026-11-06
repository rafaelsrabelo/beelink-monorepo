// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Types
import type {
  ProductImportDraft,
  ProductImportDraftOption,
  ProductImportDraftValue,
  ProductImportExtraction,
  ProductImportResult,
} from '@harness-monorepo/contracts';

/** Swagger's view of the wire types. The service answers the contract's shapes; these only document them. */
export class ProductImportDraftValueResponse implements ProductImportDraftValue {
  @ApiProperty({ example: 'Morango' })
  name!: string;

  @ApiProperty({ type: Number, nullable: true, example: null, description: 'Whole cents, when priced apart from the product.' })
  priceCents!: number | null;
}

export class ProductImportDraftOptionResponse implements ProductImportDraftOption {
  @ApiProperty({ example: 'Sabor' })
  name!: string;

  @ApiProperty({ type: [ProductImportDraftValueResponse] })
  values!: ProductImportDraftValueResponse[];
}

export class ProductImportDraftResponse implements ProductImportDraft {
  @ApiProperty({ example: 'Dindin gourmet' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 400, description: 'Whole cents; null when the document shows none.' })
  priceCents!: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'Dindins' })
  categoryName!: string | null;

  @ApiPropertyOptional({ type: ProductImportDraftOptionResponse, nullable: true })
  option!: ProductImportDraftOptionResponse | null;
}

export class ProductImportExtractionResponse implements ProductImportExtraction {
  @ApiProperty({ type: [ProductImportDraftResponse], minItems: 1 })
  drafts!: ProductImportDraftResponse[];

  @ApiProperty({ type: [String], description: "The addresses the shop's products hold: a row whose name makes one is refused." })
  takenSlugs!: string[];
}

export class ProductImportResultResponse implements ProductImportResult {
  @ApiProperty({ type: [String], format: 'uuid', description: 'In the order sent. Every one is on sale.' })
  productIds!: string[];

  @ApiProperty({ example: 2 })
  categoriesCreated!: number;
}
