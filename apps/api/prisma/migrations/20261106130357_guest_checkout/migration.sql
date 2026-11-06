-- P0, 2026-11-06 (plan 2026-11-06--P0-checkout-sem-codigo): a visitor buys with no code and no account.
-- "purchase_sessions" holds what a visitor typed at the checkout and the shop's record their order goes on;
-- "orders.contactEmail" keeps the e-mail they typed. The checkout's six-digit codes go: "sign_in_codes" is
-- dropped, and what it held — codes of ten minutes, spent or expired — is nothing anyone can still use.
-- DropForeignKey
ALTER TABLE "sign_in_codes" DROP CONSTRAINT "sign_in_codes_userId_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "contactEmail" TEXT;

-- DropTable
DROP TABLE "sign_in_codes";

-- CreateTable
CREATE TABLE "purchase_sessions" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_sessions_customerId_idx" ON "purchase_sessions"("customerId");

-- CreateIndex
CREATE INDEX "purchase_sessions_storeId_expiresAt_idx" ON "purchase_sessions"("storeId", "expiresAt");

-- AddForeignKey
ALTER TABLE "purchase_sessions" ADD CONSTRAINT "purchase_sessions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_sessions" ADD CONSTRAINT "purchase_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
