"use client"

// Libs
import { useMutation } from "@tanstack/react-query"
import type { UseMutationResult } from "@tanstack/react-query"

// Types
import type { User } from "@harness-monorepo/contracts"

// App
import {
  forgotPassword,
  resendVerification,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "./auth-requests"

/** Keys for anything cached later; the signed-in person comes from the server today. */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
}

export function useSignIn(): UseMutationResult<User, Error, { email: string; password: string }> {
  return useMutation({ mutationFn: signIn })
}

export function useSignUp(): UseMutationResult<User, Error, { name: string; email: string; password: string }> {
  return useMutation({ mutationFn: signUp })
}

export function useSignOut(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: signOut })
}

export function useResendVerification(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: resendVerification })
}

export function useForgotPassword(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: forgotPassword })
}

export function useResetPassword(): UseMutationResult<void, Error, { token: string; password: string }> {
  return useMutation({ mutationFn: resetPassword })
}
