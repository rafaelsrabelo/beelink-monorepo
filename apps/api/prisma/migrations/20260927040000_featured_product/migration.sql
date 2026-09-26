-- AlterEnum
-- A new kind and its one new layout (it shares IMAGE_LEFT with an image with text), added and not
-- used: Postgres will not let one transaction use an enum value it just added.
ALTER TYPE "ComponentKind" ADD VALUE 'FEATURED_PRODUCT';
ALTER TYPE "ComponentDisplay" ADD VALUE 'IMAGE_LARGE';
