-- BEELINK-326: the e-mail a person who asked to deliver is owed — the application arrived, and the
-- way to go on with it comes later — and one owed to every address already on the list.

-- CreateTable
CREATE TABLE "courier_application_notices" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_application_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courier_application_notices_applicationId_key" ON "courier_application_notices"("applicationId");

-- CreateIndex
CREATE INDEX "courier_application_notices_owed_idx" ON "courier_application_notices"("nextAttemptAt") WHERE ("sentAt" IS NULL) AND (attempts < 5);

-- AddForeignKey
ALTER TABLE "courier_application_notices" ADD CONSTRAINT "courier_application_notices_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "courier_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Whoever was on the list already is owed the e-mail too, once an address. Rows from before a
-- person could be on the list only once (BEELINK-325) may repeat an e-mail: of those, the oldest
-- application is the one told, and it is its first name the e-mail greets.
INSERT INTO "courier_application_notices" ("id", "applicationId")
SELECT uuidv7(), "first"."id"
FROM (
  SELECT DISTINCT ON ("email") "id"
  FROM "courier_applications"
  ORDER BY "email", "createdAt", "id"
) AS "first";
