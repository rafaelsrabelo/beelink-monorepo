// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  PaymentMethod,
  PublicStore,
  Store,
  StoreAddress,
  StoreCategory,
  StoreColorPreset,
  StoreColors,
  StoreLayoutSettings,
  StoreLayoutType,
  StoreSocialNetworks,
  StoreType,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';

// App
import { PAYMENT_METHODS, STORE_LAYOUT_TYPES, STORE_TYPES } from '../stores.constants.js';

/** Documents the shapes for Swagger; the wire types themselves live in packages/contracts. */

export class StoreColorsResponse implements StoreColors {
  @ApiProperty({ example: '#F0F9FF' }) background!: string;
  @ApiProperty({ example: '#3B7AF7' }) primary!: string;
  @ApiProperty({ example: '#1A202C' }) text!: string;
  @ApiProperty({ example: '#3B7AF7' }) header!: string;
}

export class StoreSocialNetworksResponse implements StoreSocialNetworks {
  @ApiProperty({ nullable: true, example: '5511999998888' }) whatsapp!: string | null;
  @ApiProperty({ nullable: true, example: 'minhaloja' }) instagram!: string | null;
  @ApiProperty({ nullable: true }) tiktok!: string | null;
  @ApiProperty({ nullable: true, description: 'A full profile URL.' }) spotify!: string | null;
  @ApiProperty({ nullable: true }) youtube!: string | null;
}

/** Owner-only: it never reaches a visitor, so it hangs off StoreResponse and not the public one. */
export class StoreAddressResponse implements StoreAddress {
  @ApiProperty({ nullable: true }) street!: string | null;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) complement!: string | null;
  @ApiProperty({ nullable: true }) neighborhood!: string | null;
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ nullable: true, example: 'SP' }) state!: string | null;
  @ApiProperty({ nullable: true, example: '01310930' }) zipCode!: string | null;
}

/** One palette the panel applies in one click. The list is a constant; see its own file for why. */
export class StoreColorPresetResponse implements StoreColorPreset {
  @ApiProperty({ example: 'azul-profissional' }) id!: string;
  @ApiProperty({ example: 'Azul Profissional' }) name!: string;
  @ApiProperty({ type: StoreColorsResponse }) colors!: StoreColorsResponse;
}

export class StoreCategoryResponse implements StoreCategory {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'alimentacao' }) slug!: string;
  @ApiProperty({ example: 'Alimentação' }) name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true, description: 'A lucide icon name, never a URL.' }) icon!: string | null;
  @ApiProperty({ nullable: true, example: '#3B7AF7' }) color!: string | null;
}

/**
 * The words this shop's own URLs are built from, resolved from its `RouteVocabulary`. A class and
 * not an inline object literal because Swagger would otherwise document it as `{}`, and the web
 * builds every storefront link out of these three strings.
 */
export class StorefrontRouteWordsResponse implements StorefrontRouteWords {
  @ApiProperty({ example: 'produtos' }) products!: string;
  @ApiProperty({ example: 'categorias' }) categories!: string;
  @ApiProperty({ example: 'busca' }) search!: string;
}

/**
 * What `/stores/:slug/public` answers: everything the storefront renders and nothing more. Adding a
 * field here adds it to every shop page in Google's index, so the absences are deliberate.
 */
export class PublicStoreResponse implements PublicStore {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'padaria-do-bairro' }) slug!: string;

  @ApiProperty({
    type: StorefrontRouteWordsResponse,
    description: "Resolved from the shop's RouteVocabulary; every storefront link is built from it.",
  })
  routeWords!: StorefrontRouteWordsResponse;

  @ApiProperty({ example: 'Padaria do Bairro' }) name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: STORE_TYPES }) type!: StoreType;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ nullable: true, description: 'Shown when layoutType is BANNER.' })
  bannerImageUrl!: string | null;
  @ApiProperty({ enum: STORE_LAYOUT_TYPES }) layoutType!: StoreLayoutType;
  @ApiProperty() showProductsByCategory!: boolean;

  @ApiProperty({ type: StoreColorsResponse, description: 'Brand data — the storefront sets it as CSS variables.' })
  colors!: StoreColorsResponse;

  @ApiProperty({ type: StoreSocialNetworksResponse })
  socialNetworks!: StoreSocialNetworksResponse;

  @ApiProperty({ type: 'object', additionalProperties: true, description: 'StoreLayoutSettings' })
  layoutSettings!: StoreLayoutSettings;

  @ApiProperty({ enum: PAYMENT_METHODS, isArray: true, minItems: 1 })
  paymentMethods!: PaymentMethod[];
}

/** The shop as its owner edits it in the panel. */
export class StoreResponse extends PublicStoreResponse implements Store {
  @ApiProperty({ format: 'uuid' }) ownerId!: string;

  @ApiProperty({ type: StoreAddressResponse })
  address!: StoreAddressResponse;

  @ApiProperty({ nullable: true, type: Number, description: 'Decimal degrees, geocoded server-side.' })
  latitude!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  longitude!: number | null;

  @ApiProperty({ nullable: true, type: StoreCategoryResponse })
  category!: StoreCategoryResponse | null;

  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
