-- Run once in Vercel Postgres Query tab (or: psql $POSTGRES_URL_NON_POOLING -f scripts/init-db.sql)

CREATE TABLE IF NOT EXISTS rosters (
  slug TEXT PRIMARY KEY,
  adults JSONB NOT NULL DEFAULT '{}',
  kids JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rosters (slug, adults, kids)
VALUES (
  'default',
  '{"version":1,"fileName":null,"savedAt":null,"students":[]}'::jsonb,
  '{"version":1,"fileName":null,"savedAt":null,"students":[]}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  adults JSONB NOT NULL,
  kids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares (expires_at);

CREATE TABLE IF NOT EXISTS roster_overrides (
  contact_key TEXT NOT NULL,
  category TEXT NOT NULL,
  grading_belt TEXT,
  gi_size TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_key, category)
);

-- If roster_overrides already exists WITHOUT gi_size, run only:
--   ALTER TABLE roster_overrides ADD COLUMN IF NOT EXISTS gi_size TEXT;

CREATE INDEX IF NOT EXISTS roster_overrides_category_idx ON roster_overrides (category);
