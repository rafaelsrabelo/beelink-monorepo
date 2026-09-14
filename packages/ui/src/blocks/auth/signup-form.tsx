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
import { signupSchema, type SignupValues } from "./auth-schemas"

export interface SignupFormProps {
  onSubmit: (values: SignupValues) => void | Promise<void>
  pending?: boolean
  error?: string
  loginHref?: string
  linkComponent?: LinkComponent
}

export function SignupForm({
  onSubmit,
  pending = false,
  error,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
}: SignupFormProps) {
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  })

  return (
    <AuthCard
      title="Criar conta"
      description="Leva menos de um minuto"
      error={error}
      footer={
        <>
          Já tem conta?{" "}
          <Link href={loginHref} className="underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Como devemos chamar você"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

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
            <FieldLabel htmlFor="password">Senha</FieldLabel>
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
            <Button type="submit" disabled={pending}>
              {pending ? "Criando…" : "Criar conta"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
