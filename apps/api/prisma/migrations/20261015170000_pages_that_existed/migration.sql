-- BEELINK-297: every page that existed on 13/10/2026 — created before that day was over in Brasília,
-- 2026-10-14 03:00 UTC — is given one free month counted from that day: free until 13/11/2026 is over
-- in Brasília, 2026-11-14 03:00 UTC (`freeMonthEndOf('2026-10-13')`), whatever the day charging is
-- switched on. Both instants are `PAGES_EXISTED_ON` of billing.constants.ts, written here as literals.
--
-- Data only, and safe to run again by hand: the second time it finds nothing to create and nothing
-- earlier to move, and writes no row. Never a coupon's use: these pages may still use a coupon, whose
-- month begins once this one ends. The columns hold UTC wall time, as the API writes them.

-- 1. A page with no subscription is given the one any page is born with (`openTrial`): in trial,
--    counted from its creation to the midnight in Brasília closing the seventh day after the day it
--    was created (`trialEndOf`). A page from before subscriptions existed has none; so does one a
--    deployment still running the code from before them created later — that one is a page of after
--    13/10, and is given no month. A page with no row never locks: none is left without one.
INSERT INTO "store_subscriptions" ("id", "storeId", "status", "trialStartedAt", "trialEndsAt", "freePeriodEndsAt", "createdAt", "updatedAt")
SELECT
  uuidv7(),
  s."id",
  'TRIALING'::"SubscriptionStatus",
  s."createdAt",
  ((s."createdAt" - INTERVAL '3 hours')::date + 8)::timestamp + INTERVAL '3 hours',
  CASE WHEN s."createdAt" < TIMESTAMP '2026-10-14 03:00:00' THEN TIMESTAMP '2026-11-14 03:00:00' END,
  timezone('UTC', now()),
  timezone('UTC', now())
FROM "stores" AS s
WHERE NOT EXISTS (SELECT 1 FROM "store_subscriptions" AS sub WHERE sub."storeId" = s."id")
ON CONFLICT ("storeId") DO NOTHING;

-- 2. A page of 13/10 that had its row and never paid is given the month, never shortening a later
--    end a coupon gave. Left alone: an exempt page, which owes nothing, and one that paid — its
--    subscription at Asaas goes on charging, so a month would not be free (a coupon's own rule).
UPDATE "store_subscriptions" AS sub
SET "freePeriodEndsAt" = GREATEST(sub."freePeriodEndsAt", TIMESTAMP '2026-11-14 03:00:00'),
    "updatedAt" = timezone('UTC', now())
FROM "stores" AS s
WHERE sub."storeId" = s."id"
  AND s."createdAt" < TIMESTAMP '2026-10-14 03:00:00'
  AND sub."status" IN ('TRIALING', 'TRIAL_EXPIRED')
  AND (sub."freePeriodEndsAt" IS NULL OR sub."freePeriodEndsAt" < TIMESTAMP '2026-11-14 03:00:00');
