import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  interviewType: text("interview_type").notNull().default("mixed"),
  questions: jsonb("questions").notNull().default([]),
  answers: jsonb("answers").notNull().default([]),
  overallFeedback: text("overall_feedback"),
  score: integer("score"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InterviewSession = typeof interviewSessions.$inferSelect;
