-- Add Hub.slug — the URL-safe value behind `?hub=` (api-contract.md). Written by hand rather
-- than generated, because a required column on a non-empty table needs a backfill step:
-- add nullable -> derive from name -> enforce NOT NULL -> add the unique index.

-- AlterTable
ALTER TABLE "hubs" ADD COLUMN "slug" TEXT;

-- Backfill: "Markham" -> "markham", "North York" -> "north-york"
UPDATE "hubs"
SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "hubs" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "hubs_slug_key" ON "hubs"("slug");
