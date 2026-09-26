-- AlterEnum
-- A new kind and its two layouts, added and not used: Postgres will not let one transaction use an
-- enum value it just added.
ALTER TYPE "ComponentKind" ADD VALUE 'CALL_TO_ACTION';
ALTER TYPE "ComponentDisplay" ADD VALUE 'BAND';
ALTER TYPE "ComponentDisplay" ADD VALUE 'CARD';
