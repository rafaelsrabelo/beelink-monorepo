// Libs
import { z } from "zod"

/**
 * Server-only configuration. There is no NEXT_PUBLIC twin on purpose: the browser never calls the
 * API directly, so no URL of it belongs in the bundle.
 */
const schema = z.object({
  API_URL: z.url().default("http://localhost:3001/api"),
  /**
   * A shop the landing page offers as an example ("Ver uma loja de exemplo"). Optional: without it
   * the page offers none, rather than lead to a shop that may not exist where this is deployed.
   *
   * Blank counts as unset: `.env.example` ships the line empty and compose hands an unset variable
   * over as `""`, and a refusal here is the whole web failing to start over an optional link.
   */
  EXAMPLE_STORE_SLUG: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
  ),
  /**
   * Which deployment this is. Only a stack that is not production sets it, so a variable copied
   * wrong or left out leaves the site as production reads: unmarked. `homolog` marks every page
   * with a flag and keeps search engines out, since it is the same site with made-up shops in it.
   *
   * Read at runtime and never `NEXT_PUBLIC_`: the same image is production or homologation by its
   * environment alone, with nothing baked into a bundle.
   */
  APP_ENVIRONMENT: z.preprocess((value) => (value === "" ? undefined : value), z.enum(["production", "homolog"]).default("production")),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
}

export const serverEnv = parsed.data
