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
import { loginSchema, type LoginValues } from "./auth-schemas"

export interface LoginFormProps {
  onSubmit: (values: LoginValues) => void | Promise<void>
  pending?: boolean
  error?: string
  signupHref?: string
  forgotPasswordHref?: string
  linkComponent?: LinkComponent
}

export function LoginForm({
  onSubmit,
  pending = false,
  error,
  signupHref = "/signup",
  forgotPasswordHref = "/forgot-password",
  linkComponent: Link = AnchorLink,
}: LoginFormProps) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  return (
    <AuthCard
      title="Entrar"
      description="Use o e-mail e a senha da sua conta"
      error={error}
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href={signupHref} className="underline underline-offset-4">
            Criar conta
          </Link>
        </>
      }
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
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Link
                href={forgotPasswordHref}
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Esqueceu a senha?
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
              {pending ? "Entrando…" : "Entrar"}
            </Button>
            <FieldDescription className="text-center">
              Você recebe um e-mail de confirmação ao criar a conta.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
