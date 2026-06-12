import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const skillListingsTable = pgTable("skill_listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  category: text("category").notNull().default("General"),
  listingType: text("listing_type").notNull().default("offering"), // 'offering' | 'seeking'
  description: text("description"),
  level: text("level").notNull().default("intermediate"), // beginner | intermediate | advanced | expert
  availability: text("availability"), // e.g. "Weekends", "Evenings", "Flexible"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSkillListingSchema = createInsertSchema(skillListingsTable).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSkillListingSchema = insertSkillListingSchema.partial().omit({ userId: true });

export type SkillListing = typeof skillListingsTable.$inferSelect;
export type InsertSkillListing = z.infer<typeof insertSkillListingSchema>;
