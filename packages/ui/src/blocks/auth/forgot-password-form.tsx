"use client"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AuthCard } from "./auth-card"
import { AnchorLink, type LinkComponent } from "./auth-link"
import { createForgotPasswordSchema, type ForgotPasswordValues } from "./auth-schemas"

export interface ForgotPasswordFormProps {
  onSubmit: (values: ForgotPasswordValues) => void | Promise<void>
  pending?: boolean
  error?: string
  /** True once the request went through. The answer is the same for any address, by design. */
  sent?: boolean
  loginHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

export function ForgotPasswordForm({
  onSubmit,
  pending = false,
  error,
  sent = false,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: ForgotPasswordFormProps) {
  const text = messages.forgotPassword
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(createForgotPasswordSchema(messages.validation)),
    defaultValues: { email: "" },
  })

  const footer = (
    <Link href={loginHref} className="underline underline-offset-4">
      {text.backToSignIn}
    </Link>
  )

  if (sent) {
    return (
      <AuthCard title={text.sentTitle} description={text.sentDescription} footer={footer}>
        <p className="text-sm text-muted-foreground">{text.sentHint}</p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={text.title} description={text.description} error={error} footer={footer}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">{text.emailLabel}</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={text.emailPlaceholder}
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? text.submitting : text.submit}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
