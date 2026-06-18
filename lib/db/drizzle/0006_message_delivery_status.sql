ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;

ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "read_at" timestamp with time zone;
