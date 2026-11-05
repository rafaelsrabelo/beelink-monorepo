-- A shop's checkout opens the account with a name, an e-mail and a WhatsApp (2026-11-05, plan
-- 2026-11-05--compra-sem-cadastro). "CHECKOUT" is where that account took bee-link's terms;
-- "sign_in_codes" holds the six-digit codes e-mailed to an account the checkout found by its
-- e-mail. Nothing existing is touched: the table starts empty and no acceptance changes channel.

-- AlterEnum
ALTER TYPE "LegalAcceptanceChannel" ADD VALUE 'CHECKOUT';

-- CreateTable
CREATE TABLE "sign_in_codes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_in_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sign_in_codes_userId_createdAt_idx" ON "sign_in_codes"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "sign_in_codes" ADD CONSTRAINT "sign_in_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
