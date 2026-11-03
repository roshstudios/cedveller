-- New external PostgreSQL targets only. No startup migration is performed.
CREATE TABLE IF NOT EXISTS schedules (
  id text PRIMARY KEY,
  owner_hash text NOT NULL,
  name text NOT NULL,
  group_name text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  anchor_date date NOT NULL,
  anchor_week text NOT NULL DEFAULT 'lower',
  lessons jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedules_owner_idx ON schedules(owner_hash);
CREATE INDEX IF NOT EXISTS schedules_public_idx ON schedules(is_public, updated_at DESC);
