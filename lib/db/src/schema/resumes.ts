import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("My CV"),
  resumeMarkdown: text("resume_markdown").notNull(),
  coverLetterMarkdown: text("cover_letter_markdown"),
  targetRole: text("target_role"),
  targetCompany: text("target_company"),
  tone: text("tone"),
  language: text("language").default("English"),
  formSnapshot: jsonb("form_snapshot"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
