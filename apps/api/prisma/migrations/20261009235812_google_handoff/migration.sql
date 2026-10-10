-- AlterTable
ALTER TABLE "oauth_states" ADD COLUMN     "handoffChallenge" CHAR(43);

-- CreateTable
CREATE TABLE "google_handoffs" (
    "codeHash" CHAR(64) NOT NULL,
    "challenge" CHAR(43) NOT NULL,
    "storeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_handoffs_pkey" PRIMARY KEY ("codeHash")
);

-- CreateIndex
CREATE INDEX "google_handoffs_expiresAt_idx" ON "google_handoffs"("expiresAt");
