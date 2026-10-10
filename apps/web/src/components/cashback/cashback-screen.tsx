"use client"

// React
import { useState, type ReactNode } from "react"

// UI
import { CashbackFailed } from "@harness-monorepo/ui/blocks/cashback/cashback-failed"
import { CashbackOwed } from "@harness-monorepo/ui/blocks/cashback/cashback-owed"
import { CashbackSettingsForm } from "@harness-monorepo/ui/blocks/cashback/cashback-settings-form"
import { CashbackSkeleton } from "@harness-monorepo/ui/blocks/cashback/cashback-skeleton"
import type { CashbackSettingsFormValues, CashbackSettingsIssues } from "@harness-monorepo/ui/lib/cashback"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { cashbackErrorOf, cashbackExampleOf, cashbackFormOf, cashbackPayloadOf } from "@/lib/cashback-form"
import { CashbackError } from "@/services/cashback/cashback-requests"
import { useCashback, useSaveCashback } from "@/services/cashback/cashback-hooks"

export interface CashbackScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const NO_ISSUES: CashbackSettingsIssues = {}

/**
 * The shop's cashback (BEELINK-242): what it owes its customers in credit, over the rules it gives
 * it by. The form starts from the rules as saved and holds what is typed until it is saved again;
 * the example under it follows every keystroke, so the shopkeeper reads the rule before keeping it.
 */
export function CashbackScreen({ slug, locale, messages }: CashbackScreenProps) {
  const text = messages.cashback
  const overview = useCashback(slug)
  const save = useSaveCashback(slug)
  // What was typed since the rules were read; null shows the saved rules.
  const [typed, setTyped] = useState<CashbackSettingsFormValues | null>(null)
  const [issues, setIssues] = useState<CashbackSettingsIssues>(NO_ISSUES)
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  if (overview.isPending) return <Frame text={text}><CashbackSkeleton /></Frame>
  if (overview.isError) return <Frame text={text}><CashbackFailed onRetry={() => void overview.refetch()} messages={messages} /></Frame>

  const value = typed ?? cashbackFormOf(overview.data.settings)

  function change(next: CashbackSettingsFormValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  function submit() {
    const result = cashbackPayloadOf(value, text.issues)
    if ("issues" in result) return setIssues(result.issues)
    save.mutate(result.payload, { onSuccess: () => setTyped(null) })
  }

  return (
    <Frame text={text}>
      <CashbackOwed owed={overview.data.owed} money={money} messages={messages} />
      <CashbackSettingsForm
        value={value}
        onChange={change}
        onSubmit={submit}
        issues={issues}
        example={cashbackExampleOf(value, money, text.settings)}
        pending={save.isPending}
        error={save.error ? cashbackErrorOf(save.error instanceof CashbackError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
        saved={save.isSuccess}
        productsLink={
          <AppLink href={`/admin/${slug}/products`} className="text-foreground underline underline-offset-4">
            {text.settings.modeProductLink}
          </AppLink>
        }
        messages={messages}
      />
    </Frame>
  )
}

function Frame({ text, children }: { text: UiMessages["cashback"]; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>
      {children}
    </div>
  )
}
