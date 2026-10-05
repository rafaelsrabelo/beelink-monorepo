"use client"

// React
import { useState } from "react"

// UI
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { PaymentSettingsForm } from "@harness-monorepo/ui/blocks/integrations/payment-settings-form"
import type { PaymentSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { paymentErrorOf, paymentFormOf, paymentPayloadOf } from "@/lib/asaas-form"
import { useAsaasSettings, useSaveAsaasSettings } from "@/services/integrations/asaas-hooks"
import { IntegrationError } from "@/services/integrations/integration-requests"

export interface AsaasPaymentsProps {
  slug: string
  messages: UiMessages
}

/**
 * The ways a shop is paid through Asaas (BEELINK-203), under its card and only while it is connected:
 * read as the section appears, held as changed until saved again. Every way switched off is said at
 * once and saved nowhere — the API is not asked what it would refuse.
 */
export function AsaasPayments({ slug, messages }: AsaasPaymentsProps) {
  const text = messages.integrations.payments
  const settings = useAsaasSettings(slug)
  const save = useSaveAsaasSettings(slug)
  const [changed, setChanged] = useState<PaymentSettingsFormValues | null>(null)

  if (settings.isError) return <IntegrationsFailed onRetry={() => void settings.refetch()} message={text.failed} messages={messages} />

  const value = changed ?? (settings.data ? paymentFormOf(settings.data) : null)
  const read = value ? paymentPayloadOf(value, text.issues) : null

  return (
    <PaymentSettingsForm
      value={value ?? "loading"}
      onChange={(next) => {
        if (save.error || save.isSuccess) save.reset()
        setChanged(next)
      }}
      onSubmit={() => {
        if (read && "payload" in read) save.mutate(read.payload, { onSuccess: () => setChanged(null) })
      }}
      issue={read && "issue" in read ? read.issue : undefined}
      pending={save.isPending}
      error={save.error ? paymentErrorOf(save.error instanceof IntegrationError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
      saved={save.isSuccess}
      messages={messages}
    />
  )
}
