-- A WhatsApp the shop knows goes on with a purchase session (2026-11-06, plan
-- 2026-11-06--whatsapp-primeiro): the order carries the session's id, and that session reads the orders
-- that carry it and no other. Nothing existing is touched: every order there is stays null.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "purchaseSessionId" UUID;

-- CreateIndex
CREATE INDEX "orders_customerId_purchaseSessionId_idx" ON "orders"("customerId", "purchaseSessionId");
