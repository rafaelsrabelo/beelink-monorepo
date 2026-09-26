-- AlterEnum
-- A new kind and its layout, added and not used: Postgres will not let one transaction use an enum
-- value it just added.
ALTER TYPE "ComponentKind" ADD VALUE 'FAQ';
ALTER TYPE "ComponentDisplay" ADD VALUE 'ACCORDION';
