ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "reply_to_message_id" integer;
