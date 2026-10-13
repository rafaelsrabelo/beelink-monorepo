-- BEELINK-291: who bee-link charges for an account's pages — the name and the CPF or CNPJ its Asaas
-- customer is made with — and the two marks of the talk with Asaas about that customer.
--
-- `name` and `document` are added NOT NULL with no default on purpose. BEELINK-219 created the table
-- and wrote no row, and nothing has written one since: on a table with rows this statement fails,
-- which is the right answer — an account with no name and no document cannot be charged.

-- AlterTable
ALTER TABLE "billing_accounts" ADD COLUMN     "asaasCustomerClaimedUntil" TIMESTAMP(3),
ADD COLUMN     "asaasCustomerSyncedAt" TIMESTAMP(3),
ADD COLUMN     "document" VARCHAR(14) NOT NULL,
ADD COLUMN     "name" VARCHAR(120) NOT NULL;

-- A CPF's eleven digits, or a CNPJ's fourteen places — its first twelve may hold capital letters
-- since July 2026. The shape only: the check digits are verified by the API before a row is written.
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_document_check" CHECK ("document" ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$');

-- A name is kept trimmed, and is never blank.
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_name_check" CHECK ("name" = btrim("name") AND char_length("name") >= 2);
