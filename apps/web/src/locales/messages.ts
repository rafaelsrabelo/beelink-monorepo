// Types
import type { AuthErrorCode, StoreErrorCode } from "@harness-monorepo/contracts"

/**
 * The codes that belong to no domain. The API's exception filter falls back to the HTTP status name
 * whenever a service threw no code of its own — `BAD_REQUEST` for a body the DTO refused, and so on
 * — and this app's own handlers answer in the same shape.
 *
 * They are declared here rather than in `@harness-monorepo/contracts` only because that package was
 * not this change's to write. They belong there, beside `AuthErrorCode` and `StoreErrorCode`, whose
 * doc comments both already promise "the HTTP-status fallbacks (`BAD_REQUEST`, …)" without naming
 * one — which is how a field-level 400 came to read as "Algo deu errado".
 */
export type HttpFallbackErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"

/** What this app's own route handlers answer for the two things no API endpoint serves yet. */
export type WebErrorCode = "CEP_INVALID" | "CEP_NOT_FOUND" | "CEP_UNAVAILABLE" | "UPLOAD_NOT_CONFIGURED"

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
    /**
     * The panel's own figures. Orders and sales are not among them because neither exists yet —
     * a card reading "0 pedidos" over a product that cannot take one is a lie with a number on it.
     * What a shopkeeper setting up genuinely needs is what is still missing, and that is real data.
     */
    readiness: {
      title: string
      /** "{done} de {total} prontos" */
      done: string
      complete: string
      /** "Falta: {items}" */
      missing: string
      storeLabel: string
      allStores: string
      openedOn: string
      located: string
      onMap: string
      offMap: string
      items: {
        description: string
        category: string
        logo: string
        banner: string
        address: string
        whatsapp: string
      }
    }
    title: string
    /** `{name}` is replaced at render; a function would not survive the server-to-client hop. */
    welcome: string
    unverifiedBadge: string
  }
  /**
   * The panel's own words. What a block already says — a tab's name, a field's label — stays in
   * the design system's dictionary; what lives here is the chrome around it and the routes' names.
   */
  stores: {
    nav: {
      /** The panel's home: the shopkeeper's own figures. */
      dashboard: string
      list: string
      overview: string
      settings: string
    }
    list: {
      description: string
      create: string
    }
    overview: {
      /** `{name}` is the shop's own name. */
      description: string
    }
    settings: {
      saved: string
    }
  }
  locale: {
    label: string
    ptBR: string
    en: string
  }
  /**
   * One dictionary for every `errorCode` the API answers, whichever domain raised it: the screens
   * ask it through a per-domain copy function, and an unknown code falls back to `UNKNOWN`.
   */
  errors: Record<
    AuthErrorCode | StoreErrorCode | HttpFallbackErrorCode | WebErrorCode | "UNKNOWN",
    string
  >
}
