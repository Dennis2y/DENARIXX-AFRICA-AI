import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobs } from "./jobs";

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("applied"),
  coverLetter: text("cover_letter"),
  appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow().notNull(),
});

export type JobApplication = typeof jobApplications.$inferSelect;
