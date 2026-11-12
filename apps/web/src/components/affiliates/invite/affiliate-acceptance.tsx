"use client"

// React
import { useState } from "react"

// UI
import { AffiliateAcceptanceForm } from "@harness-monorepo/ui/blocks/affiliates/affiliate-acceptance-form"
import type { AffiliateAcceptanceFormValues, AffiliateAcceptanceIssues } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { AcceptedAffiliate, AffiliateInvitation, AffiliateSignUpPayload, AffiliateSlugUnavailableReason } from "@harness-monorepo/contracts"

// App
import { AppLink } from "@/components/app-link"
import { acceptanceFormOf, acceptancePayloadOf, inviteErrorOf, slugHintOf } from "@/lib/affiliate-invite-form"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useAcceptAffiliateInvite, useAffiliateInviteSignUp, useAffiliateSlugCheck } from "@/services/affiliates/affiliate-invite-hooks"
import { AffiliateInviteError } from "@/services/affiliates/affiliate-invite-requests"

export interface AffiliateAcceptanceProps {
  token: string
  invitation: AffiliateInvitation
  /** No account yet: it is made here, with the invited e-mail. */
  signUp: boolean
  /** This site's host, the `/name`'s link is said with. */
  host: string
  /** The shop changed its terms meanwhile: read the invite again. */
  onTermsChanged: () => void
  onAccepted: (accepted: AcceptedAffiliate) => void
  messages: UiMessages
}

const SLUG_DEBOUNCE_MS = 400

/**
 * Accepting an invite (IMPULSEIA-104): the form, the `/name` checked once the typing settles, and the
 * one call that accepts — signed in, or making the account. The API has the last word on the name:
 * a refusal of it lands under the field, the terms changed meanwhile ask to read again.
 */
export function AffiliateAcceptance({ token, invitation, signUp, host, onTermsChanged, onAccepted, messages }: AffiliateAcceptanceProps) {
  const text = messages.affiliateInvite
  const [value, setValue] = useState<AffiliateAcceptanceFormValues>(() => acceptanceFormOf(invitation))
  const [issues, setIssues] = useState<AffiliateAcceptanceIssues>({})
  const [notice, setNotice] = useState("")
  const settled = useDebouncedValue(value.slug.trim(), SLUG_DEBOUNCE_MS)
  const check = useAffiliateSlugCheck(token, settled)
  const accept = useAcceptAffiliateInvite(token)
  const signUpAndAccept = useAffiliateInviteSignUp(token)
  const sending = signUp ? signUpAndAccept : accept
  const hint = slugHintOf({ typed: value.slug, settled, check: check.data, checking: check.isFetching, host, storeSlug: invitation.store.slug }, text)

  function refused(error: Error) {
    if (!(error instanceof AffiliateInviteError)) return
    if (error.errorCode === "AFFILIATE_TERMS_CHANGED") {
      setValue((current) => ({ ...current, agreed: false }))
      setNotice(text.termsChanged)
      onTermsChanged()
    }
    if (error.errorCode === "AFFILIATE_SLUG_UNAVAILABLE") {
      const reason = error.details.reason as AffiliateSlugUnavailableReason | undefined
      setIssues((current) => ({ ...current, slug: text.slugReasons[reason ?? "TAKEN"] }))
    }
  }

  function submit() {
    const result = acceptancePayloadOf(value, { signUp, termsVersion: invitation.terms.version }, text.issues)
    if ("issues" in result) return setIssues(result.issues)
    const options = { onSuccess: onAccepted, onError: refused }
    if (signUp) signUpAndAccept.mutate(result.payload as AffiliateSignUpPayload, options)
    else accept.mutate(result.payload, options)
  }

  const code = sending.error instanceof AffiliateInviteError ? sending.error.errorCode : sending.error ? "UNKNOWN" : null
  // Said where they belong rather than over the form: the terms by the notice, the name under its field.
  const error = code && code !== "AFFILIATE_TERMS_CHANGED" && code !== "AFFILIATE_SLUG_UNAVAILABLE" ? inviteErrorOf(code, text.errors) : undefined

  return (
    <AffiliateAcceptanceForm
      signUp={signUp}
      value={value}
      onChange={(next) => {
        setIssues({})
        if (next.agreed !== value.agreed) setNotice("")
        setValue(next)
      }}
      onSubmit={submit}
      slugHint={hint}
      hasTerms={invitation.terms.text !== null}
      issues={issues}
      pending={sending.isPending}
      notice={notice || undefined}
      error={error}
      termsHref={LEGAL_ROUTES.terms}
      privacyHref={LEGAL_ROUTES.privacy}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
