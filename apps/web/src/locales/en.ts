// Locales
import type { WebMessages } from "./messages"

export const en: WebMessages = {
  metadata: {
    title: "Harness",
    description: "The auth starter of harness-monorepo",
  },
  auth: {
    signupSuccessTitle: "Check your e-mail",
    signupSuccessDescription: "We sent a link to confirm your account",
    signupSuccessBody: "The link lasts 24 hours and works once. Remember to check the spam folder.",
    resend: "Send a new link",
    resending: "Sending…",
    resent: "We sent a new link.",
    goToSignIn: "Go to the sign-in screen",
    missingToken: "This address carries no valid link. Open the link straight from the e-mail.",
  },
  dashboard: {
    title: "Dashboard",
    navDashboard: "Dashboard",
    cardRevenue: "Total revenue",
    cardNewAccounts: "New accounts",
    cardActiveAccounts: "Active accounts",
    cardGrowth: "Growth",
    cardRevenueFootnote: "Compared with last month",
    cardNewAccountsFootnote: "Down over the period",
    cardActiveAccountsFootnote: "Retention above target",
    cardGrowthFootnote: "Within projection",
    welcome: "Welcome back, {name}",
    unverifiedBadge: "E-mail not confirmed",
  },
  locale: {
    label: "Language",
    ptBR: "Português",
    en: "English",
  },
  errors: {
    AUTH_EMAIL_TAKEN: "This e-mail is already registered.",
    AUTH_INVALID_CREDENTIALS: "Wrong e-mail or password.",
    AUTH_EMAIL_NOT_VERIFIED: "Confirm your e-mail before signing in. We sent a link when you created the account.",
    AUTH_TOKEN_INVALID: "This link expired or was already used. Ask for a new one.",
    AUTH_REFRESH_REUSED: "Your session was ended for safety. Sign in again.",
    AUTH_UNAUTHENTICATED: "Sign in to continue.",
    RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
    UNKNOWN: "Something went wrong. Try again in a moment.",
  },
}
