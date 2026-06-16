CREATE TABLE IF NOT EXISTS "user_blocks" (
  "id" serial PRIMARY KEY NOT NULL,
  "blocker_user_id" integer NOT NULL,
  "blocked_user_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_blocks_blocker_blocked_unique" UNIQUE("blocker_user_id","blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_blocks"
  ADD CONSTRAINT "user_blocks_blocker_user_id_users_id_fk"
  FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_blocks"
  ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fk"
  FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
