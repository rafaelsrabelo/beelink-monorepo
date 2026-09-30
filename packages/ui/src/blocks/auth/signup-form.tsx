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
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Block
import { AuthCard } from "./auth-card"
import { AnchorLink, type LinkComponent } from "./auth-link"
import { createSignupSchema, type SignupValues } from "./auth-schemas"

export interface SignupFormProps {
  onSubmit: (values: SignupValues) => void | Promise<void>
  pending?: boolean
  error?: string
  loginHref?: string
  /** bee-link's terms and privacy policy, which creating the account accepts (BEELINK-171). */
  termsHref?: string
  privacyHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

export function SignupForm({
  onSubmit,
  pending = false,
  error,
  loginHref = "/login",
  termsHref = "/termos",
  privacyHref = "/privacidade",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: SignupFormProps) {
  const text = messages.signup
  const legal = messages.legal
  const form = useForm<SignupValues>({
    resolver: zodResolver(createSignupSchema(messages.validation)),
    defaultValues: { name: "", email: "", password: "" },
  })

  return (
    <AuthCard
      title={text.title}
      description={text.description}
      error={error}
      footer={
        <>
          {text.hasAccount}{" "}
          <Link href={loginHref} className="underline underline-offset-4">
            {text.signIn}
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">{text.nameLabel}</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              placeholder={text.namePlaceholder}
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

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
            <Button type="submit" disabled={pending}>
              {pending ? text.submitting : text.submit}
            </Button>
            {/* Beside the button that creates the account: pressing it is what accepts. */}
            <FieldDescription className="text-center">
              {withParts(legal.signUpNotice, {
                terms: (
                  <Link href={termsHref} className="underline underline-offset-4">
                    {legal.terms}
                  </Link>
                ),
                privacy: (
                  <Link href={privacyHref} className="underline underline-offset-4">
                    {legal.privacy}
                  </Link>
                ),
              })}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
