// Libs
import { z } from "zod"

/**
 * Server-only configuration. There is no NEXT_PUBLIC twin on purpose: the browser never calls the
 * API directly, so no URL of it belongs in the bundle.
 */
const schema = z.object({
  API_URL: z.url().default("http://localhost:3001/api"),
  /**
   * Example reviews on the shop window, for looking at the layout before a reviews domain exists.
   * Off by default, and even on, only for the shops in `STOREFRONT_DEMO_SHOPS`: a rating invented
   * and shown to a real buyer is a false claim. No production environment sets these.
   */
  STOREFRONT_DEMO_REVIEWS: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true"),
  STOREFRONT_DEMO_SHOPS: z
    .string()
    .optional()
    .transform((value) => (value ?? "").split(",").map((slug) => slug.trim()).filter(Boolean)),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
}

export const serverEnv = parsed.data
