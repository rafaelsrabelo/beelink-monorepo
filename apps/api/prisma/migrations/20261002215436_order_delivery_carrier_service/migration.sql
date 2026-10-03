-- BEELINK-186: the carrier service a customer chose at checkout, kept for its label.

-- AlterTable
ALTER TABLE "order_deliveries" ADD COLUMN     "carrierServiceId" INTEGER;
