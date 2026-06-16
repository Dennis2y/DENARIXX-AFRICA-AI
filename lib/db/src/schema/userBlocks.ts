import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userBlocks = pgTable(
  "user_blocks",
  {
    id: serial("id").primaryKey(),
    blockerUserId: integer("blocker_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    blockedUserId: integer("blocked_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueBlock: unique("user_blocks_blocker_blocked_unique").on(table.blockerUserId, table.blockedUserId),
  }),
);

export type UserBlock = typeof userBlocks.$inferSelect;
