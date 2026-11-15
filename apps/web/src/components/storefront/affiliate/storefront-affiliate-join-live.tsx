"use client"

// React
import { useState } from "react"

// UI
import { StorefrontAffiliateJoinForm } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-join-form"
import { StorefrontAffiliateJoinHero } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-join-hero"
import { StorefrontAffiliateJoinPicture } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-join-picture"
import { StorefrontAffiliateJoinSections } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-join-sections"
import { StorefrontAffiliateJoinSent } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-join-sent"
import { StorefrontAffiliateLinkPreview } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-link-preview"
import { StorefrontAffiliateTermsDialog } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-terms-dialog"
import type { AffiliateJoinFormValues, AffiliateJoinFormView, AffiliateJoinIssues, AffiliateJoinPageView } from "@harness-monorepo/ui/lib/affiliate-join"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { applicationErrorOf, applicationPayloadOf } from "@/lib/affiliate-join"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { AffiliateApplicationError } from "@/services/storefront/affiliate-application-requests"
import { useSendAffiliateApplication } from "@/services/storefront/affiliate-application-hooks"

export interface StorefrontAffiliateJoinLiveProps {
  slug: string
  view: AffiliateJoinPageView
  form: AffiliateJoinFormView
  /** The shop's message after sending, its marks filled in. */
  success: string
  /** The programme's terms; null when the shop wrote none. */
  terms: string | null
  /** Where an affiliate's link starts at this shop: `lessari.com.br/`. */
  linkBase: string
  /** What a sale earns at the announced rate, said; null says nothing of it. */
  example: string | null
  homeHref: string
  messages: UiMessages
}

const EMPTY: AffiliateJoinFormValues = { name: "", email: "", phone: "", extraAnswer: "", accepted: false, website: "" }
const NO_ISSUES: AffiliateJoinIssues = {}

/**
 * The shop's "Seja afiliado" page, live (plan 2026-11-14): every button that asks for it opens the form
 * where the top's picture was, so one click is all there is between the page and the form, and the
 * answer takes the form's place.
 */
export function StorefrontAffiliateJoinLive({ slug, view, form, success, terms, linkBase, example, homeHref, messages }: StorefrontAffiliateJoinLiveProps) {
  const text = messages.affiliateJoin
  const send = useSendAffiliateApplication(slug)
  const [open, setOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [value, setValue] = useState<AffiliateJoinFormValues>(EMPTY)
  const [issues, setIssues] = useState<AffiliateJoinIssues>(NO_ISSUES)

  function openForm() {
    setOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function submit() {
    const result = applicationPayloadOf(value, form.extraQuestion !== null, text.form.issues)
    if ("issues" in result) return setIssues(result.issues)
    send.mutate(result.payload)
  }

  const firstName = value.name.trim().split(/\s+/)[0] ?? ""
  const aside = send.isSuccess ? (
    <StorefrontAffiliateJoinSent title={firstName ? format(text.sent.title, { name: firstName }) : text.sent.titleNoName} message={success} homeHref={homeHref} linkComponent={AppLink} messages={messages} />
  ) : open ? (
    <StorefrontAffiliateJoinForm
      view={form}
      value={value}
      onChange={(next) => {
        if (send.error) send.reset()
        setIssues(NO_ISSUES)
        setValue(next)
      }}
      onSubmit={submit}
      onClose={() => setOpen(false)}
      onTerms={() => setTermsOpen(true)}
      privacyHref={LEGAL_ROUTES.privacy}
      issues={issues}
      pending={send.isPending}
      error={send.error ? applicationErrorOf(send.error instanceof AffiliateApplicationError ? send.error.errorCode : "UNKNOWN", text.form.errors) : undefined}
      messages={messages}
    />
  ) : view.imageUrl ? (
    <StorefrontAffiliateJoinPicture url={view.imageUrl} />
  ) : (
    <StorefrontAffiliateLinkPreview base={linkBase} example={example} messages={messages} />
  )

  return (
    <>
      <StorefrontAffiliateJoinHero view={view} aside={aside} onOpen={openForm} />
      <StorefrontAffiliateJoinSections view={view} onOpen={openForm} />
      <StorefrontAffiliateTermsDialog open={termsOpen} onOpenChange={setTermsOpen} terms={terms} messages={messages} />
    </>
  )
}
