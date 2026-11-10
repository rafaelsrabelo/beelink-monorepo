-- An order paid online is sent to the shop's WhatsApp by the customer once paid, for a shop that
-- prepares the order from that conversation. Off for every shop until it switches it on.

-- AlterTable
ALTER TABLE "asaas_settings" ADD COLUMN "whatsappWhenPaid" BOOLEAN NOT NULL DEFAULT false;
