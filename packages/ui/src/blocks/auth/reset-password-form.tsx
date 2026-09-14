"use client"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AuthCard } from "./auth-card"
import { AnchorLink, type LinkComponent } from "./auth-link"
import { createResetPasswordSchema, type ResetPasswordValues } from "./auth-schemas"

export interface ResetPasswordFormProps {
  onSubmit: (values: ResetPasswordValues) => void | Promise<void>
  pending?: boolean
  error?: string
  loginHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

export function ResetPasswordForm({
  onSubmit,
  pending = false,
  error,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: ResetPasswordFormProps) {
  const text = messages.resetPassword
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(createResetPasswordSchema(messages.validation)),
    defaultValues: { password: "", passwordConfirmation: "" },
  })

  return (
    <AuthCard
      title={text.title}
      description={text.description}
      error={error}
      footer={
        <Link href={loginHref} className="underline underline-offset-4">
          {text.backToSignIn}
        </Link>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">{text.passwordLabel}</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <FieldDescription>{text.passwordHint}</FieldDescription>
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="passwordConfirmation">{text.confirmationLabel}</FieldLabel>
            <Input
              id="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.passwordConfirmation)}
              {...form.register("passwordConfirmation")}
            />
            <FieldError errors={[form.formState.errors.passwordConfirmation]} />
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
