"use client"

// React
import { useState, type ReactNode } from "react"

// Icons
import { ClipboardCheckIcon, IdCardIcon, PercentIcon, UserIcon } from "lucide-react"

// UI
import { AffiliateCommissionBase } from "@harness-monorepo/ui/blocks/affiliates/affiliate-commission-base"
import { AffiliateCommissionTree } from "@harness-monorepo/ui/blocks/affiliates/affiliate-commission-tree"
import { AffiliateDocumentFields } from "@harness-monorepo/ui/blocks/affiliates/affiliate-document-fields"
import { AffiliateInviteSent } from "@harness-monorepo/ui/blocks/affiliates/affiliate-invite-sent"
import { AffiliatePersonFields } from "@harness-monorepo/ui/blocks/affiliates/affiliate-person-fields"
import { AffiliateReviewCards } from "@harness-monorepo/ui/blocks/affiliates/affiliate-review-cards"
import { AffiliateWizardFrame } from "@harness-monorepo/ui/blocks/affiliates/affiliate-wizard-frame"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import type { AffiliatePersonIssues, AffiliatePersonValues } from "@harness-monorepo/ui/lib/affiliate-wizard"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { DOCUMENT_ACCEPT, DOCUMENT_TYPES, WIZARD_STEPS, documentFilesOf, documentPayloadOf, invitePayloadOf, personIssuesOf, reviewOf, wizardStepsOf } from "@/lib/affiliate-wizard"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useInviteAffiliate } from "@/services/affiliates/shop-affiliate-hooks"
import { AffiliatesFrame } from "../affiliates-frame"
import { useCommissionWizard } from "./use-commission-wizard"
import { useDocumentDraft } from "./use-document-draft"

export interface AffiliateWizardScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const ICONS = { person: <UserIcon className="size-5" />, commission: <PercentIcon className="size-5" />, document: <IdCardIcon className="size-5" />, review: <ClipboardCheckIcon className="size-5" /> }
const NOTE_MAX = 500
const noPerson: AffiliatePersonValues = { name: "", email: "", phone: "", cpf: "" }
const codeOf = (error: Error | null): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * Inviting an affiliate, step by step (the user's design, 12/11/2026): who, the commission — a
 * shared table, or their own — the identity document, which may wait, and a review before it goes.
 * Each step is checked before the next opens; going back keeps everything typed.
 */
export function AffiliateWizardScreen({ slug, locale, messages }: AffiliateWizardScreenProps) {
  const text = messages.affiliates.wizard
  const [step, setStep] = useState(0)
  const [person, setPerson] = useState<AffiliatePersonValues>(noPerson)
  const [issues, setIssues] = useState<AffiliatePersonIssues>({})
  const [note, setNote] = useState("")
  const [stepError, setStepError] = useState("")
  const [sent, setSent] = useState<{ email: string; id: string } | null>(null)
  const commission = useCommissionWizard(slug, locale, messages)
  const document = useDocumentDraft(slug, messages)
  const invite = useInviteAffiliate(slug)

  const frame = (children: ReactNode) => (
    <AffiliatesFrame slug={slug} active="affiliates" messages={messages}>
      {children}
    </AffiliatesFrame>
  )

  function go(index: number) {
    setStepError("")
    setStep(index)
  }

  function restart() {
    setPerson(noPerson)
    setIssues({})
    setNote("")
    setSent(null)
    commission.restart()
    document.clear()
    invite.reset()
    go(0)
  }

  function submit() {
    if ([...note.trim()].length > NOTE_MAX) return setStepError(messages.affiliates.affiliateIssues.note)
    const choice = commission.choice()
    const outcome = documentPayloadOf(document.draft, text.document)
    if (!choice || "refusal" in outcome) return
    invite.mutate(invitePayloadOf({ person, commission: choice, document: outcome.document, note }), {
      onSuccess: (affiliate) => {
        if (affiliate) setSent({ email: affiliate.email, id: affiliate.id })
      },
    })
  }

  function next() {
    setStepError("")
    if (step === 0) {
      const found = personIssuesOf(person, messages.affiliates.affiliateIssues)
      setIssues(found)
      if (Object.keys(found).length > 0) return
    }
    if (step === 1 && !commission.ready) return
    if (step === 2) {
      const outcome = documentPayloadOf(document.draft, text.document)
      if ("refusal" in outcome) return setStepError(outcome.refusal)
    }
    if (step < WIZARD_STEPS.length - 1) return go(step + 1)
    submit()
  }

  if (sent) return frame(<AffiliateInviteSent email={sent.email} recordHref={`/admin/${slug}/affiliates/${sent.id}`} onAnother={restart} linkComponent={AppLink} messages={messages} />)

  const key = WIZARD_STEPS[step] ?? "person"
  const pending = invite.isPending
  const body =
    key === "person" ? (
      <AffiliatePersonFields
        value={person}
        onChange={(value) => {
          setIssues({})
          setPerson(value)
        }}
        issues={issues}
        messages={messages}
      />
    ) : key === "commission" ? (
      commission.failed ? (
        <AffiliatesFailed onRetry={commission.retry} messages={messages} />
      ) : !commission.ready ? (
        <AffiliatesSkeleton shape="list" />
      ) : (
        <>
          <AffiliateCommissionBase {...commission.base} messages={messages} />
          <AffiliateCommissionTree {...commission.tree} messages={messages} />
        </>
      )
    ) : key === "document" ? (
      <AffiliateDocumentFields
        types={DOCUMENT_TYPES.map((type) => ({ value: type, label: text.document.types[type] }))}
        type={document.draft.type}
        onType={(type) => document.setType(DOCUMENT_TYPES.find((one) => one === type) ?? "RG")}
        files={documentFilesOf(document.draft, text.document, locale)}
        accept={DOCUMENT_ACCEPT}
        onFile={document.choose}
        onRemove={document.remove}
        showLater
        messages={messages}
      />
    ) : (
      <AffiliateReviewCards view={reviewOf({ person, ...commission.review, document: document.draft, text })} onEdit={go} note={note} onNote={setNote} disabled={pending} messages={messages} />
    )

  return frame(
    <AffiliateWizardFrame
      steps={wizardStepsOf(step, text)}
      onStep={go}
      title={text.steps[key].title}
      subtitle={text.steps[key].subtitle}
      card={{ icon: ICONS[key], title: text.steps[key].cardTitle, description: text.steps[key].cardDescription }}
      onBack={step > 0 ? () => go(step - 1) : undefined}
      primary={key === "review" ? (pending ? text.sending : text.send) : text.next}
      onPrimary={next}
      pending={pending}
      error={stepError || (invite.error ? affiliateErrorOf(codeOf(invite.error), messages.affiliates.errors) : undefined)}
      wide={key === "commission"}
      messages={messages}
    >
      {body}
    </AffiliateWizardFrame>,
  )
}
