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

export interface LoginScreenProps {
  ui: UiMessages
  web: WebMessages
  /** The panel page the person was on when the session ran out: signed in, they go back there. */
  back?: string | null
}

export function LoginScreen({ ui, web, back = null }: LoginScreenProps) {
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
            router.replace((back ?? "/dashboard") as Parameters<typeof router.replace>[0])
          },
        })
      }
    />
  )
}
