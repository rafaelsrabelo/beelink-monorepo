"use client"

// React
import { useState } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useResendVerification } from "@/services/auth/auth-hooks"

/**
 * The verification itself runs on the server, which spends the token once. Only asking for a new
 * link needs the browser — and it asks for the address, since the link never carried it.
 */
export function ResendVerification({ ui }: { ui: UiMessages }) {
  const [email, setEmail] = useState("")
  const resend = useResendVerification()

  if (resend.isSuccess) {
    return <p className="text-sm text-muted-foreground">{ui.verifyEmail.resentBody}</p>
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        resend.mutate(email)
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="resend-email">{ui.login.emailLabel}</FieldLabel>
          <Input
            id="resend-email"
            type="email"
            required
            autoComplete="email"
            placeholder={ui.login.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field>
          <Button type="submit" disabled={resend.isPending}>
            {resend.isPending ? ui.verifyEmail.resending : ui.verifyEmail.resend}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
