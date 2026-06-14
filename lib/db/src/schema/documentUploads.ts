import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const documentUploads = pgTable("document_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentUploadSchema = createInsertSchema(documentUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DocumentUpload = typeof documentUploads.$inferSelect;
export type InsertDocumentUpload = typeof documentUploads.$inferInsert;
