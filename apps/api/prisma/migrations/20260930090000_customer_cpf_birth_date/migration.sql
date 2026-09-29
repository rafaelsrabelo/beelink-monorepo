-- The shopper's CPF and birth date (BEELINK-147): both optional, both given by the shopper for the
-- shop's invoice. The CPF keeps its eleven digits; the birth date is a day, with no time.
-- Hand-written from `prisma migrate diff`.

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "cpf" CHAR(11);
