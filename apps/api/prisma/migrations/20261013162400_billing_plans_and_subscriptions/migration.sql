-- BEELINK-219: what a page owes bee-link — the plans, the shopkeeper's account as bee-link charges
-- it, and one subscription per store. No row is written here: the plans come from the seed, a new
-- store's subscription from the write that creates the store, and the stores that already exist are
-- given theirs later (BEELINK-297).

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'TRIAL_EXPIRED', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXEMPT');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPriceCents" INTEGER NOT NULL,
    "semiannualPriceCents" INTEGER,
    "annualPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "userId" UUID NOT NULL,
    "asaasCustomerId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "store_subscriptions" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialStartedAt" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "planId" UUID,
    "cycle" "BillingCycle",
    "priceCents" INTEGER,
    "currentPeriodEndsAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "freePeriodEndsAt" TIMESTAMP(3),
    "asaasSubscriptionId" VARCHAR(64),
    "firstDueDate" DATE,
    "paymentMethod" "SubscriptionPaymentMethod",
    "invoiceUrl" VARCHAR(500),
    "cardBrand" VARCHAR(20),
    "cardLast4" CHAR(4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_asaasCustomerId_key" ON "billing_accounts"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "store_subscriptions_storeId_key" ON "store_subscriptions"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_subscriptions_asaasSubscriptionId_key" ON "store_subscriptions"("asaasSubscriptionId");

-- CreateIndex
CREATE INDEX "store_subscriptions_planId_idx" ON "store_subscriptions"("planId");

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A price is money owed: never nothing, never negative. A cycle a plan is not sold in is null.
ALTER TABLE "plans" ADD CONSTRAINT "plans_prices_check" CHECK (
  "monthlyPriceCents" > 0
  AND ("semiannualPriceCents" IS NULL OR "semiannualPriceCents" > 0)
  AND ("annualPriceCents" IS NULL OR "annualPriceCents" > 0)
);

-- A trial has a length.
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_trial_check" CHECK ("trialEndsAt" > "trialStartedAt");

-- The plan, its cycle and what it costs this page are chosen together: the three, or none.
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_choice_check" CHECK (
  ("planId" IS NULL AND "cycle" IS NULL AND "priceCents" IS NULL)
  OR ("planId" IS NOT NULL AND "cycle" IS NOT NULL AND "priceCents" IS NOT NULL AND "priceCents" > 0)
);

-- Of a card, its brand and its last four digits, the two together — and four digits is all the
-- column can hold: a card's number does not fit it.
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_card_check" CHECK (
  ("cardBrand" IS NULL AND "cardLast4" IS NULL)
  OR ("cardBrand" IS NOT NULL AND "cardLast4" IS NOT NULL AND "cardLast4" ~ '^[0-9]{4}$')
);
