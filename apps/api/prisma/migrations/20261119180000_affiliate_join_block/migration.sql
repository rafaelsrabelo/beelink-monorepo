-- AlterEnum
-- The "Programa de afiliados" block (plan 2026-11-19), added and not used: Postgres will not let one
-- transaction use an enum value it just added.
ALTER TYPE "ComponentKind" ADD VALUE 'AFFILIATE_JOIN';

-- AlterTable
-- The banner the home drew by itself is a block of design mode now. No shop's page is changed: the one
-- shop that drew it wanted it gone (the owner's call, 19/11/2026).
ALTER TABLE "affiliate_pages" DROP COLUMN "homeBanner";
