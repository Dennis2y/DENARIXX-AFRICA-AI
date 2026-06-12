import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobs } from "./jobs";

export const savedJobs = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId, t.jobId),
}));

export type SavedJob = typeof savedJobs.$inferSelect;
