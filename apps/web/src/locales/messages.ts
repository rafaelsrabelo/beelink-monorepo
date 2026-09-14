// Types
import type { AuthErrorCode } from "@harness-monorepo/contracts"

/**
 * What the screens say, on top of what the blocks already carry. `errors` turns an API `errorCode`
 * into a sentence — the one place that mapping exists, per apps/web/AGENTS.md.
 */
export interface WebMessages {
  metadata: {
    title: string
    description: string
  }
  auth: {
    signupSuccessTitle: string
    signupSuccessDescription: string
    signupSuccessBody: string
    resend: string
    resending: string
    resent: string
    goToSignIn: string
    missingToken: string
  }
  dashboard: {
    title: string
    navDashboard: string
    navReports: string
    navTeam: string
    navSettings: string
    navHelp: string
    cardRevenue: string
    cardNewAccounts: string
    cardActiveAccounts: string
    cardGrowth: string
    cardRevenueFootnote: string
    cardNewAccountsFootnote: string
    cardActiveAccountsFootnote: string
    cardGrowthFootnote: string
    /** `{name}` is replaced at render; a function would not survive the server-to-client hop. */
    welcome: string
    unverifiedBadge: string
  }
  locale: {
    label: string
    ptBR: string
    en: string
  }
  errors: Record<AuthErrorCode | "UNKNOWN", string>
}
