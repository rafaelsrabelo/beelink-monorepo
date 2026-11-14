-- CreateEnum
CREATE TYPE "AffiliateApprovalMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "AffiliateApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REFUSED');

-- CreateTable
CREATE TABLE "affiliate_pages" (
    "storeId" UUID NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT false,
    "homeBanner" BOOLEAN NOT NULL DEFAULT true,
    "footerLink" BOOLEAN NOT NULL DEFAULT true,
    "topStrip" BOOLEAN NOT NULL DEFAULT false,
    "tableId" UUID,
    "approval" "AffiliateApprovalMode" NOT NULL DEFAULT 'MANUAL',
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_pages_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "affiliate_applications" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "extraQuestion" VARCHAR(80),
    "extraAnswer" VARCHAR(200),
    "status" "AffiliateApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "affiliateId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_pages_tableId_idx" ON "affiliate_pages"("tableId");

-- CreateIndex
CREATE INDEX "affiliate_applications_storeId_status_createdAt_idx" ON "affiliate_applications"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "affiliate_applications_decidedAt_idx" ON "affiliate_applications"("decidedAt");

-- CreateIndex
CREATE INDEX "affiliate_applications_affiliateId_idx" ON "affiliate_applications"("affiliateId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_applications_pending_email_key" ON "affiliate_applications"("storeId", "email") WHERE (status = 'PENDING'::"AffiliateApplicationStatus");

-- AddForeignKey
ALTER TABLE "affiliate_pages" ADD CONSTRAINT "affiliate_pages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_pages" ADD CONSTRAINT "affiliate_pages_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "commission_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
