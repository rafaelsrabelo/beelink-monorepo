-- CreateEnum
CREATE TYPE "IntegrationAccountApproval" AS ENUM ('PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "store_integrations" ADD COLUMN     "accountApproval" "IntegrationAccountApproval",
ADD COLUMN     "accountApprovalCheckedAt" TIMESTAMP(3);
