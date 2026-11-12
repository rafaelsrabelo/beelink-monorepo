"use client"

// React
import { useState, type ReactNode } from "react"

// UI
import { AffiliateInviteDone } from "@harness-monorepo/ui/blocks/affiliates/affiliate-invite-done"
import { AffiliateInviteNotice } from "@harness-monorepo/ui/blocks/affiliates/affiliate-invite-notice"
import { AffiliateInviteSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliate-invite-skeleton"
import { AffiliateInvitationSummary } from "@harness-monorepo/ui/blocks/affiliates/affiliate-invitation-summary"
import { AuthCard } from "@harness-monorepo/ui/blocks/auth/auth-card"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { AcceptedAffiliate } from "@harness-monorepo/contracts"

// App
import { AppLink } from "@/components/app-link"
import { invitationViewOf } from "@/lib/affiliate-invite-form"
import { affiliateDateFormatter, affiliateLinkOf } from "@/lib/affiliate-people"
import { AFFILIATE_INVITE_PATH, signInHrefOf } from "@/lib/panel-return"
import { startOver } from "@/lib/start-over"
import { useSignOut } from "@/services/auth/auth-hooks"
import { useAffiliateInvitation } from "@/services/affiliates/affiliate-invite-hooks"
import { AffiliateInviteError } from "@/services/affiliates/affiliate-invite-requests"
import { AffiliateAcceptance } from "./affiliate-acceptance"

export interface AffiliateInviteScreenProps {
  token: string
  /** The bee-link account signed in on this browser, as the server read it; null for none. */
  signedInEmail: string | null
  /** This site's origin: the affiliate's link is spelled with it. */
  origin: string
  locale: string
  messages: UiMessages
}

/**
 * The invite to sell for a shop (IMPULSEIA-104), on bee-link's own site. Who is signed in picks the
 * way in: making the account here, signing in to come back, accepting with the account invited, or
 * — in another account — signing out first, which is said before anything is asked.
 */
export function AffiliateInviteScreen({ token, signedInEmail, origin, locale, messages }: AffiliateInviteScreenProps) {
  const text = messages.affiliateInvite
  const invitation = useAffiliateInvitation(token)
  const signOut = useSignOut()
  const [accepted, setAccepted] = useState<AcceptedAffiliate | null>(null)
  const [copied, setCopied] = useState(false)
  const here = `${AFFILIATE_INVITE_PATH}?token=${encodeURIComponent(token)}`

  const card = (title: string, description: string, children: ReactNode) => (
    <AuthCard title={title} description={description} className="max-w-lg">
      {children}
    </AuthCard>
  )

  if (accepted) {
    const link = affiliateLinkOf(origin, accepted.storeSlug, accepted.slug) ?? origin
    return card(
      format(text.done.title, { store: accepted.storeName }),
      "",
      <AffiliateInviteDone
        link={link}
        copied={copied}
        onCopy={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}
        messages={messages}
      />,
    )
  }

  if (!token) return card(text.title, "", <AffiliateInviteNotice title={text.notFound.title} body={text.notFound.body} />)
  if (invitation.isPending) return card(text.title, "", <AffiliateInviteSkeleton />)
  if (invitation.isError) {
    const code = invitation.error instanceof AffiliateInviteError ? invitation.error.errorCode : "UNKNOWN"
    if (code === "AFFILIATE_INVITE_NOT_FOUND") return card(text.title, "", <AffiliateInviteNotice title={text.notFound.title} body={text.notFound.body} />)
    if (code === "AFFILIATE_INVITE_EXPIRED") return card(text.title, "", <AffiliateInviteNotice title={text.expired.title} body={text.expired.body} />)
    return card(
      text.title,
      "",
      <AffiliateInviteNotice
        title={text.failed}
        action={
          <Button type="button" variant="outline" onClick={() => void invitation.refetch()}>
            {text.retry}
          </Button>
        }
      />,
    )
  }

  const data = invitation.data
  const invited = data.affiliate.email
  const summary = <AffiliateInvitationSummary invitation={invitationViewOf(data, locale, affiliateDateFormatter(locale))} messages={messages} />
  const description = format(text.description, { store: data.store.name })

  let way: ReactNode
  if (signedInEmail && signedInEmail.toLowerCase() !== invited.toLowerCase()) {
    way = (
      <AffiliateInviteNotice
        title={text.mismatch.title}
        body={format(text.mismatch.body, { current: signedInEmail, email: invited })}
        action={
          <Button type="button" variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate(undefined, { onSettled: () => startOver(here) })}>
            {signOut.isPending ? text.mismatch.acting : text.mismatch.action}
          </Button>
        }
      />
    )
  } else if (!signedInEmail && data.hasAccount) {
    way = (
      <AffiliateInviteNotice
        title={text.signIn.title}
        body={format(text.signIn.body, { email: invited })}
        action={
          <AppLink href={signInHrefOf(here)} className={buttonVariants()}>
            {text.signIn.action}
          </AppLink>
        }
      />
    )
  } else {
    way = <AffiliateAcceptance token={token} invitation={data} signUp={!signedInEmail} host={new URL(origin).host} onTermsChanged={() => void invitation.refetch()} onAccepted={setAccepted} messages={messages} />
  }

  return card(
    text.title,
    description,
    <div className="flex flex-col gap-6">
      {summary}
      <hr />
      {way}
    </div>,
  )
}
