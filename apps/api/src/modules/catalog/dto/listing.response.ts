// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AppliedCatalogFilter,
  CatalogFacets,
  CatalogFacetValue,
  CatalogOptionFacet,
} from '@harness-monorepo/contracts';

/** The shelf's facets and filters, for Swagger. Each `implements` its contract type. */

export class CatalogFacetValueResponse implements CatalogFacetValue {
  @ApiProperty({ description: "What goes in the address: a category's slug, a value's name." }) value!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ description: 'Products on the shelf with this value, under every other filter.' }) count!: number;
  @ApiProperty({ description: 'False when the count is zero.' }) available!: boolean;
  @ApiProperty() selected!: boolean;
  @ApiProperty({ nullable: true, type: String }) colorHex!: string | null;
}

export class CatalogOptionFacetResponse implements CatalogOptionFacet {
  @ApiProperty({ example: 'Tamanho' }) name!: string;
  @ApiProperty({ type: [CatalogFacetValueResponse] }) values!: CatalogFacetValueResponse[];
}

class DiscountFacetResponse {
  @ApiProperty() count!: number;
  @ApiProperty() selected!: boolean;
}

class PriceFacetResponse {
  @ApiProperty({ description: 'Whole cents.' }) minCents!: number;
  @ApiProperty({ description: 'Whole cents.' }) maxCents!: number;
}

export class CatalogFacetsResponse implements CatalogFacets {
  @ApiProperty({ type: [CatalogFacetValueResponse] }) categories!: CatalogFacetValueResponse[];
  @ApiProperty({ type: [CatalogOptionFacetResponse] }) options!: CatalogOptionFacetResponse[];
  @ApiProperty({ type: DiscountFacetResponse }) discount!: DiscountFacetResponse;
  @ApiProperty({ type: PriceFacetResponse, nullable: true }) price!: PriceFacetResponse | null;
}

export class AppliedCatalogFilterResponse implements AppliedCatalogFilter {
  @ApiProperty({ enum: ['categoria', 'busca', 'precoMin', 'precoMax', 'desconto', 'opcao'] })
  key!: AppliedCatalogFilter['key'];
  @ApiProperty({ example: 'Tamanho:P' }) value!: string;
  @ApiProperty({ example: 'Tamanho: P' }) label!: string;
}
