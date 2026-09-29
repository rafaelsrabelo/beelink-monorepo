-- The customer's conversation with the shop about an order (BEELINK-160): one per order, opened by the
-- customer's first message. Whether it takes messages is the order's status, never a column.


-- CreateEnum
CREATE TYPE "ConversationAuthor" AS ENUM ('CUSTOMER', 'SHOP');

-- CreateTable
CREATE TABLE "order_conversations" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "author" "ConversationAuthor" NOT NULL,
    "userId" UUID,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "order_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_conversations_orderId_key" ON "order_conversations"("orderId");

-- CreateIndex
CREATE INDEX "order_conversations_lastMessageAt_idx" ON "order_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "order_messages_conversationId_createdAt_idx" ON "order_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "order_messages_conversationId_author_readAt_idx" ON "order_messages"("conversationId", "author", "readAt");

-- AddForeignKey
ALTER TABLE "order_conversations" ADD CONSTRAINT "order_conversations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "order_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

