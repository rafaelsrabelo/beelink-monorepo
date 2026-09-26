-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "totalSpentCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "variantLabel" SET DATA TYPE VARCHAR(320);


-- A customer's phone, written the way a WhatsApp link wants it — the key an order finds them by, so
-- "(11) 98888-7777", "+55 11 98888-7777" and "(011) 98888-7777" are one customer. The same rule as
-- `normaliseWhatsapp`: drop a long-distance 0 and carrier code, and prepend 55 to 10 or 11 digits.
-- A phone another customer of the shop already has in that form stays as it was.
WITH "canonical" AS (
  SELECT "id", "storeId",
    CASE WHEN length("stripped") IN (10, 11) THEN '55' || "stripped" ELSE "stripped" END AS "phone"
  FROM (
    SELECT "id", "storeId", regexp_replace("phone", '^0(\d{2})?(?=\d{10,11}$)', '') AS "stripped"
    FROM "customers"
    WHERE "phone" IS NOT NULL
  ) AS "digits"
)
UPDATE "customers" AS c
SET "phone" = "canonical"."phone"
FROM "canonical"
WHERE c."id" = "canonical"."id"
  AND c."phone" <> "canonical"."phone"
  AND NOT EXISTS (
    SELECT 1 FROM "customers" AS o WHERE o."storeId" = "canonical"."storeId" AND o."phone" = "canonical"."phone"
  );
