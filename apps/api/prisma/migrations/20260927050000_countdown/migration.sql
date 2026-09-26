-- AlterEnum
-- A new kind and its one new layout (it shares BAND with a call to action), added and not used:
-- Postgres will not let one transaction use an enum value it just added.
ALTER TYPE "ComponentKind" ADD VALUE 'COUNTDOWN';
ALTER TYPE "ComponentDisplay" ADD VALUE 'BLOCK';
