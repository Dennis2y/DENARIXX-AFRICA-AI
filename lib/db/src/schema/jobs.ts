import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array().notNull().default([]),
  salary: text("salary"),
  jobType: text("job_type").notNull().default("full-time"),
  level: text("level").notNull().default("mid"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
