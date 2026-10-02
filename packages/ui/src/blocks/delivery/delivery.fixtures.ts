// Types
import type { DeliveryCarriersView, DeliveryMapView, DeliverySettingsFormValues } from "@harness-monorepo/ui/lib/delivery"

/** A shop that delivers in town by two bands, takes pickups, and ships by carrier. */
export const sampleDeliveryValues: DeliverySettingsFormValues = {
  pickupEnabled: true,
  ownDeliveryEnabled: true,
  carriersEnabled: true,
  bands: [
    { upToKm: "3", fee: "5,00", windowFrom: "30", windowTo: "50" },
    { upToKm: "8", fee: "9,00", windowFrom: "40", windowTo: "70" },
  ],
  freeAbove: "150,00",
}

export const sampleDeliveryPreviews = ["Até 3 km: R$ 5,00, chega em 30–50 min.", "Até 8 km: R$ 9,00, chega em 40–70 min."]

export const sampleConnectedCarriers: DeliveryCarriersView = { available: true, status: "CONNECTED", accountName: "Doces da Ana", sandbox: true }

/** OpenStreetMap's own tiles, which need no key — Storybook only. */
export const sampleDeliveryMap: DeliveryMapView = {
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap",
  point: { latitude: -23.5614, longitude: -46.6559 },
  radiusMeters: 8000,
}
