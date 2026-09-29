-- An order's moves told in its conversation (BEELINK-236): a notice is a message with no author but the
-- product, carrying the status it tells of and no text — each side words it for its own reader.

-- AlterEnum
ALTER TYPE "ConversationAuthor" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "order_messages" ADD COLUMN "status" "OrderStatus";

-- A notice has a status and a message has none. Compared as text: a value added to an enum cannot be
-- named as that enum inside the transaction that added it.
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_status_notice_check"
  CHECK (("author"::text = 'SYSTEM') = ("status" IS NOT NULL));
