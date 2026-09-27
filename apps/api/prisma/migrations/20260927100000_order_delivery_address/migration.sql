-- Where a delivery goes, photographed when the order is placed (BEELINK-140). Orders placed before
-- this stay null: today's address of their customer is not where they went.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryComplement" TEXT,
ADD COLUMN     "deliveryName" TEXT,
ADD COLUMN     "deliveryNeighborhood" TEXT,
ADD COLUMN     "deliveryNumber" TEXT,
ADD COLUMN     "deliveryState" TEXT,
ADD COLUMN     "deliveryStreet" TEXT,
ADD COLUMN     "deliveryZipCode" TEXT;
