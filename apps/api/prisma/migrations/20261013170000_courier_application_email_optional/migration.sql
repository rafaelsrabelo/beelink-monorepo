-- BEELINK-328: the landing's first step no longer asks for an e-mail, so an application may be kept
-- without one. Nothing kept changes: every row there has its address.

-- AlterTable
ALTER TABLE "courier_applications" ALTER COLUMN "email" DROP NOT NULL;
