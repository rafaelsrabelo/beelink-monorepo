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
import { createLoginSchema, type LoginValues } from "./auth-schemas"

export interface LoginFormProps {
  onSubmit: (values: LoginValues) => void | Promise<void>
  pending?: boolean
  error?: string
  signupHref?: string
  forgotPasswordHref?: string
  linkComponent?: LinkComponent
  /** Every sentence this block renders. Defaults to the product's own language. */
  messages?: UiMessages
}

export function LoginForm({
  onSubmit,
  pending = false,
  error,
  signupHref = "/signup",
  forgotPasswordHref = "/forgot-password",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: LoginFormProps) {
  const text = messages.login
  const form = useForm<LoginValues>({
    resolver: zodResolver(createLoginSchema(messages.validation)),
    defaultValues: { email: "", password: "" },
  })

  return (
    <AuthCard
      title={text.title}
      description={text.description}
      error={error}
      footer={
        <>
          {text.noAccount}{" "}
          <Link href={signupHref} className="underline underline-offset-4">
            {text.signUp}
          </Link>
        </>
      }
    >
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
            <div className="flex items-center">
              <FieldLabel htmlFor="password">{text.passwordLabel}</FieldLabel>
              <Link
                href={forgotPasswordHref}
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                {text.forgotPassword}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? text.submitting : text.submit}
            </Button>
            <FieldDescription className="text-center">
              {text.hint}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
