"use client"

// Next
import { useRouter } from "next/navigation"

// UI
import { LoginForm } from "@harness-monorepo/ui/blocks/auth/login-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { useSignIn } from "@/services/auth/auth-hooks"
import { errorCopy } from "./auth-error-copy"

export function LoginScreen({ ui, web }: { ui: UiMessages; web: WebMessages }) {
  const router = useRouter()
  const signIn = useSignIn()

  return (
    <LoginForm
      messages={ui}
      linkComponent={AppLink}
      pending={signIn.isPending}
      error={errorCopy(signIn.error, web)}
      onSubmit={(values) =>
        signIn.mutate(values, {
          onSuccess: () => {
            router.replace("/dashboard")
          },
        })
      }
    />
  )
}
