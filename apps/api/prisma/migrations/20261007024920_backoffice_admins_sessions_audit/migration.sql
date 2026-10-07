-- CreateEnum
CREATE TYPE "BackofficeSecondStep" AS ENUM ('EMAIL_CODE');

-- CreateEnum
CREATE TYPE "BackofficeActorKind" AS ENUM ('ADMIN', 'COMMAND', 'ANONYMOUS');

-- CreateTable
CREATE TABLE "platform_admins" (
    "userId" UUID NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByUserId" UUID,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" UUID,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "backoffice_sign_in_challenges" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_sign_in_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backoffice_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "secondStep" "BackofficeSecondStep" NOT NULL,
    "secondStepAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "backoffice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backoffice_refresh_tokens" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backoffice_audit_log" (
    "id" UUID NOT NULL,
    "actorKind" "BackofficeActorKind" NOT NULL,
    "actorUserId" UUID,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backoffice_sign_in_challenges_tokenHash_key" ON "backoffice_sign_in_challenges"("tokenHash");

-- CreateIndex
CREATE INDEX "backoffice_sign_in_challenges_userId_createdAt_idx" ON "backoffice_sign_in_challenges"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "backoffice_sessions_userId_idx" ON "backoffice_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "backoffice_refresh_tokens_tokenHash_key" ON "backoffice_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "backoffice_refresh_tokens_sessionId_idx" ON "backoffice_refresh_tokens"("sessionId");

-- CreateIndex
CREATE INDEX "backoffice_audit_log_createdAt_idx" ON "backoffice_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "backoffice_audit_log_actorUserId_createdAt_idx" ON "backoffice_audit_log"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "backoffice_audit_log_action_createdAt_idx" ON "backoffice_audit_log"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backoffice_sign_in_challenges" ADD CONSTRAINT "backoffice_sign_in_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backoffice_sessions" ADD CONSTRAINT "backoffice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backoffice_refresh_tokens" ADD CONSTRAINT "backoffice_refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "backoffice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The audit record is append-only, whoever holds the connection: a row is never changed and never
-- removed. (TRUNCATE is the table owner's, and is what the e2e reset uses on a *_test database.)
CREATE FUNCTION "backoffice_audit_log_is_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'backoffice_audit_log is append-only: % is refused', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "backoffice_audit_log_append_only"
  BEFORE UPDATE OR DELETE ON "backoffice_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "backoffice_audit_log_is_append_only"();
