"use client"

// React
import { useState } from "react"

// Types
import type { AffiliateHome } from "@harness-monorepo/contracts"

// UI
import { AffiliateProfileForm } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-profile-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { profileFormOf, profilePatchOf } from "@/lib/affiliate-profile-form"
import { useSaveAffiliateProfile } from "@/services/affiliate-area/affiliate-area-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface AffiliateProfileSectionProps {
  slug: string
  home: AffiliateHome
  messages: UiMessages
}

/** "Meus dados": how the shop pays them, and what its window shows of them. The saved data is the front page's. */
export function AffiliateProfileSection({ slug, home, messages }: AffiliateProfileSectionProps) {
  const saved = profileFormOf(home.profile)
  // Null while nothing was typed: the form shows what is saved.
  const [draft, setDraft] = useState<typeof saved | null>(null)
  const save = useSaveAffiliateProfile(slug)
  const photo = useImageUpload()
  const text = messages.affiliateArea
  const value = draft ?? saved
  const patch = profilePatchOf(saved, value)
  const code = save.error instanceof AffiliateError ? save.error.errorCode : "UNKNOWN"

  return (
    <AffiliateProfileForm
      value={value}
      onChange={setDraft}
      onSubmit={() => save.mutate(patch, { onSuccess: () => setDraft(null) })}
      onUploadPhoto={photo.upload}
      photoPending={photo.pending}
      showcaseLocked={home.affiliate.status === "ENDED"}
      pending={save.isPending}
      pristine={Object.keys(patch).length === 0}
      saved={save.isSuccess}
      error={save.isError ? (code in text.errors ? text.errors[code as keyof typeof text.errors] : text.errors.UNKNOWN) : undefined}
      name={home.affiliate.name}
      messages={messages}
    />
  )
}
