import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobApplications } from "./jobApplications";

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => usersTable.id),
  toUserId: integer("to_user_id").notNull().references(() => usersTable.id),
  replyToMessageId: integer("reply_to_message_id"),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  metadata: jsonb("metadata").default({}).notNull(),
  reaction: text("reaction"),
  deletedForUserIds: jsonb("deleted_for_user_ids").default([]).notNull(),
  deletedForEveryone: boolean("deleted_for_everyone").notNull().default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  isRead: boolean("is_read").notNull().default(false),
  jobApplicationId: integer("job_application_id").references(() => jobApplications.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DirectMessage = typeof directMessages.$inferSelect;
