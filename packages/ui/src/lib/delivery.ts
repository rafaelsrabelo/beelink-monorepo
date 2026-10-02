// Block
import type { StorePoint } from "../blocks/store/store-types"
import type { IntegrationStatusValue } from "./integrations"

/**
 * The store settings' Delivery tab as its blocks read it (BEELINK-177). It mirrors the wire's shapes
 * in `packages/contracts/src/delivery.ts`; this package does not import them, so a screen hands its
 * data over and the blocks never learn where it came from.
 */

/** As many bands as the API takes. */
export const DELIVERY_BANDS_MAX = 10

/** One band as typed: kilometres, reais and minutes, before they are read. */
export interface DeliveryBandFormRow {
  upToKm: string
  fee: string
  windowFrom: string
  windowTo: string
}

export const EMPTY_DELIVERY_BAND: DeliveryBandFormRow = { upToKm: "", fee: "", windowFrom: "", windowTo: "" }

/** The whole tab as the form edits it. */
export interface DeliverySettingsFormValues {
  pickupEnabled: boolean
  ownDeliveryEnabled: boolean
  carriersEnabled: boolean
  bands: DeliveryBandFormRow[]
  freeAbove: string
}

/** What the form refuses, in words: a band by its position, and the free-delivery amount. */
export interface DeliverySettingsIssues {
  bands?: Partial<Record<number, string>>
  freeAbove?: string
}

/** The shop's Melhor Envio connection, as the carriers card says it. */
export interface DeliveryCarriersView {
  /** This deployment has an app set up; without one there is nothing to switch on. */
  available: boolean
  status: IntegrationStatusValue
  accountName: string | null
  sandbox: boolean
}

/** The map beside the bands: the shop's point and how far it reaches. */
export interface DeliveryMapView {
  tileUrl: string
  attribution: string
  /** Null while the shop has no point: the card asks for the address instead of drawing a map. */
  point: StorePoint | null
  radiusMeters: number | null
}
