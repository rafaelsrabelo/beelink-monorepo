-- AlterEnum
-- A new kind and its two layouts, added and not used: Postgres will not let one transaction use an
-- enum value it just added.
ALTER TYPE "ComponentKind" ADD VALUE 'IMAGE_TEXT';
ALTER TYPE "ComponentDisplay" ADD VALUE 'IMAGE_LEFT';
ALTER TYPE "ComponentDisplay" ADD VALUE 'IMAGE_RIGHT';
