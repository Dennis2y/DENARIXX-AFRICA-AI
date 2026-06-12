import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userSkillsTable = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  skill: text("skill").notNull(),
  level: text("level").default("beginner").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSkillSchema = createInsertSchema(userSkillsTable).omit({
  id: true,
  createdAt: true,
});

export type UserSkill = typeof userSkillsTable.$inferSelect;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
