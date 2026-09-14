// Libs
import { z } from "zod"

/**
 * Shape checks only — whether the e-mail looks like one, whether the password is long enough.
 * Whether the account exists, or the password is right, is the API's answer, never the form's.
 * The messages are copy, so they follow the product's locale.
 */
const email = z.email("Informe um e-mail válido")
const password = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres")
  .max(128, "A senha pode ter no máximo 128 caracteres")

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha"),
})

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email,
  password,
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ password, passwordConfirmation: z.string() })
  .refine((values) => values.password === values.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "As senhas não são iguais",
  })

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
