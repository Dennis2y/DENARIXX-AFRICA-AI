ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "deleted_for_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "deleted_for_everyone" boolean DEFAULT false NOT NULL;
