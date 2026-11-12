-- IMPULSEIA-103 (plan 2026-11-11--IMPULSEIA-103--convite-de-afiliados): a shop's affiliates and
-- their invites.
-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('INVITED', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "userId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20),
    "note" VARCHAR(500),
    "slug" VARCHAR(40),
    "status" "AffiliateStatus" NOT NULL DEFAULT 'INVITED',
    "tableId" UUID NOT NULL,
    "pixKey" VARCHAR(140),
    "photoUrl" TEXT,
    "tagline" VARCHAR(100),
    "termsVersion" INTEGER,
    "termsAcceptedAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_invites" (
    "affiliateId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "affiliate_invites_pkey" PRIMARY KEY ("affiliateId")
);

-- CreateIndex
CREATE INDEX "affiliates_storeId_status_invitedAt_idx" ON "affiliates"("storeId", "status", "invitedAt");

-- CreateIndex
CREATE INDEX "affiliates_tableId_idx" ON "affiliates"("tableId");

-- CreateIndex
CREATE INDEX "affiliates_userId_idx" ON "affiliates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_storeId_slug_key" ON "affiliates"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_live_email_key" ON "affiliates"("storeId", "email") WHERE (status <> 'ENDED'::"AffiliateStatus");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_live_user_key" ON "affiliates"("storeId", "userId") WHERE (status <> 'ENDED'::"AffiliateStatus") AND ("userId" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_invites_tokenHash_key" ON "affiliate_invites"("tokenHash");

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "commission_tables"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_invites" ADD CONSTRAINT "affiliate_invites_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- What the API keeps true, held where a write that skipped it would land: an affiliate has a `/name`
-- and an acceptance exactly when they are past the invite, and an end exactly when they ended.
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_accepted_check" CHECK ((("status" = 'INVITED') = ("slug" IS NULL)) AND (("status" = 'INVITED') = ("acceptedAt" IS NULL)));
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_ended_check" CHECK (("status" = 'ENDED') = ("endedAt" IS NOT NULL));
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_terms_version_check" CHECK ("termsVersion" IS NULL OR "termsVersion" >= 0);
