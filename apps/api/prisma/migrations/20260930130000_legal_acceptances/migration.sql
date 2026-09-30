-- Each time an account accepted bee-link's terms of use and read its privacy policy, with the version
-- of the texts in force (BEELINK-171). Accounts from before the terms have none, and are not asked.

-- CreateEnum
CREATE TYPE "LegalAcceptanceChannel" AS ENUM ('SIGN_UP', 'GOOGLE', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "via" "LegalAcceptanceChannel" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_acceptances_userId_idx" ON "legal_acceptances"("userId");

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

