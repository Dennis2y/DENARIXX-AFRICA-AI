ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "message_type" text DEFAULT 'text' NOT NULL;

ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "reaction" text;
