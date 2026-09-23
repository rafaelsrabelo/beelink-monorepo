// React
import type { ComponentProps } from "react"

// UI
import type { StoreCreateForm } from "@harness-monorepo/ui/blocks/store/store-create-form"
import type { StoreSettingsForm } from "@harness-monorepo/ui/blocks/store/store-settings-form"

// Types
import type {
  CreateStorePayload,
  Store,
  StoreColors,
  UpdateStorePayload,
} from "@harness-monorepo/contracts"

/**
 * What the form holds, taken from the block itself rather than restated here. The design system
 * publishes its blocks as `.tsx`, so the schema module the type is inferred in is not reachable
 * from this workspace — and a second declaration of the same shape is exactly what the contract
 * rule exists to prevent.
 */
export type StoreSettingsValues = ComponentProps<typeof StoreSettingsForm>["defaultValues"]

/** The three groups both forms collect, taken from the same source as the settings form. */
export type StoreIdentityValues = StoreSettingsValues["identity"]
export type StoreSocialValues = StoreSettingsValues["social"]
export type StoreAddressValues = StoreSettingsValues["address"]

/** What the create form holds — the same four tabs, plus the slug that is set exactly once. */
export type StoreCreateValues = ComponentProps<typeof StoreCreateForm>["defaultValues"]

/** "" is what an empty text field holds; `null` is what the wire calls the same absence. */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** A handle is stored without its `@`, however the shopkeeper typed it. */
function handleOrNull(value: string): string | null {
  return orNull(value.replace(/^@+/, ""))
}

/**
 * Digits only. The field accepts a mask and the column holds none: the legacy stored "12345-678"
 * from one screen and "12345678" from another, so the two could never be compared.
 */
