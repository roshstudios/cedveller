-- Bildiriş (Web Push) cədvəlləri. Neon SQL Editor-də bir dəfə işə sal.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint text PRIMARY KEY,
  owner_hash text NOT NULL,
  schedule_id text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  remind_before integer NOT NULL DEFAULT 15,
  morning_enabled boolean NOT NULL DEFAULT true,
  morning_time text NOT NULL DEFAULT '07:30',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_owner_idx ON push_subscriptions(owner_hash);
CREATE INDEX IF NOT EXISTS push_subscriptions_schedule_idx ON push_subscriptions(schedule_id);
CREATE TABLE IF NOT EXISTS push_sent (
  endpoint text NOT NULL,
  key text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (endpoint, key)
);
CREATE TABLE IF NOT EXISTS app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL
);
