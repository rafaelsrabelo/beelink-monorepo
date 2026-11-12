// Types
import type { AffiliateProfile, AffiliateProfilePayload } from "@harness-monorepo/contracts"
import type { AffiliateProfileFormValues } from "@harness-monorepo/ui/lib/affiliate-area"

// App
import { phoneLineOf } from "./account-menu"

/** The affiliate's data as the form shows it: the phone as a person writes it, `""` for what is not given. */
export function profileFormOf(profile: AffiliateProfile): AffiliateProfileFormValues {
  return { pixKey: profile.pixKey ?? "", phone: phoneLineOf(profile.phone) ?? "", photoUrl: profile.photoUrl ?? "", tagline: profile.tagline ?? "" }
}

/**
 * What changed, and only that: the API leaves a key it is not sent alone, so an ended standing — which
 * may not touch the photo or the phrase — saves its Pix key without sending them. A field emptied is
 * sent as null, which clears it; the API normalises and checks the rest.
 */
export function profilePatchOf(saved: AffiliateProfileFormValues, value: AffiliateProfileFormValues): AffiliateProfilePayload {
  const patch: AffiliateProfilePayload = {}
  for (const key of ["pixKey", "phone", "photoUrl", "tagline"] as const) {
    const next = value[key].trim()
    if (next !== saved[key].trim()) patch[key] = next === "" ? null : next
  }
  return patch
}
