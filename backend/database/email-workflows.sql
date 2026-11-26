-- Apply after schema.sql and profile-settings.sql. Safe to run repeatedly.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS draft_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scam_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cybersecurity_newsletter BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS support_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  data JSONB NOT NULL,
  admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_type_check;
ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_type_check
  CHECK (type IN ('scam_alert', 'cybersecurity_newsletter', 'account_announcement'));
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS request_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS email_campaign_request ON email_campaigns(admin_id, request_key);

CREATE TABLE IF NOT EXISTS email_outbox (
  id BIGSERIAL PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  type VARCHAR(40) NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  admin_id BIGINT REFERENCES admin_users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'skipped', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL)::integer + (admin_id IS NOT NULL)::integer = 1)
);
CREATE INDEX IF NOT EXISTS email_outbox_due ON email_outbox(available_at, id) WHERE status = 'pending';
