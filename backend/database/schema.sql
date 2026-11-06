
CREATE TABLE IF NOT EXISTS scan_history (
    id BIGSERIAL PRIMARY KEY,
    scan_type VARCHAR(30) NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(20) NOT NULL,
    indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_status VARCHAR(20) NOT NULL DEFAULT 'demo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_created_at
ON scan_history(created_at DESC);

SELECT
    id,
    scan_type,
    risk_score,
    risk_level,
    analysis_status,
    created_at
FROM scan_history
ORDER BY created_at DESC
LIMIT 10;

CREATE TABLE IF NOT EXISTS complaint_drafts (
    id BIGSERIAL PRIMARY KEY,
    scan_id BIGINT REFERENCES scan_history(id) ON DELETE SET NULL,
    incident_description TEXT NOT NULL,
    complaint_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin accounts
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin activity audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
ON admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin
ON admin_audit_logs(admin_id);

ALTER TABLE complaint_drafts
ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(150),
ADD COLUMN IF NOT EXISTS platform VARCHAR(150),
ADD COLUMN IF NOT EXISTS suspect_details TEXT;

ALTER TABLE complaint_drafts
ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Pending';

ALTER TABLE complaint_drafts
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE complaint_drafts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS complaint_status_history (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL
        REFERENCES complaint_drafts(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    admin_notes TEXT,
    admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_history_id
ON complaint_status_history(complaint_id, changed_at DESC);

-- Citizen accounts
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users (LOWER(email));

-- Link scans to citizen accounts
ALTER TABLE scan_history
ADD COLUMN IF NOT EXISTS user_id BIGINT
REFERENCES users(id) ON DELETE SET NULL;

-- Link complaint drafts to citizen accounts
ALTER TABLE complaint_drafts
ADD COLUMN IF NOT EXISTS user_id BIGINT
REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id
ON scan_history(user_id);

CREATE INDEX IF NOT EXISTS idx_complaint_drafts_user_id
ON complaint_drafts(user_id);