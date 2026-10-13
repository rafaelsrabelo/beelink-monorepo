-- What bee-link sells a page (BEELINK-219): the rows `GET /api/billing/plans` answers with, and the
-- ones a page's subscription points at once its shopkeeper chooses.
--
-- THIS FILE OWNS THE NAME, THE SWITCH AND THE PRICES. It runs on every deploy and overwrites all of
-- them on the row it finds by `slug`, so a price or an `active` changed by hand in the database is
-- put back by the next deploy. To change what a plan costs, or to start selling one, change it here.
--
-- A price is whole cents for the WHOLE cycle, which is what Asaas is asked to charge: 32340 is six
-- months at R$ 53,90, and 57480 a year at R$ 47,90. NULL is a cycle the plan is not sold in.
--
-- A price changed here does not reach a subscription already made at Asaas, which goes on charging
-- the value it was made with — the one `store_subscriptions.priceCents` keeps. Raising what a paying
-- page pays is a decision of its own, and not something editing this file does.
--
-- THE LANDING HOLDS A SECOND COPY of these amounts, in apps/web/src/lib/plans.ts, until the web reads
-- them from the API (BEELINK-293). Until then the two files change together, by hand.
--
-- Never destructive: a slug taken out of this file stays in the database, where a page may point at
-- it. A plan no longer sold is switched off here, not removed.
--
-- One statement, on purpose: the e2e suite runs this very file through the Prisma client, which
-- takes one statement a call.
--
-- `uuidv7()` is a Postgres 18 built-in; see store-categories.sql for why the row brings its own id.

INSERT INTO "plans" ("id", "slug", "name", "active", "monthlyPriceCents", "semiannualPriceCents", "annualPriceCents", "createdAt", "updatedAt")
VALUES
  (uuidv7(), 'beelink', 'Beelink', true, 5990, 32340, 57480, now(), now()),
  -- Registered and switched off until Beelia exists.
  (uuidv7(), 'beelink-beelia', 'Beelink + Beelia', false, 8990, NULL, NULL, now(), now())
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "active" = EXCLUDED."active",
  "monthlyPriceCents" = EXCLUDED."monthlyPriceCents",
  "semiannualPriceCents" = EXCLUDED."semiannualPriceCents",
  "annualPriceCents" = EXCLUDED."annualPriceCents",
  "updatedAt" = now()
-- Only a row this file would really change is written, so `updatedAt` says when a plan last changed
-- and not when the last deploy was.
WHERE ("plans"."name", "plans"."active", "plans"."monthlyPriceCents", "plans"."semiannualPriceCents", "plans"."annualPriceCents")
  IS DISTINCT FROM (EXCLUDED."name", EXCLUDED."active", EXCLUDED."monthlyPriceCents", EXCLUDED."semiannualPriceCents", EXCLUDED."annualPriceCents");
