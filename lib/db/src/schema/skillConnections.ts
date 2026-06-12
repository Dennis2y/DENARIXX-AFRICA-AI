import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { skillListingsTable } from "./skillListings";

export const skillConnectionsTable = pgTable("skill_connections", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetId: integer("target_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  listingId: integer("listing_id").references(() => skillListingsTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSkillConnectionSchema = createInsertSchema(skillConnectionsTable).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type SkillConnection = typeof skillConnectionsTable.$inferSelect;
export type InsertSkillConnection = z.infer<typeof insertSkillConnectionSchema>;
