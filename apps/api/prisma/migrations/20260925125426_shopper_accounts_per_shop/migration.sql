-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "storeId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_storeId_email_key" ON "users"("storeId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email") WHERE ("storeId" IS NULL);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every shopper who had an account gets one at each shop they are a customer of — the same name,
-- e-mail, password and verification, now belonging to that shop — and the shop's record follows it.
-- The old accounts stay: one with no shop may as well be a shopkeeper who has not opened theirs yet.
WITH "copied" AS (
  INSERT INTO "users" ("id", "name", "email", "passwordHash", "emailVerifiedAt", "storeId", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), u."name", u."email", u."passwordHash", u."emailVerifiedAt", c."storeId", c."createdAt", CURRENT_TIMESTAMP
  FROM "customers" c
  JOIN "users" u ON u."id" = c."userId"
  RETURNING "id", "storeId", "email"
)
UPDATE "customers" c
SET "userId" = "copied"."id"
FROM "copied", "users" u
WHERE u."id" = c."userId" AND u."storeId" IS NULL AND "copied"."storeId" = c."storeId" AND "copied"."email" = u."email";

-- Those sessions were opened with the old accounts: a shopper signs in again, once at each shop.
UPDATE "sessions" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "audience" = 'CUSTOMER' AND "revokedAt" IS NULL;
