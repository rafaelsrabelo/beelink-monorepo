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
   */
  EXAMPLE_STORE_SLUG: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
}

export const serverEnv = parsed.data
