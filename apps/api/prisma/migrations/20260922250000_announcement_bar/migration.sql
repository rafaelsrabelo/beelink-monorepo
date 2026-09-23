-- The strip above the header becomes a block the shopkeeper writes.
--
-- Added and deliberately not used: Postgres refuses to USE an enum value in the transaction that
-- added it, and no existing shop should grow a strip it never asked for. A shop gets one the day
-- its owner adds one.
ALTER TYPE "SectionKind" ADD VALUE 'ANNOUNCEMENT';
