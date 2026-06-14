import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { documentUploads } from "./documentUploads";

export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentUploads.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
  createdAt: true,
});

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;
