-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('GOOGLE');

-- CreateTable
CREATE TABLE "account_identities" (
    "id" UUID NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "storeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "storeId" UUID NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "account_identities_userId_idx" ON "account_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_identities_storeId_provider_subject_key" ON "account_identities"("storeId", "provider", "subject");

-- CreateIndex
CREATE INDEX "oauth_states_expiresAt_idx" ON "oauth_states"("expiresAt");

-- AddForeignKey
ALTER TABLE "account_identities" ADD CONSTRAINT "account_identities_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_identities" ADD CONSTRAINT "account_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

