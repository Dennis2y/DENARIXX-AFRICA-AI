CREATE TABLE IF NOT EXISTS "job_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title_query" text NOT NULL,
  "location_query" text,
  "remote_type" text,
  "frequency" text NOT NULL DEFAULT 'daily',
  "is_active" boolean NOT NULL DEFAULT true,
  "last_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
