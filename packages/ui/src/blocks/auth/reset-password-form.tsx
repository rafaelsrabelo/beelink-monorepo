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

// Block
import { AuthCard } from "./auth-card"
import { AnchorLink, type LinkComponent } from "./auth-link"
import { resetPasswordSchema, type ResetPasswordValues } from "./auth-schemas"

export interface ResetPasswordFormProps {
  onSubmit: (values: ResetPasswordValues) => void | Promise<void>
  pending?: boolean
  error?: string
  loginHref?: string
  linkComponent?: LinkComponent
}

export function ResetPasswordForm({
  onSubmit,
  pending = false,
  error,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
}: ResetPasswordFormProps) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  })

  return (
    <AuthCard
      title="Criar nova senha"
      description="Ao salvar, você sai de todos os aparelhos conectados"
      error={error}
      footer={
        <Link href={loginHref} className="underline underline-offset-4">
          Voltar para entrar
        </Link>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">Nova senha</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <FieldDescription>De 8 a 128 caracteres.</FieldDescription>
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="passwordConfirmation">Repita a nova senha</FieldLabel>
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
              {pending ? "Salvando…" : "Salvar senha"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
