import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  emailType: text("email_type").notNull(),
  recipient: text("recipient").notNull(),
  resendMessageId: text("resend_message_id"),
  errorReason: text("error_reason"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogsTable).omit({
  id: true,
  sentAt: true,
});

export type EmailLog = typeof emailLogsTable.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
