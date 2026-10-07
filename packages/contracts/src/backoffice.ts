/**
 * The backoffice (BEELINK-226): where bee-link's own team administers the platform. A third door,
 * beside the panel's and a shop's — its own sign-in in two steps, its own session, and a record of
 * everything done behind it. Nothing here ever carries anyone's password, session or sealed secret.
 */

/** Step one: the administrator's own bee-link account. */
export interface BackofficeSignInPayload {
  email: string;
  password: string;
}

/**
 * Answered by step one once the password is an administrator's: a code was e-mailed, and this token
 * is what step two presents with it. Opaque, single use, and worth nothing without the code.
 */
export interface BackofficeSignInChallenge {
  challengeToken: string;
  /** ISO-8601 — the code is refused after this instant. */
  expiresAt: string;
}

/** Step two: the token step one answered and the code from the e-mail. */
export interface BackofficeVerifyPayload {
  challengeToken: string;
  /** Six digits. */
  code: string;
}

/** Who an administrator is, as the backoffice shows them. */
export interface BackofficeAdminIdentity {
  id: string;
  name: string;
  email: string;
}

/**
 * Answered by step two and by refresh. The web keeps both tokens in httpOnly cookies of the
 * backoffice's own — neither is the panel's, and neither opens the panel.
 */
export interface BackofficeSession {
  accessToken: string;
  /** ISO-8601. */
  accessTokenExpiresAt: string;
  /** Single use: refreshing returns a new one, and presenting a spent one ends the session. */
  refreshToken: string;
  /** ISO-8601 — the session left idle past this instant is over. */
  refreshTokenExpiresAt: string;
  /** ISO-8601 — the session ends here whatever its use; past it, sign in again. */
  sessionExpiresAt: string;
  admin: BackofficeAdminIdentity;
}

export interface BackofficeRefreshPayload {
  refreshToken: string;
}

/** The signed-in administrator and how long their session has left. */
export interface BackofficeMe {
  admin: BackofficeAdminIdentity;
  session: {
    /** ISO-8601. */
    startedAt: string;
    /** ISO-8601 — the end whatever its use. */
    expiresAt: string;
    /** ISO-8601 — the end if nothing else is asked until then. */
    idleExpiresAt: string;
  };
}

/** One platform administrator, as the list of them shows. */
export interface BackofficeAdmin {
  userId: string;
  name: string;
  email: string;
  /** ISO-8601. */
  grantedAt: string;
  /** Null when the role came from the command that creates the first administrator. */
  grantedBy: BackofficeAdminIdentity | null;
}

/** The e-mail of an existing, verified bee-link account. */
export interface GrantBackofficeAdminPayload {
  email: string;
}

/**
 * What the audit record can say was done: `SUBJECT_VERB-IN-THE-PAST`. A closed union — a ticket that
 * adds a backoffice write adds its code here.
 */
export type BackofficeAuditAction =
  | "ADMIN_GRANTED"
  | "ADMIN_REVOKED"
  | "BACKOFFICE_SIGN_IN_CODE_SENT"
  | "BACKOFFICE_SIGN_IN_FAILED"
  | "BACKOFFICE_SIGNED_IN"
  | "BACKOFFICE_SIGNED_OUT";

/** `COMMAND` is the server-side command; `ANONYMOUS` is a sign-in that was refused. */
export type BackofficeAuditActorKind = "ADMIN" | "COMMAND" | "ANONYMOUS";

/** What an action was done on. A ticket that acts on something new adds its type here. */
export type BackofficeAuditTargetType = "USER";

/** A detail is flat and small, and never a secret, a password, a token or a code. */
export type BackofficeAuditDetails = Record<string, string | number | boolean | null>;

/** One line of the audit record: who, what, on what, when and from where. Never edited, never removed. */
export interface BackofficeAuditEntry {
  id: string;
  actor: {
    kind: BackofficeAuditActorKind;
    /** The administrator's account; null for the command and for a refused sign-in. */
    userId: string | null;
    /** The administrator's e-mail as it was then. */
    label: string | null;
  };
  action: BackofficeAuditAction;
  target: {
    type: BackofficeAuditTargetType;
    id: string;
    /** What a person would call it: an e-mail, a shop's slug. */
    label: string | null;
  } | null;
  details: BackofficeAuditDetails;
  /** The client's address as the API saw it. */
  ip: string | null;
  userAgent: string | null;
  /** ISO-8601. */
  createdAt: string;
}

/** One page of the audit record, newest first. Echoes the bounds that were used, not the ones asked. */
export interface BackofficeAuditPage {
  entries: BackofficeAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BackofficeAuditQuery {
  /** An administrator's account id. */
  actorId?: string;
  actorKind?: BackofficeAuditActorKind;
  action?: BackofficeAuditAction;
  /** ISO-8601, inclusive. */
  from?: string;
  /** ISO-8601, exclusive. */
  to?: string;
  page?: number;
  pageSize?: number;
}

/** The `errorCode` values the backoffice answers, beyond the HTTP-status fallbacks. */
export type BackofficeErrorCode =
  /** Step one refused — a wrong password, an unknown e-mail and an account that is no administrator read the same. */
  | "BACKOFFICE_INVALID_CREDENTIALS"
  /** Step two refused — wrong, expired, spent and out of attempts read the same. */
  | "BACKOFFICE_CODE_INVALID"
  /** No backoffice session behind the request: no token, another door's token, a session over, a role revoked. */
  | "BACKOFFICE_UNAUTHENTICATED"
  | "BACKOFFICE_SESSION_INVALID"
  | "BACKOFFICE_REFRESH_REUSED"
  | "BACKOFFICE_USER_NOT_FOUND"
  | "BACKOFFICE_USER_NOT_VERIFIED"
  | "BACKOFFICE_ADMIN_ALREADY"
  | "BACKOFFICE_ADMIN_NOT_FOUND"
  /** Revoking would leave the platform with no administrator. */
  | "BACKOFFICE_LAST_ADMIN"
  /** A backoffice write that declares no audit action — a bug, answered 500 before anything is done. */
  | "BACKOFFICE_AUDIT_MISSING"
  | "RATE_LIMITED";
