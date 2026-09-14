"use client"

// UI
import { ForgotPasswordForm } from "@harness-monorepo/ui/blocks/auth/forgot-password-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { useForgotPassword } from "@/services/auth/auth-hooks"
import { errorCopy } from "./auth-error-copy"

export function ForgotPasswordScreen({ ui, web }: { ui: UiMessages; web: WebMessages }) {
  const forgot = useForgotPassword()

  return (
    <ForgotPasswordForm
      messages={ui}
      linkComponent={AppLink}
      pending={forgot.isPending}
      error={errorCopy(forgot.error, web)}
      sent={forgot.isSuccess}
      onSubmit={({ email }) => forgot.mutate(email)}
    />
  )
}
