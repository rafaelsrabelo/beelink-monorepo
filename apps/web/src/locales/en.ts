// Locales
import type { WebMessages } from "./messages"

export const en: WebMessages = {
  metadata: {
    title: "bee-link",
    description: "Your online shop, with orders over WhatsApp. Build the window, take the orders, keep the conversation.",
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
    welcome: "Welcome back, {name}",
    unverifiedBadge: "E-mail not confirmed",
  },
  stores: {
    nav: {
      list: "My shops",
      overview: "Overview",
      settings: "Shop settings",
    },
    list: {
      description: "Pick a shop to manage, or create another one.",
      create: "New shop",
    },
    overview: {
      description: "This is how customers reach {name}.",
    },
    settings: {
      saved: "Changes saved.",
    },
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
    STORE_NOT_FOUND: "This shop no longer exists.",
    STORE_SLUG_TAKEN: "This address is already taken. Pick another one.",
    STORE_SLUG_RESERVED: "This address is reserved by the system. Pick another one.",
    STORE_FORBIDDEN: "This shop is not yours.",
    STORE_CATEGORY_NOT_FOUND: "This category no longer exists. Pick another one.",
    RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
    BAD_REQUEST: "A field was refused. The tabs carrying a warning are the ones to fix.",
    UNAUTHORIZED: "Sign in to continue.",
    FORBIDDEN: "You are not allowed to do this.",
    NOT_FOUND: "We could not find what you asked for.",
    CONFLICT: "This already exists. Pick another value.",
    PAYLOAD_TOO_LARGE: "The file is too large. Send a smaller image.",
    UNSUPPORTED_MEDIA_TYPE: "This file format is not accepted.",
    TOO_MANY_REQUESTS: "Too many attempts. Wait a minute and try again.",
    INTERNAL_ERROR: "Something broke on our side. Try again in a moment.",
    INTERNAL_SERVER_ERROR: "Something broke on our side. Try again in a moment.",
    BAD_GATEWAY: "A service we depend on did not answer. Try again in a moment.",
    SERVICE_UNAVAILABLE: "The service is down right now. Try again in a moment.",
    CEP_INVALID: "A postcode is eight digits. Check what you typed.",
    CEP_NOT_FOUND: "No address for this postcode. Check the digits, or fill the address in by hand.",
    CEP_UNAVAILABLE: "The postcode service did not answer. Fill the address in by hand — this does not stop you saving.",
    UPLOAD_NOT_CONFIGURED: "Image upload is not configured in this environment yet.",
    UNKNOWN: "Something went wrong. Try again in a moment.",
  },
}
