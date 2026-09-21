// Libs
import { ValidatorConstraint } from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { z } from 'zod';

// Types
import type { StoreLayoutSettings } from '@harness-monorepo/contracts';

/**
 * `layoutSettings` is the one blob that stays a blob, and this is what stops it being the legacy's
 * unvalidated one. It is declared with zod rather than as a class-validator nested class because it
 * has to do two jobs from one declaration: refuse an undeclared key on the way **in**, and narrow
 * Prisma's `JsonValue` on the way **out** — a DTO class can only do the first, and casting the
 * database read would be a lie the compiler cannot check. The repo had no precedent for validating
 * a nested shape, which is the case apps/api/AGENTS.md rule 6 leaves to a zod schema in the module.
 *
 * The values stay lower case on purpose: this is JSON, not a database enum, which keeps the legacy
 * import a key rename and nothing more.
 */
const shape = {
  showBanner: z.boolean().optional(),
  bannerType: z.enum(['single', 'carousel']).optional(),
  // Bounded because this is the one stored value echoed verbatim on the anonymous storefront route:
  // an unbounded array of unbounded strings is a payload a shopkeeper controls and every visitor
  // downloads.
  bannerImages: z
    .array(z.url({ protocol: /^https?$/ }).max(2048))
    .max(20)
    .optional(),
  bannerHeight: z.enum(['small', 'medium', 'large', 'full']).optional(),
  bannerRounded: z.boolean().optional(),
  bannerPadding: z.boolean().optional(),
  showStoreDescription: z.boolean().optional(),
  showSocialLinks: z.boolean().optional(),
  showContactInfo: z.boolean().optional(),
  productsPerRow: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  cardLayout: z.enum(['grid', 'horizontal']).optional(),
  showProductBadges: z.boolean().optional(),
  showProductDescription: z.boolean().optional(),
  showProductPrice: z.boolean().optional(),
  showProductRating: z.boolean().optional(),
  showProductStock: z.boolean().optional(),
  showQuickAdd: z.boolean().optional(),
  showFloatingCart: z.boolean().optional(),
  cartPosition: z.enum(['bottom-right', 'bottom-left']).optional(),
  categoryDisplay: z.enum(['tabs', 'filters', 'none']).optional(),
  showCategoryIcons: z.boolean().optional(),
  // `satisfies` is the drift alarm: a contract key this shape forgets fails to compile, and a key
  // the contract does not declare is an excess property. The annotation below checks the types.
} satisfies Record<keyof StoreLayoutSettings, z.ZodType>;

/**
 * The write path. `strictObject` refuses a key the contract does not declare, which is what the
 * global pipe's `forbidNonWhitelisted` cannot reach inside a plain JSON object.
 *
 * The annotation is the point of the file: it fails to compile the day `StoreLayoutSettings` gains
 * or loses a key this schema does not follow.
 */
export const storeLayoutSettingsSchema: z.ZodType<StoreLayoutSettings> = z.strictObject(shape);

/**
 * The read path, salvaged key by key rather than parsed as one object.
 *
 * Whole-object parsing here destroys data, because the panel round-trips this value: the settings
 * form does not edit `layoutSettings`, so it echoes back whatever the read returned, and the PUT
 * replaces the column whole. A single stored key of the wrong type would therefore turn every other
 * switch into `{}` on the shopkeeper's first save — a read-time degradation becoming a permanent
 * write-time loss. Per key, one bad value costs only itself.
 *
 * Undeclared keys are still dropped: the write path is `strictObject`, so carrying one through the
 * round trip would make the next save fail instead.
 */
export function parseLayoutSettings(value: unknown): StoreLayoutSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

  const stored = value as Record<string, unknown>;
  const salvaged: Record<string, unknown> = {};

  for (const [key, schema] of Object.entries(shape)) {
    if (!(key in stored)) continue;
    const parsed = schema.safeParse(stored[key]);
    if (parsed.success) salvaged[key] = parsed.data;
  }

  return salvaged as StoreLayoutSettings;
}

/** Lets a DTO field carry the zod schema, so one declaration validates both directions. */
@ValidatorConstraint({ name: 'isStoreLayoutSettings' })
export class IsStoreLayoutSettings implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return storeLayoutSettingsSchema.safeParse(value).success;
  }

  defaultMessage({ property, value }: ValidationArguments): string {
    const parsed = storeLayoutSettingsSchema.safeParse(value);
    return parsed.success ? '' : `${property}: ${z.prettifyError(parsed.error)}`;
  }
}
