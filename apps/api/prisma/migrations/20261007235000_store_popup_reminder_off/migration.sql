-- The strip's reminder is off unless a shopkeeper asks for it (BEELINK-311). The switch shipped on
-- by default hours before: no row holds a choice that can be told from that default, so every one
-- is switched off, and whoever wants the reminder switches it back on.
-- AlterTable
ALTER TABLE "store_popups" ALTER COLUMN "keepReminder" SET DEFAULT false;

UPDATE "store_popups" SET "keepReminder" = false WHERE "keepReminder";
