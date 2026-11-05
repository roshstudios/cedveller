import { pgTable, text, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  ownerHash: text("owner_hash").notNull(),
  scheduleId: text("schedule_id").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  remindBefore: integer("remind_before").notNull().default(15),
  morningEnabled: boolean("morning_enabled").notNull().default(true),
  morningTime: text("morning_time").notNull().default("07:30"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushSentTable = pgTable("push_sent", {
  endpoint: text("endpoint").notNull(),
  key: text("key").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.endpoint, t.key] })]);

export const appSecretsTable = pgTable("app_secrets", {
  name: text("name").primaryKey(),
  value: text("value").notNull(),
});

export type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect;
