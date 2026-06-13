import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobApplications } from "./jobApplications";

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => usersTable.id),
  toUserId: integer("to_user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  jobApplicationId: integer("job_application_id").references(() => jobApplications.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DirectMessage = typeof directMessages.$inferSelect;
