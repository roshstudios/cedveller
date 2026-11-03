import { pgTable, text, jsonb, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

export const schedulesTable = pgTable("schedules", {
  id: text("id").primaryKey(),
  ownerHash: text("owner_hash").notNull(),
  name: text("name").notNull(),
  group: text("group_name").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  anchorDate: date("anchor_date", { mode: "string" }).notNull(),
  anchorWeek: text("anchor_week").notNull().default("lower"),
  lessons: jsonb("lessons").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ updatedAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type StoredSchedule = typeof schedulesTable.$inferSelect;
