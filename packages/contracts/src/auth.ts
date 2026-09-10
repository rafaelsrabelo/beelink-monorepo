import type { User } from "./user.js";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Answered by login and refresh. The web keeps both tokens in httpOnly cookies and mobile in secure
 * storage — never where page JavaScript can read them.
 */
export interface AuthSession {
  accessToken: string;
  /** ISO-8601 — the API refuses the access token after this instant. */
  accessTokenExpiresAt: string;
  /** Single use: refreshing returns a new one, and presenting a spent one ends the session. */
  refreshToken: string;
  /** ISO-8601. */
  refreshTokenExpiresAt: string;
  user: User;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

export interface VerifyEmailPayload {
  token: string;
}

/** Body of forgot-password and resend-verification — both answer 202 whether or not the e-mail has an account. */
export interface EmailPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

/** The `errorCode` values the auth endpoints answer, beyond the HTTP-status fallbacks (`BAD_REQUEST`, …). */
export type AuthErrorCode =
  | "AUTH_EMAIL_TAKEN"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_EMAIL_NOT_VERIFIED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_REFRESH_REUSED"
  | "AUTH_UNAUTHENTICATED"
  | "RATE_LIMITED";
