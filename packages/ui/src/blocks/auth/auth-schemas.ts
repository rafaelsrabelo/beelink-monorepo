// Libs
import { z } from "zod"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

type ValidationMessages = UiMessages["validation"]

/**
 * Shape checks only — whether the e-mail looks like one, whether the password is long enough.
 * Whether the account exists, or the password is right, is the API's answer, never the form's.
 * The messages come from the screen's locale, so the schema is built per language.
 */
function emailField(messages: ValidationMessages) {
  return z.email(messages.emailInvalid)
}

function passwordField(messages: ValidationMessages) {
  return z.string().min(8, messages.passwordMin).max(128, messages.passwordMax)
}

export function createLoginSchema(messages: ValidationMessages) {
  return z.object({
    email: emailField(messages),
    password: z.string().min(1, messages.passwordRequired),
  })
}

export function createSignupSchema(messages: ValidationMessages) {
  return z.object({
    name: z.string().trim().min(2, messages.nameMin),
    email: emailField(messages),
    password: passwordField(messages),
  })
}

export function createForgotPasswordSchema(messages: ValidationMessages) {
  return z.object({ email: emailField(messages) })
}

export function createResetPasswordSchema(messages: ValidationMessages) {
  return z
    .object({ password: passwordField(messages), passwordConfirmation: z.string() })
    .refine((values) => values.password === values.passwordConfirmation, {
      path: ["passwordConfirmation"],
      message: messages.passwordsDoNotMatch,
    })
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>
export type SignupValues = z.infer<ReturnType<typeof createSignupSchema>>
export type ForgotPasswordValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>
export type ResetPasswordValues = z.infer<ReturnType<typeof createResetPasswordSchema>>
