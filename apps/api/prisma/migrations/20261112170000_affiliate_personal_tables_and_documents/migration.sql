-- The user's review of 12/11/2026 (plan 2026-11-12--IMPULSEIA-100--comissao-no-convite): an
-- affiliate's own commission table, made on the invite, and the identity document they are
-- registered with — its photos kept privately at Cloudinary, and the uploads waiting to be named.

-- CreateEnum
CREATE TYPE "AffiliateDocumentType" AS ENUM ('RG', 'CNH', 'CIN', 'RNE_CRNM', 'PASSPORT');

-- AlterTable
ALTER TABLE "commission_tables" ADD COLUMN     "affiliateId" UUID;

-- CreateTable
CREATE TABLE "affiliate_documents" (
    "affiliateId" UUID NOT NULL,
    "type" "AffiliateDocumentType" NOT NULL,
    "frontPublicId" VARCHAR(255) NOT NULL,
    "frontFormat" VARCHAR(10) NOT NULL,
    "backPublicId" VARCHAR(255),
    "backFormat" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_documents_pkey" PRIMARY KEY ("affiliateId")
);

-- CreateTable
CREATE TABLE "affiliate_document_uploads" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "format" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_document_uploads_publicId_key" ON "affiliate_document_uploads"("publicId");

-- CreateIndex
CREATE INDEX "affiliate_document_uploads_createdAt_idx" ON "affiliate_document_uploads"("createdAt");

-- CreateIndex
CREATE INDEX "affiliate_document_uploads_storeId_idx" ON "affiliate_document_uploads"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_tables_affiliateId_key" ON "commission_tables"("affiliateId");

-- AddForeignKey
ALTER TABLE "commission_tables" ADD CONSTRAINT "commission_tables_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_documents" ADD CONSTRAINT "affiliate_documents_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_document_uploads" ADD CONSTRAINT "affiliate_document_uploads_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- An own table is an affiliate's; the default one is the shop's, and never anybody's own.
ALTER TABLE "commission_tables" ADD CONSTRAINT "commission_tables_default_not_personal_check" CHECK (NOT ("isDefault" AND "affiliateId" IS NOT NULL));
-- A passport has no back to keep; every other document has one, and the API asks for it.
ALTER TABLE "affiliate_documents" ADD CONSTRAINT "affiliate_documents_back_check" CHECK (("backPublicId" IS NULL) = ("backFormat" IS NULL));
