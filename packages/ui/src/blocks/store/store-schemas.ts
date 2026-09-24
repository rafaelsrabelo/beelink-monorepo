// Libs
import { z } from "zod"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PAYMENT_METHODS, STORE_CARD_LAYOUTS, STORE_LAYOUT_TYPES, STORE_TYPES } from "./store-types"

type ValidationMessages = UiMessages["validation"]

/**
 * Shape checks only — whether a colour is six hex digits, whether a CEP has eight. Whether the slug
 * is taken, or the address geocodes, is the API's answer and arrives as the `error` prop.
 * The messages come from the screen's locale, so every schema is built per language, exactly as
 * `auth/auth-schemas.ts` does.
 */

/** `#RRGGBB`: the only shape the storefront's custom properties accept. */
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
/** Lower case, `a-z`, `0-9` and single hyphens, as `CreateStorePayload.slug` documents. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** Eight digits, masked or not — the panel accepts both and the screen strips the mask. */
const ZIP_CODE_PATTERN = /^\d{5}-?\d{3}$/
const UF_PATTERN = /^[A-Za-z]{2}$/

/** A field that may be left blank, or must be a URL when it is not. */
function optionalUrl(messages: ValidationMessages) {
  return z.union([z.literal(""), z.url(messages.urlInvalid)])
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, "")
}

function colorField(messages: ValidationMessages) {
  return z.string().regex(COLOR_PATTERN, messages.colorInvalid)
}

export function createStoreIdentitySchema(messages: ValidationMessages) {
  return z.object({
    name: z.string().trim().min(2, messages.storeNameMin).max(120, messages.storeNameMax),
    type: z.enum(STORE_TYPES),
    // 2000, the same number `apps/api`'s CreateStoreDto and UpdateStoreDto carry. The legacy
    // column is an unbounded `text`, so a lower cap here refuses a migrated shop's own description.
    description: z.string().max(2000, messages.storeDescriptionMax),
    logoUrl: optionalUrl(messages),
    /** The empty string means "no category", which is what the API stores as null. */
    categoryId: z.string(),
  })
}

export function createStoreAddressSchema(messages: ValidationMessages) {
  return z.object({
    zipCode: z.union([z.literal(""), z.string().regex(ZIP_CODE_PATTERN, messages.zipCodeInvalid)]),
    street: z.string().max(200, messages.textTooLong),
    number: z.string().max(20, messages.textTooLong),
    complement: z.string().max(200, messages.textTooLong),
    neighborhood: z.string().max(200, messages.textTooLong),
    city: z.string().max(120, messages.textTooLong),
    state: z.union([z.literal(""), z.string().regex(UF_PATTERN, messages.ufInvalid)]),
  })
}

export function createStoreSocialSchema(messages: ValidationMessages) {
  return z.object({
    // Well-formed when given. Whether it may be empty depends on what is being made — a shop
    // cannot take an order without it, a site can — and that is decided where the form knows the
    // type: `requireWhatsappOnShop`, on the composed schemas. The screen strips the mask before it
    // sends; the form only counts.
    whatsapp: z.string().trim().refine((value) => {
      if (value === "") return true
      const digits = digitsOf(value).length
      return digits >= 10 && digits <= 15
    }, messages.whatsappInvalid),
    instagram: z.string().max(120, messages.textTooLong),
    tiktok: z.string().max(120, messages.textTooLong),
    /** A full profile URL: Spotify has no handle the web can expand. */
    spotify: optionalUrl(messages),
    youtube: z.string().max(120, messages.textTooLong),
  })
}

export function createStoreColorsSchema(messages: ValidationMessages) {
  return z.object({
    background: colorField(messages),
    primary: colorField(messages),
    footer: colorField(messages),
    header: colorField(messages),
  })
}

export function createStoreAppearanceSchema(messages: ValidationMessages) {
  return z.object({
    layoutType: z.enum(STORE_LAYOUT_TYPES),
    bannerImageUrl: optionalUrl(messages),
    /**
     * Lifted out of the `layoutSettings` JSON so the panel can offer it at all. The screen echoes
     * the rest of that blob back untouched and merges this one key over it.
     */
    cardLayout: z.enum(STORE_CARD_LAYOUTS),
    colors: createStoreColorsSchema(messages),
  })
}

/**
 * What `POST /api/stores` accepts, which is less than the settings form edits: the layout, the
 * banner and the payment methods are not part of `CreateStorePayload`, and the shop opens on the
 * platform's defaults for them. The slug is here and nowhere else — it is the one field that can
 * be set exactly once.
 */
/**
 * A shop needs a WhatsApp — an order has nowhere to go without it — and a site does not. Stated on
 * the composed schema, the one place that sees both the type and the number, and mirrored by the
 * API as `STORE_WHATSAPP_REQUIRED`.
 */
function requireWhatsappOnShop<T extends { identity: { type: string }; social: { whatsapp: string } }>(
  values: T,
  ctx: z.RefinementCtx,
  messages: ValidationMessages,
) {
  if (values.identity.type === "ECOMMERCE" && values.social.whatsapp.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["social", "whatsapp"], message: messages.whatsappRequired })
  }
}

export function createStoreCreateSchema(messages: ValidationMessages) {
  return z
    .object({
    slug: z
      .string()
      .trim()
      .min(3, messages.slugMin)
      .max(40, messages.slugMax)
      .regex(SLUG_PATTERN, messages.slugInvalid),
    identity: createStoreIdentitySchema(messages),
    address: createStoreAddressSchema(messages),
    social: createStoreSocialSchema(messages),
    colors: createStoreColorsSchema(messages),
  })
    .superRefine((values, ctx) => requireWhatsappOnShop(values, ctx, messages))
}

/**
 * One form, five tabs, one save — the legacy panel's single "Salvar alterações" over six tabs, and
 * the shape `PUT /api/stores/:slug` replaces whole. Blank means absent; the screen maps an empty
 * string to the payload's `null`.
 */
export function createStoreSettingsSchema(messages: ValidationMessages) {
  return z
    .object({
      identity: createStoreIdentitySchema(messages),
      address: createStoreAddressSchema(messages),
      social: createStoreSocialSchema(messages),
      appearance: createStoreAppearanceSchema(messages),
      // A checkout with no payment method cannot complete an order. The legacy panel only warned.
      paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1, messages.paymentMethodsMin),
    })
    .superRefine((values, ctx) => requireWhatsappOnShop(values, ctx, messages))
}

export type StoreIdentityValues = z.infer<ReturnType<typeof createStoreIdentitySchema>>
export type StoreAddressValues = z.infer<ReturnType<typeof createStoreAddressSchema>>
export type StoreSocialValues = z.infer<ReturnType<typeof createStoreSocialSchema>>
export type StoreAppearanceValues = z.infer<ReturnType<typeof createStoreAppearanceSchema>>
export type StoreSettingsValues = z.infer<ReturnType<typeof createStoreSettingsSchema>>
export type StoreCreateValues = z.infer<ReturnType<typeof createStoreCreateSchema>>
