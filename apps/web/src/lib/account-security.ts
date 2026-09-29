// UI
import { format } from "@harness-monorepo/ui/locales/index"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { StorefrontSecurityField } from "@harness-monorepo/ui/blocks/storefront/storefront-account-security"

/** A refused change to the account's access, as its code; apart from `erro`, which is the details form's. */
export const SECURITY_ERROR_KEY = "erro-seguranca"
/** What the last change to the account's access came back with (`SecurityNotice`), under the shared `aviso`. */
export const SECURITY_NOTICE_KEY = "aviso"

export type SecurityNotice = "senha-trocada" | "link-senha"

/** The sentence for what the last change did; null for none, or a word it does not know. */
export function securityNoticeOf(raw: string | undefined, email: string, messages: UiMessages): string | null {
  const text = messages.storefront
  const said: Record<SecurityNotice, string> = {
    "senha-trocada": text.securityPasswordChanged,
    "link-senha": format(text.securityLinkSent, { email }),
  }
  return raw && Object.hasOwn(said, raw) ? said[raw as SecurityNotice] : null
}

/** The field a refusal is about: the current password, the new one, or its repetition. */
export function securityFieldOf(code: string | undefined): StorefrontSecurityField | null {
  if (code === "AUTH_PASSWORD_WRONG") return "atual"
  if (code === "CUSTOMER_PASSWORD_INVALID") return "password"
  if (code === "CUSTOMER_PASSWORD_MISMATCH") return "confirmacao"
  return null
}
