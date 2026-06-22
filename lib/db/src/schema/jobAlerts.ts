import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const jobAlerts = pgTable("job_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  titleQuery: text("title_query").notNull(),
  locationQuery: text("location_query"),
  remoteType: text("remote_type"),
  frequency: text("frequency").notNull().default("daily"),
  isActive: boolean("is_active").notNull().default(true),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type JobAlert = typeof jobAlerts.$inferSelect;
