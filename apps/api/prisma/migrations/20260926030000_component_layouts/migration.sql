-- AlterEnum
-- New layouts only: a row saved before them keeps its value, or its null, and draws as it did.
ALTER TYPE "ComponentDisplay" ADD VALUE 'BACKDROP';
ALTER TYPE "ComponentDisplay" ADD VALUE 'SPLIT';
ALTER TYPE "ComponentDisplay" ADD VALUE 'CHIPS';
ALTER TYPE "ComponentDisplay" ADD VALUE 'INLINE';
ALTER TYPE "ComponentDisplay" ADD VALUE 'CARDS';
ALTER TYPE "ComponentDisplay" ADD VALUE 'STATIC';
ALTER TYPE "ComponentDisplay" ADD VALUE 'MARQUEE';