function digitsOf(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * The number as its owner knows it. The column keeps the country code — `wa.me/<this>` is built
 * from it — and the DTO puts the 55 there when a shop is saved with ten or eleven digits. Handing
 * all thirteen back to the field would show a shopkeeper a number they never typed, and the mask
 * beside it would give up on it: past eleven digits there is no single shape to format.
 *
 * Only 55 is stripped, and only at the length a Brazilian number has. The API makes the same
 * assumption in the same words — a product whose addresses are a CEP and a UF has no other
 * reading — and a number that is not one is handed back untouched rather than guessed at.
 */
function localPhone(stored: string): string {
  const digits = digitsOf(stored)
  const isBrazilianWithCountryCode = (digits.length === 12 || digits.length === 13) && digits.startsWith("55")

  return isBrazilianWithCountryCode ? digits.slice(2) : digits
}

/** The shop as the panel's five tabs show it. */
export function toSettingsValues(store: Store): StoreSettingsValues {
  return {
    identity: {
      name: store.name,
      type: store.type,
      description: store.description ?? "",
      logoUrl: store.logoUrl ?? "",
      categoryId: store.category?.id ?? "",
    },
    address: {
      zipCode: store.address.zipCode ?? "",
      street: store.address.street ?? "",
      number: store.address.number ?? "",
      complement: store.address.complement ?? "",
      neighborhood: store.address.neighborhood ?? "",
      city: store.address.city ?? "",
      state: store.address.state ?? "",
    },
    social: {
      whatsapp: localPhone(store.socialNetworks.whatsapp ?? ""),
      instagram: store.socialNetworks.instagram ?? "",
      tiktok: store.socialNetworks.tiktok ?? "",
      spotify: store.socialNetworks.spotify ?? "",
      youtube: store.socialNetworks.youtube ?? "",
    },
    appearance: {
      layoutType: store.layoutType,
      showProductsByCategory: store.showProductsByCategory,
      bannerImageUrl: store.bannerImageUrl ?? "",
      // The one key of `layoutSettings` the panel offers. A shop carried over from the legacy blob
      // may not carry it at all, and the storefront's own default for a missing key is the grid.
      cardLayout: store.layoutSettings.cardLayout ?? "grid",
      colors: store.colors,
    },
    paymentMethods: store.paymentMethods,
  }
}

/**
 * What the one save posts. PUT replaces the shop whole, so every field the panel owns is sent and
 * a blank one clears what was stored.
 *
 * The shop it was read from is an argument for one reason: `layoutSettings` holds around twenty
 * presentation switches and the panel offers exactly one of them, so a replacement that left the
 * blob out would clear what a row carried over from the legacy still holds.
 *
 * Which is why `cardLayout` is merged over the echo rather than sent on its own: the spread keeps
 * every key this form has never heard of, and the one key the appearance tab owns wins. The API's
 * parser validates the blob key by key and drops nothing it recognises, so what goes out whole
 * comes back whole.
 */
export function toUpdatePayload(store: Store, values: StoreSettingsValues): UpdateStorePayload {
  return {
    name: values.identity.name.trim(),
    type: values.identity.type,
    description: orNull(values.identity.description),
    logoUrl: orNull(values.identity.logoUrl),
    bannerImageUrl: orNull(values.appearance.bannerImageUrl),
    categoryId: orNull(values.identity.categoryId),
    layoutType: values.appearance.layoutType,
    showProductsByCategory: values.appearance.showProductsByCategory,
    colors: values.appearance.colors,
    socialNetworks: toSocialPayload(values.social),
    address: toAddressPayload(values.address),
    layoutSettings: { ...store.layoutSettings, cardLayout: values.appearance.cardLayout },
    paymentMethods: values.paymentMethods,
  } satisfies UpdateStorePayload
}

/** What the shopkeeper typed, as the wire wants it. */
function toSocialPayload(values: StoreSocialValues): CreateStorePayload["socialNetworks"] {
  return {
    // Digits only, and the country code is the API's to add: normalising it in two places is how
    // the legacy ended up with "+5511999998888" in one row and "11999998888" in the next. Empty is
    // null, which a site may send and a shop may not — the API says which.
    whatsapp: digitsOf(values.whatsapp) || null,
    instagram: handleOrNull(values.instagram),
    tiktok: handleOrNull(values.tiktok),
    spotify: orNull(values.spotify),
    youtube: handleOrNull(values.youtube),
  }
}

function toAddressPayload(values: StoreAddressValues): CreateStorePayload["address"] {
  return {
    street: orNull(values.street),
    number: orNull(values.number),
    complement: orNull(values.complement),
    neighborhood: orNull(values.neighborhood),
    city: orNull(values.city),
    state: orNull(values.state)?.toUpperCase() ?? null,
    zipCode: orNull(digitsOf(values.zipCode)),
  }
}

/**
 * What a new shop is built from. `StoreCreateValues` — what the create form actually holds — is
 * assignable to it: `colors` is optional here because the contract reads its absence as the
 * platform's own theme, and a caller with no palette to propose sends none rather than sending
 * four empty strings the API would refuse.
 */
export interface StoreCreateInput {
  slug: string
  identity: StoreIdentityValues
  social: StoreSocialValues
  address: StoreAddressValues
  colors?: StoreColors
}

/**
 * A new shop. The address and the social handles travel with it, which closes the legacy defect
 * the mapping notes record as F1: the five-step wizard collected both, refused to advance past
 * step 4 without WhatsApp, and then posted neither.
 *
 * Every blank-to-null and mask-stripping rule is the update path's, reused rather than restated:
 * the two verbs disagreeing about what "empty" means is how the legacy ended up storing a masked
 * postcode from one screen and a bare one from the next.
 */
export function toCreatePayload(input: StoreCreateInput): CreateStorePayload {
  return {
    name: input.identity.name.trim(),
    slug: input.slug,
    type: input.identity.type,
    // A site opens from a template; the first is the only one yet. A shop opens with its own page.
    ...(input.identity.type === "INSTITUTIONAL" ? { template: "servicos-b2b" as const } : {}),
    description: orNull(input.identity.description),
    logoUrl: orNull(input.identity.logoUrl),
    categoryId: orNull(input.identity.categoryId),
    socialNetworks: toSocialPayload(input.social),
    address: toAddressPayload(input.address),
    // Spread rather than `colors: input.colors`: the key must be absent, not present and
    // undefined, or `JSON.stringify` drops it anyway and the intent stops being readable here.
    ...(input.colors ? { colors: input.colors } : {}),
  } satisfies CreateStorePayload
}
