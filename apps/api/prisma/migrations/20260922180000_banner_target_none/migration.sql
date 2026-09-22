-- A banner that goes nowhere.
--
-- Alone in its own migration, and that is Postgres's rule rather than a preference: a value added
-- to an enum cannot be USED in the transaction that added it, and Prisma runs one migration per
-- transaction. The CHECK that names 'NONE' therefore has to wait for the next file.
ALTER TYPE "BannerTarget" ADD VALUE IF NOT EXISTS 'NONE';
