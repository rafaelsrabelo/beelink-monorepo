"use client"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Block
import { AuthCard } from "./auth-card"
import { AnchorLink, type LinkComponent } from "./auth-link"
import { forgotPasswordSchema, type ForgotPasswordValues } from "./auth-schemas"

export interface ForgotPasswordFormProps {
  onSubmit: (values: ForgotPasswordValues) => void | Promise<void>
  pending?: boolean
  error?: string
  /** True once the request went through. The answer is the same for any address, by design. */
  sent?: boolean
  loginHref?: string
  linkComponent?: LinkComponent
}

export function ForgotPasswordForm({
  onSubmit,
  pending = false,
  error,
  sent = false,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
}: ForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const footer = (
    <Link href={loginHref} className="underline underline-offset-4">
      Voltar para entrar
    </Link>
  )

  if (sent) {
    return (
      <AuthCard
        title="Confira seu e-mail"
        description="Se houver uma conta com esse endereço, enviamos um link para criar uma nova senha."
        footer={footer}
      >
        <p className="text-sm text-muted-foreground">
          O link vale por 1 hora e só pode ser usado uma vez. Não esqueça de olhar o spam.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Esqueceu a senha?"
      description="Enviamos um link para você criar uma nova"
      error={error}
      footer={footer}
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando…" : "Enviar link"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
