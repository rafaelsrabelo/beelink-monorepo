"use client"

// Next
import { useRouter } from "next/navigation"

// UI
import { ResetPasswordForm } from "@harness-monorepo/ui/blocks/auth/reset-password-form"
import { VerifyEmailStatus } from "@harness-monorepo/ui/blocks/auth/verify-email-status"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { useResetPassword } from "@/services/auth/auth-hooks"
import { errorCopy } from "./auth-error-copy"

export function ResetPasswordScreen({ ui, web, token }: { ui: UiMessages; web: WebMessages; token?: string }) {
  const router = useRouter()
  const reset = useResetPassword()

  // Someone typed the address by hand, or the link lost its query on the way.
  if (!token) {
    return (
      <VerifyEmailStatus
        state="invalid"
        messages={{ ...ui, verifyEmail: { ...ui.verifyEmail, invalidBody: web.auth.missingToken } }}
        linkComponent={AppLink}
      />
    )
  }

  return (
    <ResetPasswordForm
      messages={ui}
      linkComponent={AppLink}
      pending={reset.isPending}
      error={errorCopy(reset.error, web)}
      onSubmit={({ password }) =>
        reset.mutate(
          { token, password },
          {
            onSuccess: () => {
              router.replace("/login")
            },
          },
        )
      }
    />
  )
}
