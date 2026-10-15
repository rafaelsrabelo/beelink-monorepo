-- BEELINK-297: the e-mail that tells a shopkeeper the day charging starts, seven days or more before
-- it — one per account, ever, by the unique index on "userId". Its outbox: rows written by the command
-- `charging-notice.js send` and sent by the API, claimed and retried as every outbox is.

-- CreateTable
CREATE TABLE "charging_notices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "switchOnDay" DATE NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charging_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charging_notices_userId_key" ON "charging_notices"("userId");

-- CreateIndex
CREATE INDEX "charging_notices_owed_idx" ON "charging_notices"("nextAttemptAt") WHERE ("sentAt" IS NULL) AND (attempts < 5);

-- AddForeignKey
ALTER TABLE "charging_notices" ADD CONSTRAINT "charging_notices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
