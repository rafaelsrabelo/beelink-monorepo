"use client"

// UI
import { SignupForm } from "@harness-monorepo/ui/blocks/auth/signup-form"
import { VerifyEmailStatus } from "@harness-monorepo/ui/blocks/auth/verify-email-status"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { useResendVerification, useSignUp } from "@/services/auth/auth-hooks"
import { errorCopy } from "./auth-error-copy"

export function SignupScreen({ ui, web }: { ui: UiMessages; web: WebMessages }) {
  const signUp = useSignUp()
  const resend = useResendVerification()

  // Signing up ends on the same screen the spent-link case ends on: "check your e-mail", with a
  // way to ask again. One block, two entrances.
  if (signUp.isSuccess) {
    return (
      <VerifyEmailStatus
        state="invalid"
        messages={{
          ...ui,
          verifyEmail: {
            ...ui.verifyEmail,
            invalidTitle: web.auth.signupSuccessTitle,
            invalidDescription: web.auth.signupSuccessDescription,
            invalidBody: web.auth.signupSuccessBody,
            resentBody: web.auth.resent,
          },
        }}
        linkComponent={AppLink}
        onResend={() => resend.mutate(signUp.data.email)}
        resendPending={resend.isPending}
        resent={resend.isSuccess}
      />
    )
  }

  return (
    <SignupForm
      messages={ui}
      linkComponent={AppLink}
      pending={signUp.isPending}
      error={errorCopy(signUp.error, web)}
      onSubmit={(values) => signUp.mutate(values)}
    />
  )
}
