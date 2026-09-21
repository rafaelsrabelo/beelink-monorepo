// Libs
import { z } from "zod"

/**
 * Server-only configuration. There is no NEXT_PUBLIC twin on purpose: the browser never calls the
 * API directly, so no URL of it belongs in the bundle.
 */
const schema = z.object({
  API_URL: z.url().default("http://localhost:3001/api"),

  /**
   * Cloudinary, for the image uploads. Optional as a group: a deployment without them serves the
   * panel and refuses uploads with `UPLOAD_NOT_CONFIGURED`, which is a state worth being able to
   * run in — a reviewer opening a preview does not need a storage account.
   *
   * The secret is server-only and must stay that way. It has no `NEXT_PUBLIC` twin, and the reason
   * is not style: the legacy wrote all three into `src/app/api/upload-image/route.ts` as `||`
   * fallbacks and pushed them to a public repository.
   */
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  /** Where the files land inside the account, so one Cloudinary can serve more than this app. */
  CLOUDINARY_FOLDER: z.string().min(1).default("bee-link"),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
}

export const serverEnv = parsed.data
